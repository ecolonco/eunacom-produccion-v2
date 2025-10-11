import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { QASweep2Service, QASweep2Config } from '../services/qa-sweep-2.service';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

const router = Router();
const qaSweep2Service = new QASweep2Service();

// Middleware de autenticación y autorización
router.use(authenticate as any);
router.use(authorize('ADMIN') as any);

// POST /api/admin/qa-sweep-2/runs - Crear nuevo run
router.post('/runs', async (req: Request, res: Response) => {
  try {
    const config: QASweep2Config = {
      name: req.body.name,
      description: req.body.description,
      batchSize: req.body.batchSize || 50,
      maxConcurrency: req.body.maxConcurrency || 3,
      specialty: req.body.specialty,
      topic: req.body.topic,
      modelEval: req.body.modelEval || 'gpt-4o-mini',
      modelFix: req.body.modelFix || 'gpt-4o'
    };

    const runId = await qaSweep2Service.createRun(config);

    res.json({
      success: true,
      data: { runId },
      message: 'QA Sweep 2.0 run created successfully'
    });
  } catch (error) {
    logger.error('Error creating QA Sweep 2.0 run:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el run de QA Sweep 2.0'
    });
  }
});

// GET /api/admin/qa-sweep-2/runs - Listar todos los runs
router.get('/runs', async (req: Request, res: Response) => {
  try {
    const runs = await qaSweep2Service.listRuns();

    res.json({
      success: true,
      data: runs
    });
  } catch (error) {
    logger.error('Error listing QA Sweep 2.0 runs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar los runs de QA Sweep 2.0'
    });
  }
});

// GET /api/admin/qa-sweep-2/runs/:id - Obtener run específico
router.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const run = await qaSweep2Service.getRunResults(id);

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Run no encontrado'
      });
    }

    res.json({
      success: true,
      data: run
    });
  } catch (error) {
    logger.error('Error getting QA Sweep 2.0 run:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el run de QA Sweep 2.0'
    });
  }
});

// POST /api/admin/qa-sweep-2/runs/:id/analyze - Iniciar análisis
router.post('/runs/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variationIds } = req.body;

    // Iniciar análisis de forma asíncrona
    qaSweep2Service.startAnalysis(id, variationIds).catch(error => {
      logger.error('Async analysis failed:', error);
    });

    res.json({
      success: true,
      message: 'Análisis iniciado. Los resultados estarán disponibles en unos minutos.'
    });
  } catch (error) {
    logger.error('Error starting QA Sweep 2.0 analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar el análisis de QA Sweep 2.0'
    });
  }
});

// GET /api/admin/qa-sweep-2/runs/:id/results - Obtener resultados de un run
router.get('/runs/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, status, hasCorrections } = req.query;

    const run = await qaSweep2Service.getRunResults(id);

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Run no encontrado'
      });
    }

    let results = run.results;

    // Filtrar por estado si se especifica
    if (status) {
      results = results.filter((result: any) => result.status === status);
    }

    // Filtrar por correcciones si se especifica
    if (hasCorrections === 'true') {
      results = results.filter((result: any) => result.corrections);
    }

    // Paginación
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const paginatedResults = results.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: {
        run: {
          id: run.id,
          name: run.name,
          description: run.description,
          status: run.status,
          createdAt: run.createdAt,
          updatedAt: run.updatedAt
        },
        results: paginatedResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: results.length,
          totalPages: Math.ceil(results.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting QA Sweep 2.0 results:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los resultados de QA Sweep 2.0'
    });
  }
});

// POST /api/admin/qa-sweep-2/results/:id/apply - Aplicar correcciones
router.post('/results/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await qaSweep2Service.applyCorrections(id);

    res.json({
      success: true,
      message: 'Correcciones aplicadas exitosamente'
    });
  } catch (error) {
    logger.error('Error applying corrections:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aplicar las correcciones'
    });
  }
});

// POST /api/admin/qa-sweep-2/results/batch-apply - Aplicar correcciones en lote
router.post('/results/batch-apply', async (req: Request, res: Response) => {
  try {
    const { resultIds } = req.body;

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de resultados'
      });
    }

    const results = await Promise.allSettled(
      resultIds.map(id => qaSweep2Service.applyCorrections(id))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        successful,
        failed,
        total: resultIds.length
      },
      message: `Aplicadas ${successful} correcciones exitosamente, ${failed} fallaron`
    });
  } catch (error) {
    logger.error('Error applying batch corrections:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aplicar las correcciones en lote'
    });
  }
});

// GET /api/admin/qa-sweep-2/stats - Estadísticas generales
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const runs = await qaSweep2Service.listRuns();
    
    const stats = {
      totalRuns: runs.length,
      completedRuns: runs.filter(r => r.status === 'COMPLETED').length,
      runningRuns: runs.filter(r => r.status === 'RUNNING').length,
      failedRuns: runs.filter(r => r.status === 'FAILED').length,
      totalVariations: runs.reduce((sum, r) => sum + (r._count?.results || 0), 0)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting QA Sweep 2.0 stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas de QA Sweep 2.0'
    });
  }
});

// GET /api/admin/qa-sweep-2/metadata - Get available specialties and topics
router.get('/metadata', async (req: Request, res: Response) => {
  try {
    const specialties = await prisma.aIAnalysis.findMany({
      select: { specialty: true },
      distinct: ['specialty'],
      where: {
        specialty: {
          not: null
        }
      },
      orderBy: { specialty: 'asc' }
    });

    const topics = await prisma.aIAnalysis.findMany({
      select: { topic: true },
      distinct: ['topic'],
      where: {
        topic: {
          not: null
        }
      },
      orderBy: { topic: 'asc' }
    });

    res.json({
      success: true,
      data: {
        specialties: specialties.map(s => s.specialty).filter(Boolean),
        topics: topics.map(t => t.topic).filter(Boolean)
      }
    });
  } catch (error) {
    logger.error('Error fetching QA Sweep 2.0 metadata:', error);
    res.status(500).json({ success: false, message: 'Error fetching metadata' });
  }
});

// POST /api/admin/qa-sweep-2/diagnose-individual - Diagnóstico individual de un ejercicio
router.post('/diagnose-individual', async (req: Request, res: Response) => {
  try {
    const { variationId } = req.body;
    
    if (!variationId) {
      return res.status(400).json({
        success: false,
        message: 'ID de variación es requerido'
      });
    }

    // Obtener la variación
    const variation = await prisma.questionVariation.findUnique({
      where: { id: variationId },
      include: {
        alternatives: { orderBy: { order: 'asc' } },
        baseQuestion: { include: { aiAnalysis: true } }
      }
    });

    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Variación no encontrada'
      });
    }

    // Convertir a formato de ejercicio
    const qaSweep2Service = new QASweep2Service();
    const exerciseData = (qaSweep2Service as any).variationToExerciseData(variation);

    // Procesar con OpenAI
    const openAIService = new (await import('../services/openai.service')).OpenAIService();
    const result = await openAIService.processExercise(exerciseData);

    // Calcular confidence score
    const confidenceScore = (qaSweep2Service as any).calculateConfidenceScore(result.evaluation);

    res.json({
      success: true,
      data: {
        variationId: variation.id,
        exercise: exerciseData,
        diagnosis: result.evaluation,
        correction: result.correction,
        result: result.result,
        confidenceScore,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs
      }
    });
  } catch (error) {
    logger.error('Error in individual diagnosis:', error);
    res.status(500).json({
      success: false,
      message: 'Error al diagnosticar ejercicio individual',
      error: error.message
    });
  }
});

export default router;
