import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Apply auth middleware
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/exercise-management/list - Get exercises with management info
router.get('/list', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      page = 1,
      limit = 20,
      specialty,
      topic,
      qaReviews,
      status,
      searchTerm
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where clause for filters
    let whereClause = `WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')`;
    const params: any[] = [];
    let paramIndex = 1;

    if (specialty) {
      whereClause += ` AND ai.specialty = $${paramIndex}`;
      params.push(specialty);
      paramIndex++;
    }

    if (topic) {
      whereClause += ` AND ai.topic = $${paramIndex}`;
      params.push(topic);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND bq.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (qaReviews) {
      if (qaReviews === '0') {
        whereClause += ` AND (
          SELECT COUNT(*) FROM "qa_reviews" q
          WHERE q.base_question_id = bq.id
        ) = 0`;
      } else if (qaReviews === '1-2') {
        whereClause += ` AND (
          SELECT COUNT(*) FROM "qa_reviews" q
          WHERE q.base_question_id = bq.id
        ) BETWEEN 1 AND 2`;
      } else if (qaReviews === '3-5') {
        whereClause += ` AND (
          SELECT COUNT(*) FROM "qa_reviews" q
          WHERE q.base_question_id = bq.id
        ) BETWEEN 3 AND 5`;
      } else if (qaReviews === '5+') {
        whereClause += ` AND (
          SELECT COUNT(*) FROM "qa_reviews" q
          WHERE q.base_question_id = bq.id
        ) >= 5`;
      }
    }

    if (searchTerm) {
      whereClause += ` AND (
        bq.content ILIKE $${paramIndex}
        OR ai.topic ILIKE $${paramIndex}
        OR ai.specialty ILIKE $${paramIndex}
        OR CAST(bq.display_sequence AS TEXT) ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    // Get exercises with management info
    const exercisesQuery = `
      WITH numbered_questions AS (
        SELECT 
          bq.id,
          bq.content,
          bq.status,
          bq.created_at,
          ai.specialty,
          ai.topic,
          ai.difficulty,
          COALESCE(bq.display_sequence, ROW_NUMBER() OVER (ORDER BY bq.created_at ASC))::integer AS sequence_number,
          -- Count QA reviews (placeholder for now)
          0 as qa_review_count
        FROM base_questions bq
        LEFT JOIN ai_analysis ai ON ai.base_question_id = bq.id
        ${whereClause}
      )
      SELECT * FROM numbered_questions 
      ORDER BY sequence_number DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limitNumber, offset);

    const exercises = await prisma.$queryRawUnsafe(exercisesQuery, ...params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*)::integer as total
      FROM base_questions bq
      LEFT JOIN ai_analysis ai ON ai.base_question_id = bq.id
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalResult = await prisma.$queryRawUnsafe(countQuery, ...countParams);
    const total = (totalResult as any[])[0]?.total || 0;

    logger.info(`Exercise management list: ${(exercises as any[]).length} exercises returned`);

    res.json({
      success: true,
      data: {
        exercises,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting exercise management list:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/exercise-management/exercise/:id - Get single exercise for editing
router.get('/exercise/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    // Get base question with all variations and alternatives
    const baseQuestion = await prisma.baseQuestion.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
        variations: {
          include: {
            alternatives: {
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { variationNumber: 'asc' }
        }
      }
    });

    if (!baseQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Ejercicio no encontrado'
      });
    }

    logger.info(`Exercise ${id} retrieved for editing`);

    res.json({
      success: true,
      data: baseQuestion
    });

  } catch (error) {
    logger.error('Error getting exercise for editing:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/exercise-management/exercise/:id - Update exercise
router.put('/exercise/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { content, variations } = req.body;

    // Update base question content
    await prisma.baseQuestion.update({
      where: { id },
      data: { content }
    });

    // Update variations and alternatives
    for (const variation of variations) {
      await prisma.questionVariation.update({
        where: { id: variation.id },
        data: {
          content: variation.content,
          explanation: variation.explanation
        }
      });

      // Update alternatives
      for (const alternative of variation.alternatives) {
        await prisma.alternative.update({
          where: { id: alternative.id },
          data: {
            text: alternative.text,
            isCorrect: alternative.isCorrect,
            explanation: alternative.explanation
          }
        });
      }
    }

    logger.info(`Exercise ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Ejercicio actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Error updating exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// POST /api/exercise-management/bulk-status - Update status for multiple exercises
router.post('/bulk-status', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { ids, status } = req.body as { ids?: string[]; status?: string };
    if (!Array.isArray(ids) || ids.length === 0 || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una lista de IDs y un estado válido'
      });
    }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron IDs válidos'
      });
    }

    const result = await prisma.baseQuestion.updateMany({
      where: { id: { in: uniqueIds } },
      data: { status }
    });

    logger.info(`Bulk status update: ${result.count} exercises set to ${status}`);

    return res.json({
      success: true,
      data: { updated: result.count, status }
    });
  } catch (error) {
    logger.error('Error performing bulk status update:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado de los ejercicios',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/exercise-management/bulk-delete - Delete multiple exercises and their variations
router.post('/bulk-delete', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar una lista de IDs para eliminar'
      });
    }

    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron IDs válidos'
      });
    }

    const result = await prisma.baseQuestion.deleteMany({
      where: { id: { in: uniqueIds } }
    });

    logger.warn(`Bulk delete executed: ${result.count} exercises removed`);

    return res.json({
      success: true,
      data: { deleted: result.count }
    });
  } catch (error) {
    logger.error('Error performing bulk delete:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar los ejercicios seleccionados',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/exercise-management/filters - Get filter options
router.get('/filters', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const specialtiesQuery = await prisma.$queryRaw<{ name: string | null }[]>`
      SELECT name
      FROM "specialties"
      WHERE name IS NOT NULL AND TRIM(name) <> ''
      ORDER BY name ASC
    `;

    const topicsQuery = await prisma.$queryRaw<{ specialty: string | null; topic: string | null }[]>`
      SELECT s.name AS specialty, t.name AS topic
      FROM "topics" t
      LEFT JOIN "specialties" s ON s.id = t.specialty_id
      WHERE t.name IS NOT NULL AND TRIM(t.name) <> ''
      ORDER BY s.name ASC NULLS FIRST, t.name ASC
    `;

    const specialtyNames = Array.from(new Set(
      specialtiesQuery
        .map((row) => row.name?.trim())
        .filter((name): name is string => !!name && name.length > 0)
    )).sort((a, b) => a.localeCompare(b));

    const topicMap = new Map<string, { specialty: string | null; topic: string }>();
    topicsQuery.forEach((row) => {
      const specialtyName = row.specialty?.trim() || null;
      const topicName = row.topic?.trim();
      if (!topicName) return;
      const key = `${specialtyName ?? 'null'}|${topicName}`;
      if (!topicMap.has(key)) {
        topicMap.set(key, { specialty: specialtyName, topic: topicName });
      }
    });

    const topicList = Array.from(topicMap.values()).sort((a, b) => {
      const specialtyCompare = (a.specialty ?? '').localeCompare(b.specialty ?? '');
      if (specialtyCompare !== 0) return specialtyCompare;
      return a.topic.localeCompare(b.topic);
    });

    res.json({
      success: true,
      data: {
        specialties: specialtyNames,
        topics: topicList,
        statuses: ['COMPLETED', 'REVIEW_REQUIRED', 'APPROVED'],
        qaReviewRanges: [
          { label: 'Sin revisar', value: '0' },
          { label: '1-2 revisiones', value: '1-2' },
          { label: '3-5 revisiones', value: '3-5' },
          { label: '5+ revisiones', value: '5+' }
        ]
      }
    });
  } catch (taxonomyError) {
    logger.error('Error getting taxonomy-based filter options:', taxonomyError);

    try {
      const fallbackSpecialties = await prisma.$queryRaw<{ specialty: string | null }[]>`
        SELECT DISTINCT specialty
        FROM "ai_analysis"
        WHERE specialty IS NOT NULL AND TRIM(specialty) <> ''
        ORDER BY specialty ASC
      `;

      const fallbackTopics = await prisma.$queryRaw<{ specialty: string | null; topic: string | null }[]>`
        SELECT DISTINCT specialty, topic
        FROM "ai_analysis"
        WHERE topic IS NOT NULL AND TRIM(topic) <> ''
        ORDER BY specialty ASC NULLS FIRST, topic ASC
      `;

      const specialtyNames = fallbackSpecialties
        .map((row) => row.specialty?.trim())
        .filter((name): name is string => !!name && name.length > 0);

      const topicList = fallbackTopics
        .map((row) => ({ specialty: row.specialty?.trim() || null, topic: row.topic?.trim() }))
        .filter((row): row is { specialty: string | null; topic: string } => !!row.topic);

      res.json({
        success: true,
        data: {
          specialties: specialtyNames,
          topics: topicList,
          statuses: ['COMPLETED', 'REVIEW_REQUIRED', 'APPROVED'],
          qaReviewRanges: [
            { label: 'Sin revisar', value: '0' },
            { label: '1-2 revisiones', value: '1-2' },
            { label: '3-5 revisiones', value: '3-5' },
            { label: '5+ revisiones', value: '5+' }
          ]
        }
      });
    } catch (error) {
      logger.error('Error getting fallback filter options from AI analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

export { router as exerciseManagementRoutes };
