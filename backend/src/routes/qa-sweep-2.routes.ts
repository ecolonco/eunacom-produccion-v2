import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { QASweep2Service, QASweep2Config } from '../services/qa-sweep-2.service';
import { qaSweep2ReportService } from '../services/qa-sweep-2-report.service';
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
      modelFix: req.body.modelFix || 'gpt-4o',
      // Nuevo: rango de ejercicios base
      baseQuestionFrom: req.body.baseQuestionFrom ? parseInt(req.body.baseQuestionFrom) : undefined,
      baseQuestionTo: req.body.baseQuestionTo ? parseInt(req.body.baseQuestionTo) : undefined,
      // Nuevo: filtro de confidence score
      skipTaxonomyClassification: req.body.skipTaxonomyClassification ?? true,
      // FIX: Tratar 0 como valor válido
      maxConfidenceScore: (req.body.maxConfidenceScore !== undefined && req.body.maxConfidenceScore !== '' && req.body.maxConfidenceScore !== null)
        ? parseFloat(req.body.maxConfidenceScore)
        : undefined,
      // Nuevo: filtro para SOLO variaciones sin score
      onlyWithoutScore: req.body.onlyWithoutScore ?? false
    };

    // Validación del rango
    if (config.baseQuestionFrom !== undefined && config.baseQuestionTo !== undefined) {
      if (config.baseQuestionFrom > config.baseQuestionTo) {
        return res.status(400).json({
          success: false,
          message: 'El ejercicio "Desde" debe ser menor o igual que "Hasta"'
        });
      }
      const rangeSize = config.baseQuestionTo - config.baseQuestionFrom + 1;
      logger.info(`Creating run with base question range: ${config.baseQuestionFrom}-${config.baseQuestionTo} (${rangeSize} exercises, ~${rangeSize * 4} variations)`);
    }

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

    // Verificar que el run existe y está en estado PENDING
    const run = await prisma.qASweep2Run.findUnique({
      where: { id }
    });

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Run no encontrado'
      });
    }

    if (run.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `El run ya está en estado ${run.status}`
      });
    }

    // El worker detectará este run PENDING y lo procesará automáticamente
    // No llamamos a startAnalysis aquí para evitar duplicación
    res.json({
      success: true,
      message: 'El worker procesará este run en los próximos segundos.'
    });
  } catch (error) {
    logger.error('Error verifying QA Sweep 2.0 run:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar el run de QA Sweep 2.0'
    });
  }
});

// POST /api/admin/qa-sweep-2/runs/:id/cancel - Cancelar run en ejecución
router.post('/runs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const run = await prisma.qASweep2Run.findUnique({
      where: { id }
    });

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Run no encontrado'
      });
    }

    if (run.status !== 'RUNNING' && run.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar un run en estado ${run.status}`
      });
    }

    // Actualizar estado a FAILED con mensaje de cancelación
    await prisma.qASweep2Run.update({
      where: { id },
      data: {
        status: 'FAILED',
        updatedAt: new Date()
      }
    });

    logger.info(`Run ${id} cancelled by user`);

    res.json({
      success: true,
      message: 'Run cancelado exitosamente'
    });
  } catch (error) {
    logger.error('Error cancelling QA Sweep 2.0 run:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar el run'
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
      orderBy: { specialty: 'asc' }
    });

    const topics = await prisma.aIAnalysis.findMany({
      select: { topic: true },
      distinct: ['topic'],
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

// POST /api/admin/qa-sweep-2/preview - Preview de variaciones que se procesarán
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const {
      specialty,
      topic,
      baseQuestionFrom,
      baseQuestionTo,
      maxConfidenceScore,
      onlyWithoutScore
    } = req.body;

    let whereConditions: any = {
      isVisible: true
    };

    // Filtro por rango de ejercicios base
    if (baseQuestionFrom !== undefined || baseQuestionTo !== undefined) {
      const baseQuestions = await prisma.baseQuestion.findMany({
        where: {
          displaySequence: {
            ...(baseQuestionFrom && { gte: parseInt(baseQuestionFrom) }),
            ...(baseQuestionTo && { lte: parseInt(baseQuestionTo) })
          }
        },
        select: { id: true }
      });

      const baseQuestionIds = baseQuestions.map(bq => bq.id);
      if (baseQuestionIds.length === 0) {
        return res.json({
          success: true,
          data: {
            totalActive: 0,
            matchingFilters: 0,
            baseQuestionsInRange: 0,
            estimatedVariations: 0,
            filters: { specialty, topic, baseQuestionFrom, baseQuestionTo, maxConfidenceScore }
          }
        });
      }
      whereConditions.baseQuestionId = { in: baseQuestionIds };
    }

    // Filtro por especialidad/tema
    if (specialty || topic) {
      const aiAnalysisConditions: any = {};
      if (specialty) aiAnalysisConditions.specialty = specialty;
      if (topic) aiAnalysisConditions.topic = topic;

      whereConditions.baseQuestion = {
        ...(whereConditions.baseQuestionId && { id: whereConditions.baseQuestionId }),
        aiAnalysis: aiAnalysisConditions
      };

      if (whereConditions.baseQuestionId) {
        delete whereConditions.baseQuestionId;
      }
    }

    // Filtro por confidence score máximo
    // Excluye automáticamente las variaciones "Perfecta (0%)" para no reprocesarlas
    if (maxConfidenceScore !== undefined && maxConfidenceScore !== null && maxConfidenceScore !== '') {
      const scoreThreshold = parseFloat(maxConfidenceScore) > 1
        ? parseFloat(maxConfidenceScore) / 100
        : parseFloat(maxConfidenceScore);
      whereConditions.confidenceScore = {
        gt: 0,  // Excluir las perfectas (0% = sin errores, no necesitan reprocesamiento)
        lte: scoreThreshold
      };
    }

    // Filtro para SOLO variaciones sin score (nunca analizadas)
    if (onlyWithoutScore === true) {
      whereConditions.confidenceScore = null;
    }

    // Contar total de variaciones activas
    const totalActive = await prisma.questionVariation.count({
      where: { isVisible: true }
    });

    // Contar variaciones que matchean los filtros
    const matchingFilters = await prisma.questionVariation.count({
      where: whereConditions
    });

    // Si hay rango de ejercicios, calcular cuántos ejercicios base hay
    let baseQuestionsInRange = 0;
    if (baseQuestionFrom !== undefined || baseQuestionTo !== undefined) {
      baseQuestionsInRange = await prisma.baseQuestion.count({
        where: {
          displaySequence: {
            ...(baseQuestionFrom && { gte: parseInt(baseQuestionFrom) }),
            ...(baseQuestionTo && { lte: parseInt(baseQuestionTo) })
          }
        }
      });
    }

    // Estimaciones de costo y tiempo
    const avgTokensPerVariation = 2000; // Estimado: 1500 input + 500 output
    const costPer1MTokens = 0.15; // GPT-4o-mini aprox
    const estimatedTokens = matchingFilters * avgTokensPerVariation;
    const estimatedCost = (estimatedTokens / 1000000) * costPer1MTokens;
    const avgSecondsPerVariation = 5; // Depende de concurrencia
    const concurrency = req.body.maxConcurrency || 3;
    const estimatedMinutes = Math.ceil((matchingFilters * avgSecondsPerVariation) / (concurrency * 60));

    res.json({
      success: true,
      data: {
        totalActive,
        matchingFilters,
        baseQuestionsInRange,
        estimatedVariations: matchingFilters,
        estimations: {
          tokens: estimatedTokens,
          costUSD: parseFloat(estimatedCost.toFixed(2)),
          minutes: estimatedMinutes,
          concurrency
        },
        filters: {
          specialty: specialty || null,
          topic: topic || null,
          baseQuestionFrom: baseQuestionFrom ? parseInt(baseQuestionFrom) : null,
          baseQuestionTo: baseQuestionTo ? parseInt(baseQuestionTo) : null,
          maxConfidenceScore: maxConfidenceScore ? parseFloat(maxConfidenceScore) : null,
          onlyWithoutScore: onlyWithoutScore || false
        }
      }
    });
  } catch (error) {
    logger.error('Error getting preview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener preview de variaciones'
    });
  }
});

// POST /api/admin/qa-sweep-2/diagnose-individual - Diagnóstico individual de un ejercicio
router.post('/diagnose-individual', async (req: Request, res: Response) => {
  try {
    const { variationId, autoApply } = req.body;
    
    if (!variationId) {
      return res.status(400).json({
        success: false,
        message: 'ID de variación es requerido'
      });
    }

    // Buscar por displayCode (formato: 505.1) o por ID interno
    const variation = await prisma.questionVariation.findFirst({
      where: {
        OR: [
          { displayCode: variationId },
          { id: variationId }
        ]
      },
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

    let newVariationId: string | undefined = undefined;
    const originalTaxonomy = {
      specialty: variation.baseQuestion?.aiAnalysis?.specialty || 'Unknown',
      topic: variation.baseQuestion?.aiAnalysis?.topic || 'Unknown'
    };
    let appliedTaxonomy: { specialty: string; topic: string } | undefined;
    if (autoApply && result.correction) {
      const svc = new QASweep2Service();
      // Attach classification suggestions if evaluation proposes changes
      const correctionWithTaxonomy = {
        ...result.correction,
        specialty: result.evaluation?.specialty_sugerida || undefined,
        topic: result.evaluation?.tema_sugerido || undefined
      };
      const applied = await svc.applyCorrectionsAsNewVersion(variation.id, correctionWithTaxonomy);
      newVariationId = applied.newVariationId;

      // Fetch applied taxonomy from base question after update
      const refreshed = await prisma.baseQuestion.findUnique({
        where: { id: variation.baseQuestionId },
        include: { aiAnalysis: true }
      });
      if (refreshed?.aiAnalysis) {
        appliedTaxonomy = {
          specialty: refreshed.aiAnalysis.specialty,
          topic: refreshed.aiAnalysis.topic
        };
      }
    }

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
        newVariationId,
        originalTaxonomy,
        appliedTaxonomy,
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

// GET /api/admin/qa-sweep-2/variations/:id - Get variation by internal ID or displayCode
router.get('/variations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const variation = await prisma.questionVariation.findFirst({
      where: {
        OR: [
          { id },
          { displayCode: id }
        ]
      },
      include: {
        alternatives: { orderBy: { order: 'asc' } },
        baseQuestion: { include: { aiAnalysis: true } }
      }
    });

    if (!variation) {
      return res.status(404).json({ success: false, message: 'Variation not found' });
    }

    return res.json({ success: true, data: variation });
  } catch (error) {
    logger.error('Error getting variation:', error);
    res.status(500).json({ success: false, message: 'Error getting variation' });
  }
});

// GET /api/admin/qa-sweep-2/taxonomy/catalog - Get specialties with their topics
router.get('/taxonomy/catalog', async (req: Request, res: Response) => {
  try {
    const specialties = await prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    const topics = await prisma.topic.findMany({
      orderBy: [{ specialtyId: 'asc' }, { name: 'asc' }]
    });

    const topicBySpecialty = new Map<string | null, any[]>();
    for (const t of topics) {
      const key = t.specialtyId || null;
      if (!topicBySpecialty.has(key)) topicBySpecialty.set(key, []);
      topicBySpecialty.get(key)!.push({ id: t.id, name: t.name });
    }

    const data = specialties.map(s => ({
      id: s.id,
      name: s.name,
      code: (s as any).code ?? null,
      topics: topicBySpecialty.get(s.id) || []
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching taxonomy catalog:', error);
    res.status(500).json({ success: false, message: 'Error fetching taxonomy catalog' });
  }
});

// GET /api/admin/qa-sweep-2/worker/health - Simple health for worker readiness
router.get('/worker/health', async (_req: Request, res: Response) => {
  try {
    const pending = await prisma.qASweep2Run.count({ where: { status: 'PENDING' } });
    const running = await prisma.qASweep2Run.count({ where: { status: 'RUNNING' } });
    res.json({ success: true, data: { pending, running } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Worker health error' });
  }
});

// POST /api/admin/qa-sweep-2/runs/:id/generate-report - Generar reporte IA
router.post('/runs/:id/generate-report', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { regenerate = false } = req.body;

    logger.info(`Generating AI report for run ${id}, regenerate=${regenerate}`);

    const report = await qaSweep2ReportService.generateReport(id, regenerate);

    res.json({
      success: true,
      data: report,
      message: 'Reporte generado exitosamente'
    });
  } catch (error) {
    logger.error('Error generating AI report:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error al generar el reporte'
    });
  }
});

// GET /api/admin/qa-sweep-2/database-report - Reporte completo de estado de la base de datos
router.get('/database-report', async (req: Request, res: Response) => {
  try {
    logger.info('Generating complete database stats report');

    // 1. Total de variaciones activas
    const totalActive = await prisma.questionVariation.count({
      where: { isVisible: true }
    });

    // 2. Distribución por confidence score
    const distribution = await prisma.$queryRaw<Array<{
      categoria: string;
      cantidad: number;
      porcentaje: number;
    }>>`
      SELECT
        CASE
          WHEN confidence_score IS NULL THEN 'Sin score (nunca analizadas)'
          WHEN confidence_score = 0 THEN 'Perfecta (0% - sin errores)'
          WHEN confidence_score < 0.34 THEN 'Baja (1-33% - severidad alta)'
          WHEN confidence_score < 0.67 THEN 'Media (34-66% - severidad moderada)'
          ELSE 'Alta (67-100% - severidad leve o corregidas)'
        END as categoria,
        COUNT(*)::int as cantidad,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentaje
      FROM question_variations
      WHERE is_visible = true
      GROUP BY
        CASE
          WHEN confidence_score IS NULL THEN 'Sin score (nunca analizadas)'
          WHEN confidence_score = 0 THEN 'Perfecta (0% - sin errores)'
          WHEN confidence_score < 0.34 THEN 'Baja (1-33% - severidad alta)'
          WHEN confidence_score < 0.67 THEN 'Media (34-66% - severidad moderada)'
          ELSE 'Alta (67-100% - severidad leve o corregidas)'
        END
      ORDER BY cantidad DESC
    `;

    // 3. Estadísticas de QA Sweep 2.0
    const qaStats = await prisma.$queryRaw<Array<{
      total_analisis: number;
      variaciones_unicas_analizadas: number;
      correcciones_aplicadas: number;
      confidence_promedio: number;
      total_tokens_in: bigint;
      total_tokens_out: bigint;
    }>>`
      SELECT
        COUNT(DISTINCT r.id)::int as total_analisis,
        COUNT(DISTINCT r."variationId")::int as variaciones_unicas_analizadas,
        COUNT(DISTINCT CASE WHEN r.status = 'APPLIED' THEN r.id END)::int as correcciones_aplicadas,
        ROUND(AVG(r.confidence_score)::numeric, 4) as confidence_promedio,
        SUM(r.tokens_in)::bigint as total_tokens_in,
        SUM(r.tokens_out)::bigint as total_tokens_out
      FROM qa_sweep_2_results r
    `;

    const stats = qaStats[0];
    const totalTokensIn = Number(stats.total_tokens_in || 0);
    const totalTokensOut = Number(stats.total_tokens_out || 0);

    // 4. Runs por estado
    const runsByStatus = await prisma.qASweep2Run.groupBy({
      by: ['status'],
      _count: true
    });

    // 5. Últimos 5 runs
    const recentRuns = await prisma.qASweep2Run.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { results: true }
        }
      }
    });

    // 6. Resumen de calidad
    const needsReview = await prisma.questionVariation.count({
      where: {
        isVisible: true,
        OR: [
          { confidenceScore: null },
          { confidenceScore: { lt: 0.34 } }
        ]
      }
    });

    const goodQuality = await prisma.questionVariation.count({
      where: {
        isVisible: true,
        confidenceScore: { gte: 0.67 }
      }
    });

    const coveragePercentage = ((totalActive - needsReview) / totalActive * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        totalActive,
        distribution,
        qaStats: {
          totalAnalisis: stats.total_analisis || 0,
          variacionesUnicasAnalizadas: stats.variaciones_unicas_analizadas || 0,
          correccionesAplicadas: stats.correcciones_aplicadas || 0,
          confidencePromedio: Number(stats.confidence_promedio || 0),
          totalTokensIn,
          totalTokensOut,
          totalTokens: totalTokensIn + totalTokensOut
        },
        runsByStatus: runsByStatus.map(r => ({
          status: r.status,
          count: r._count
        })),
        recentRuns: recentRuns.map(r => ({
          id: r.id,
          name: r.name,
          status: r.status,
          resultsCount: r._count.results,
          createdAt: r.createdAt
        })),
        qualitySummary: {
          needsReview,
          goodQuality,
          coveragePercentage: parseFloat(coveragePercentage)
        }
      }
    });
  } catch (error) {
    logger.error('Error generating database report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar el reporte de base de datos'
    });
  }
});

// Export named and default to be compatible with different import styles
export const qaSweep2Routes = router;
export default router;
