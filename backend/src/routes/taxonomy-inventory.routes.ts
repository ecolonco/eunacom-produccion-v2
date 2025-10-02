import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/taxonomy-inventory/full - Get complete taxonomy inventory with real exercise counts
router.get('/full', authenticate, async (req, res) => {
  try {
    logger.info('Fetching complete taxonomy inventory with exercise counts');

    // Get all specialties with topics and count exercises
    const specialties = await prisma.specialty.findMany({
      include: {
        topics: {
          include: {
            // Count questions in the old 'questions' table (regular questions)
            _count: {
              select: {
                questions: true
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        // Count questions in the old 'questions' table for the specialty
        _count: {
          select: {
            questions: true,
            topics: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Count factory exercises (base_questions) by specialty and topic through AI analysis
    const factoryExercisesBySpecialty = await prisma.$queryRaw`
      SELECT 
        s.id as specialty_id,
        s.name as specialty_name,
        COUNT(DISTINCT bq.id)::integer as factory_count
      FROM "specialties" s
      LEFT JOIN "ai_analysis" aa ON aa.specialty = s.name
      LEFT JOIN "base_questions" bq ON bq.id = aa.base_question_id
      WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
      GROUP BY s.id, s.name
    ` as Array<{specialty_id: string, specialty_name: string, factory_count: number}>;

    const factoryExercisesByTopic = await prisma.$queryRaw`
      SELECT 
        t.id as topic_id,
        t.name as topic_name,
        t.specialty_id,
        COUNT(DISTINCT bq.id)::integer as factory_count
      FROM "topics" t
      LEFT JOIN "ai_analysis" aa ON aa.topic = t.name AND aa.specialty = (SELECT name FROM "specialties" WHERE id = t.specialty_id)
      LEFT JOIN "base_questions" bq ON bq.id = aa.base_question_id
      WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
      GROUP BY t.id, t.name, t.specialty_id
    ` as Array<{topic_id: string, topic_name: string, specialty_id: string, factory_count: number}>;

    // Create lookup maps for factory exercises
    const factoryBySpecialtyMap = new Map(
      factoryExercisesBySpecialty.map(item => [item.specialty_id, item.factory_count])
    );
    const factoryByTopicMap = new Map(
      factoryExercisesByTopic.map(item => [item.topic_id, item.factory_count])
    );

    // Build inventory with real counts
    const inventory = specialties.map(specialty => {
      const specialtyFactoryCount = factoryBySpecialtyMap.get(specialty.id) || 0;
      const specialtyRegularCount = specialty._count.questions;

      const topics = specialty.topics.map(topic => {
        const topicFactoryCount = factoryByTopicMap.get(topic.id) || 0;
        const topicRegularCount = topic._count.questions;

        return {
          id: topic.id,
          name: topic.name,
          description: topic.description,
          regularQuestions: topicRegularCount,
          factoryExercises: topicFactoryCount,
          totalQuestions: topicRegularCount + topicFactoryCount
        };
      });

      return {
        id: specialty.id,
        name: specialty.name,
        description: specialty.description,
        code: specialty.code,
        isActive: specialty.isActive !== false, // Default to true if not specified
        topics: topics,
        summary: {
          totalTopics: specialty.topics.length,
          regularQuestions: specialtyRegularCount,
          factoryExercises: specialtyFactoryCount,
          totalQuestions: specialtyRegularCount + specialtyFactoryCount
        }
      };
    });

    // Calculate global summary
    const globalSummary = {
      totalSpecialties: inventory.length,
      totalTopics: inventory.reduce((sum, spec) => sum + spec.summary.totalTopics, 0),
      totalRegularQuestions: inventory.reduce((sum, spec) => sum + spec.summary.regularQuestions, 0),
      totalFactoryExercises: inventory.reduce((sum, spec) => sum + spec.summary.factoryExercises, 0),
      grandTotal: inventory.reduce((sum, spec) => sum + spec.summary.totalQuestions, 0)
    };

    logger.info('Taxonomy inventory generated successfully', {
      specialties: globalSummary.totalSpecialties,
      topics: globalSummary.totalTopics,
      regularQuestions: globalSummary.totalRegularQuestions,
      factoryExercises: globalSummary.totalFactoryExercises,
      grandTotal: globalSummary.grandTotal
    });

    res.json({
      success: true,
      data: {
        inventory,
        summary: globalSummary
      }
    });

  } catch (error: any) {
    logger.error('Error fetching taxonomy inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// GET /api/taxonomy-inventory/specialty/:specialtyId/exercises - Get exercises for a specific specialty
router.get('/specialty/:specialtyId/exercises', authenticate, async (req, res) => {
  try {
    const { specialtyId } = req.params;

    // Get specialty name for filtering
    const specialty = await prisma.specialty.findUnique({
      where: { id: specialtyId },
      select: { name: true }
    });

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Especialidad no encontrada'
      });
    }

    // Get regular questions
    const regularQuestions = await prisma.question.findMany({
      where: { 
        specialty: {
          id: specialtyId
        }
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        specialty: { select: { name: true } },
        topic: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get factory exercises through AI analysis
    const factoryExercises = await prisma.baseQuestion.findMany({
      where: { 
        status: { in: ['COMPLETED', 'REVIEW_REQUIRED', 'APPROVED'] },
        aiAnalysis: {
          specialty: specialty.name
        }
      },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        aiAnalysis: {
          select: {
            specialty: true,
            topic: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        specialty: {
          id: specialtyId,
          name: specialty.name
        },
        regularQuestions,
        factoryExercises,
        summary: {
          regularCount: regularQuestions.length,
          factoryCount: factoryExercises.length,
          totalCount: regularQuestions.length + factoryExercises.length
        }
      }
    });

  } catch (error: any) {
    logger.error('Error fetching exercises for specialty:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/taxonomy-inventory/topic/:topicId/exercises - Get exercises for a specific topic
router.get('/topic/:topicId/exercises', authenticate, async (req, res) => {
  try {
    const { topicId } = req.params;

    // Get topic info for filtering
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { specialty: { select: { name: true } } }
    });

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Tema no encontrado'
      });
    }

    // Get regular questions
    const regularQuestions = await prisma.question.findMany({
      where: { 
        topic: {
          id: topicId
        }
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        specialty: { select: { name: true } },
        topic: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get factory exercises through AI analysis
    const factoryExercises = await prisma.baseQuestion.findMany({
      where: { 
        status: { in: ['COMPLETED', 'REVIEW_REQUIRED', 'APPROVED'] },
        aiAnalysis: {
          topic: topic.name,
          specialty: topic.specialty.name
        }
      },
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        aiAnalysis: {
          select: {
            specialty: true,
            topic: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: {
        topic: {
          id: topicId,
          name: topic.name,
          specialty: topic.specialty
        },
        regularQuestions,
        factoryExercises,
        summary: {
          regularCount: regularQuestions.length,
          factoryCount: factoryExercises.length,
          totalCount: regularQuestions.length + factoryExercises.length
        }
      }
    });

  } catch (error: any) {
    logger.error('Error fetching exercises for topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
