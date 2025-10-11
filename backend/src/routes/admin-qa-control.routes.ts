import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/qa-control/variations - List variations with QA Sweep labels (paginated)
router.get('/variations', async (req, res) => {
  try {
    const { 
      label, 
      page = '1', 
      limit = '100',
      specialty,
      topic 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause for QA Results
    const qaWhere: any = {
      labels: {
        not: []
      }
    };

    // Filter by specific label if provided
    if (label) {
      qaWhere.labels = {
        has: label as string
      };
    }

    // Get QA Results with pagination
    const qaResults = await prisma.qAResult.findMany({
      where: qaWhere,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offset,
      select: {
        id: true,
        variationId: true,
        baseId: true,
        labels: true,
        riskLevel: true,
        humanReviewNotes: true,
        createdAt: true,
        runId: true
      }
    });

    // Get the variations for these QA results
    const variationIds = qaResults.map(r => r.variationId);
    
    const variations = await prisma.questionVariation.findMany({
      where: { id: { in: variationIds } },
      include: {
        alternatives: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            isCorrect: true,
            explanation: true
          }
        },
        baseQuestion: {
          include: {
            aiAnalysis: {
              select: {
                specialty: true,
                topic: true
              }
            }
          }
        }
      }
    });

    // Filter by specialty and topic if specified
    let filteredVariations = variations;
    
    if (specialty || topic) {
      filteredVariations = variations.filter(variation => {
        const aiAnalysis = variation.baseQuestion?.aiAnalysis;
        if (!aiAnalysis) return false;
        
        if (specialty && aiAnalysis.specialty !== specialty) return false;
        if (topic && aiAnalysis.topic !== topic) return false;
        
        return true;
      });
    }

    // Transform to the expected format
    const result = filteredVariations.map(variation => {
      const qaResult = qaResults.find(r => r.variationId === variation.id);
      return {
        id: variation.id,
        baseId: variation.baseQuestion.id,
        variationNumber: variation.variationNumber,
        specialty: variation.baseQuestion.aiAnalysis?.specialty || 'Unknown',
        topic: variation.baseQuestion.aiAnalysis?.topic || 'Unknown',
        labels: qaResult ? (qaResult.labels as string[]) : [],
        riskLevel: qaResult?.riskLevel || 'UNKNOWN',
        content: variation.content,
        alternatives: variation.alternatives,
        explanation: variation.explanation,
        createdAt: variation.baseQuestion.createdAt,
        qaRunId: qaResult?.runId,
        notes: qaResult?.humanReviewNotes ? [qaResult.humanReviewNotes] : []
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.qAResult.count({
      where: qaWhere
    });

    res.json({
      success: true,
      data: {
        variations: result,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching QA variations:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/admin/qa-control/labels - Get all available labels
router.get('/labels', async (req, res) => {
  try {
    // Get all unique labels from QA Results
    const qaResults = await prisma.qAResult.findMany({
      where: {
        labels: {
          not: []
        }
      },
      select: {
        labels: true
      }
    });

    // Count occurrences of each label
    const labelCounts: Record<string, number> = {};
    qaResults.forEach(result => {
      (result.labels as string[]).forEach(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
    });

    // Sort labels by count (most frequent first)
    const sortedLabels = Object.entries(labelCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));

    res.json({
      success: true,
      data: {
        labels: sortedLabels,
        totalLabels: sortedLabels.length,
        totalVariationsWithLabels: qaResults.length
      }
    });

  } catch (error) {
    logger.error('Error getting QA labels:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/admin/qa-control/variations - Delete multiple variations
router.delete('/variations', async (req, res) => {
  try {
    const { variationIds } = req.body;

    if (!Array.isArray(variationIds) || variationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de variaciones'
      });
    }

    logger.info(`Deleting ${variationIds.length} variations`, { variationIds });

    let deletedCount = 0;
    const errors = [];

    for (const variationId of variationIds) {
      try {
        // Delete alternatives first
        const deletedAlternatives = await prisma.alternative.deleteMany({
          where: { variationId }
        });

        // Delete variation
        await prisma.questionVariation.delete({
          where: { id: variationId }
        });

        // Also delete QA results for this variation
        await prisma.qAResult.deleteMany({
          where: { variationId }
        });

        deletedCount++;
        logger.info(`Deleted variation ${variationId} with ${deletedAlternatives.count} alternatives`);

      } catch (error: any) {
        logger.error(`Error deleting variation ${variationId}:`, error);
        errors.push({
          variationId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Eliminadas ${deletedCount} variaciones exitosamente`,
      data: {
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    logger.error('Error deleting variations:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
