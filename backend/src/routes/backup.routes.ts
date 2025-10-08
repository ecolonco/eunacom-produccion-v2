import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/backup/export-data - Export critical data for backup
router.get('/export-data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow admin users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden exportar datos'
      });
    }

    // Export critical data
    const [users, baseQuestions, variations, alternatives, jobs] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          credits: true,
          createdAt: true
        }
      }),
      prisma.baseQuestion.findMany({
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.questionVariation.findMany({
        select: {
          id: true,
          baseQuestionId: true,
          content: true,
          difficulty: true,
          variationNumber: true,
          explanation: true
        }
      }),
      prisma.alternative.findMany({
        select: {
          id: true,
          variationId: true,
          text: true,
          isCorrect: true,
          order: true
        }
      }),
      prisma.processingJob.findMany({
        select: {
          id: true,
          type: true,
          status: true,
          totalItems: true,
          processedItems: true,
          createdAt: true,
          completedAt: true
        }
      })
    ]);

    const backupData = {
      exportDate: new Date().toISOString(),
      version: 'v1.0-qa-sweep-complete',
      stats: {
        users: users.length,
        baseQuestions: baseQuestions.length,
        variations: variations.length,
        alternatives: alternatives.length,
        jobs: jobs.length
      },
      data: {
        users,
        baseQuestions,
        variations,
        alternatives,
        jobs
      }
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="eunacom-backup-${new Date().toISOString().split('T')[0]}.json"`);
    
    return res.json(backupData);

  } catch (error: any) {
    console.error('Error creating backup:', error);
    return res.status(500).json({
      success: false,
      message: `Error al crear respaldo: ${error.message}`
    });
  }
});

export default router;
