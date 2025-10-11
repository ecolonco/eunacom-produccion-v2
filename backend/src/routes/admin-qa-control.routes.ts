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
    const qaWhere: any = {};

    // Filter by specific label if provided
    if (label) {
      qaWhere.labels = {
        not: null
      };
    } else {
      // If no label filter, show all QA results (including empty labels)
      qaWhere.labels = {
        not: null
      };
    }

    // Get all variations with pagination
    let variationsQuery: any = {
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
      },
      orderBy: { baseQuestion: { createdAt: 'desc' } },
      take: limitNum,
      skip: offset
    };

    // If filtering by specialty or topic, add those filters
    if (specialty || topic) {
      variationsQuery.where = {
        baseQuestion: {
          aiAnalysis: {}
        }
      };
      
      if (specialty) {
        variationsQuery.where.baseQuestion.aiAnalysis.specialty = specialty;
      }
      if (topic) {
        variationsQuery.where.baseQuestion.aiAnalysis.topic = topic;
      }
    }

    const variations = await prisma.questionVariation.findMany(variationsQuery);

    // Get QA Results for these variations
    const variationIds = variations.map(v => v.id);
    const qaResults = await prisma.qAResult.findMany({
      where: {
        variationId: { in: variationIds }
      },
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

    // Apply label filter if specified
    let filteredVariations = variations;
    
    if (label) {
      filteredVariations = variations.filter(variation => {
        const qaResult = qaResults.find(r => r.variationId === variation.id);
        if (!qaResult || !qaResult.labels) return false;
        
        const labels = qaResult.labels as string[];
        return labels.includes(label as string);
      });
    }

    // Transform to the expected format
    const result = filteredVariations.map(variation => {
      const qaResult = qaResults.find(r => r.variationId === variation.id);
      return {
        id: variation.id,
        baseId: (variation as any).baseQuestion?.id || variation.baseQuestionId,
        variationNumber: variation.variationNumber,
        specialty: (variation as any).baseQuestion?.aiAnalysis?.specialty || 'Unknown',
        topic: (variation as any).baseQuestion?.aiAnalysis?.topic || 'Unknown',
        labels: qaResult ? (qaResult.labels as string[]) : [],
        riskLevel: qaResult?.riskLevel || 'UNKNOWN',
        content: variation.content,
        alternatives: (variation as any).alternatives || [],
        explanation: variation.explanation,
        createdAt: (variation as any).baseQuestion?.createdAt || new Date(),
        qaRunId: qaResult?.runId,
        notes: qaResult?.humanReviewNotes ? [qaResult.humanReviewNotes] : []
      };
    });

    // Get total count for pagination
    let totalCountQuery: any = {};
    
    if (specialty || topic) {
      totalCountQuery = {
        baseQuestion: {
          aiAnalysis: {}
        }
      };
      
      if (specialty) {
        totalCountQuery.baseQuestion.aiAnalysis.specialty = specialty;
      }
      if (topic) {
        totalCountQuery.baseQuestion.aiAnalysis.topic = topic;
      }
    }

    const totalVariations = await prisma.questionVariation.count({
      where: totalCountQuery
    });

    // If filtering by label, we need to count how many have that label
    let totalCount = totalVariations;
    if (label) {
      const allVariationsForLabel = await prisma.questionVariation.findMany({
        where: totalCountQuery,
        select: { id: true }
      });
      
      const allVariationIds = allVariationsForLabel.map(v => v.id);
      const qaResultsForCount = await prisma.qAResult.findMany({
        where: {
          variationId: { in: allVariationIds }
        }
      });
      
      // Filter by label in JavaScript since Prisma doesn't support has for JSON arrays consistently
      const filteredQaResults = qaResultsForCount.filter(qa => {
        if (!qa.labels) return false;
        const labels = qa.labels as string[];
        return labels.includes(label as string);
      });
      totalCount = filteredQaResults.length;
    }

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
