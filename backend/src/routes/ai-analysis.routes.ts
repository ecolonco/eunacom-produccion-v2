import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiAnalysisService } from '../services/ai-analysis.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/ai-analysis/individual/:mockExamId
 * Genera análisis individual de un ensayo completado
 */
router.post('/individual/:mockExamId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { mockExamId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    logger.info('Generating individual analysis', { userId, mockExamId });

    // Verificar que el ensayo pertenece al usuario
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const mockExam = await prisma.mockExam.findUnique({
      where: { id: mockExamId }
    });

    if (!mockExam || mockExam.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para analizar este ensayo' });
    }

    if (mockExam.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'El ensayo debe estar completado para generar el análisis' });
    }

    // Verificar si ya existe análisis
    const existingAnalysis = await aiAnalysisService.getIndividualAnalysis(mockExamId);
    if (existingAnalysis) {
      return res.status(200).json({
        message: 'Análisis ya existente',
        analysis: {
          strengths: existingAnalysis.strengths,
          mediumPerformance: existingAnalysis.mediumPerformance,
          weaknesses: existingAnalysis.weaknesses,
          summary: existingAnalysis.individualSummary,
          createdAt: existingAnalysis.createdAt
        }
      });
    }

    // Generar nuevo análisis
    const analysis = await aiAnalysisService.generateIndividualAnalysis(userId, mockExamId);

    res.status(201).json({
      message: 'Análisis generado exitosamente',
      analysis
    });
  } catch (error: any) {
    logger.error('Error generating individual analysis:', error);
    res.status(500).json({
      error: 'Error al generar análisis individual',
      details: error.message
    });
  }
});

/**
 * GET /api/ai-analysis/individual/:mockExamId
 * Obtiene el análisis individual de un ensayo (si existe)
 */
router.get('/individual/:mockExamId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { mockExamId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar que el ensayo pertenece al usuario
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const mockExam = await prisma.mockExam.findUnique({
      where: { id: mockExamId }
    });

    if (!mockExam || mockExam.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este análisis' });
    }

    const analysis = await aiAnalysisService.getIndividualAnalysis(mockExamId);

    if (!analysis) {
      return res.status(404).json({ error: 'Análisis no encontrado' });
    }

    res.status(200).json({
      analysis: {
        strengths: analysis.strengths,
        mediumPerformance: analysis.mediumPerformance,
        weaknesses: analysis.weaknesses,
        summary: analysis.individualSummary,
        createdAt: analysis.createdAt
      }
    });
  } catch (error: any) {
    logger.error('Error fetching individual analysis:', error);
    res.status(500).json({
      error: 'Error al obtener análisis individual',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-analysis/evolutionary
 * Genera análisis evolutivo de todos los ensayos del usuario
 */
router.post('/evolutionary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    logger.info('Generating evolutionary analysis', { userId });

    const analysis = await aiAnalysisService.generateEvolutionaryAnalysis(userId);

    res.status(201).json({
      message: analysis.tokensUsed === 0 ? 'Análisis desde caché' : 'Análisis generado exitosamente',
      analysis
    });
  } catch (error: any) {
    logger.error('Error generating evolutionary analysis:', error);
    res.status(500).json({
      error: 'Error al generar análisis evolutivo',
      details: error.message
    });
  }
});

/**
 * GET /api/ai-analysis/evolutionary
 * Obtiene el análisis evolutivo más reciente del usuario
 */
router.get('/evolutionary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const analysis = await aiAnalysisService.getLatestEvolutionaryAnalysis(userId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Análisis no encontrado',
        message: 'Aún no has completado ensayos suficientes para generar un análisis evolutivo'
      });
    }

    res.status(200).json({
      analysis: {
        summary: analysis.evolutionarySummary,
        examsAnalyzed: analysis.examsAnalyzed,
        lastExamAnalyzed: analysis.lastExamAnalyzed,
        createdAt: analysis.createdAt
      }
    });
  } catch (error: any) {
    logger.error('Error fetching evolutionary analysis:', error);
    res.status(500).json({
      error: 'Error al obtener análisis evolutivo',
      details: error.message
    });
  }
});

export { router as aiAnalysisRoutes };
