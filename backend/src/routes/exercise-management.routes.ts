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
      dateFrom,
      dateTo,
      status
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

    if (dateFrom) {
      whereClause += ` AND bq.created_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereClause += ` AND bq.created_at <= $${paramIndex}`;
      params.push(dateTo);
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
          ROW_NUMBER() OVER (ORDER BY bq.created_at ASC)::integer as sequence_number,
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
            isCorrect: alternative.isCorrect
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

// GET /api/exercise-management/filters - Get filter options
router.get('/filters', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Get unique specialties and topics
    const specialties = await prisma.$queryRaw`
      SELECT DISTINCT ai.specialty
      FROM ai_analysis ai
      INNER JOIN base_questions bq ON bq.id = ai.base_question_id
      WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
      AND ai.specialty IS NOT NULL
      ORDER BY ai.specialty
    `;

    const topics = await prisma.$queryRaw`
      SELECT DISTINCT ai.specialty, ai.topic
      FROM ai_analysis ai
      INNER JOIN base_questions bq ON bq.id = ai.base_question_id
      WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
      AND ai.topic IS NOT NULL
      ORDER BY ai.specialty, ai.topic
    `;

    res.json({
      success: true,
      data: {
        specialties: (specialties as any[]).map(s => s.specialty),
        topics: topics,
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
    logger.error('Error getting filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as exerciseManagementRoutes };

