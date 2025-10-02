import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult, query } from 'express-validator';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authenticate);

// Simplified quiz endpoint for deployment
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      where: { isActive: true },
      take: 10,
      select: {
        id: true,
        content: true,
        difficulty: true,
        type: true
      }
    });

    return res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    logger.error('Error fetching questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las preguntas'
    });
  }
});

// Get random question (compatible with frontend expectations)

// Backward compatibility - Keep the old /random endpoint
router.get('/random', async (req: Request, res: Response) => {
  try {
    // Get random question with options
    const question = await prisma.question.findFirst({
      where: {
        isActive: true,
        isReviewed: true
      },
      include: {
        options: {
          orderBy: { order: 'asc' }
        },
        specialty: {
          select: { name: true }
        },
        topic: {
          select: { name: true }
        }
      },
      skip: Math.floor(Math.random() * 100) // Simple randomization
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'No hay preguntas disponibles'
      });
    }

    return res.json({
      success: true,
      data: question
    });
  } catch (error) {
    logger.error('Error fetching random question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la pregunta'
    });
  }
});

// Get question by ID
router.get('/question/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { order: 'asc' }
        },
        specialty: {
          select: { name: true }
        },
        topic: {
          select: { name: true }
        }
      }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Pregunta no encontrada'
      });
    }

    return res.json({
      success: true,
      data: question
    });
  } catch (error) {
    logger.error('Error fetching question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la pregunta'
    });
  }
});

// Submit answer (compatible with frontend expectations)
router.post('/submit-answer', [
  body('questionId').notEmpty().withMessage('Question ID is required'),
  body('selectedOptionId').notEmpty().withMessage('Selected option is required'),
  body('timeSpent').optional().isNumeric().withMessage('Time spent must be a number')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { questionId, selectedOptionId, timeSpent } = req.body;
    const userId = (req as any).user.userId;

    // Get the correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        specialty: { select: { name: true } },
        topic: { select: { name: true } }
      }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Pregunta no encontrada'
      });
    }

    const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
    const correctOption = question.options.find(opt => opt.isCorrect);

    if (!selectedOption || !correctOption) {
      return res.status(400).json({
        success: false,
        message: 'Opción inválida'
      });
    }

    const isCorrect = selectedOption.isCorrect;

    // Format result to match frontend expectations
    const result = {
      isCorrect,
      correctAnswer: correctOption.text,
      selectedAnswer: selectedOption.text,
      explanation: question.explanation,
      difficulty: question.difficulty,
      specialty: question.specialty.name,
      topic: question.topic.name,
      timeSpent: timeSpent || 0
    };

    return res.json({
      success: true,
      result: result
    });
  } catch (error) {
    logger.error('Error submitting answer:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la respuesta'
    });
  }
});

// Backward compatibility - Keep the old /answer endpoint
router.post('/answer', [
  body('questionId').notEmpty().withMessage('Question ID is required'),
  body('selectedOptionId').notEmpty().withMessage('Selected option is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }

    const { questionId, selectedOptionId } = req.body;
    const userId = (req as any).user.userId;

    // Get the correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: true
      }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Pregunta no encontrada'
      });
    }

    const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
    const correctOption = question.options.find(opt => opt.isCorrect);

    if (!selectedOption || !correctOption) {
      return res.status(400).json({
        success: false,
        message: 'Opción inválida'
      });
    }

    const isCorrect = selectedOption.isCorrect;

    return res.json({
      success: true,
      data: {
        isCorrect,
        correctOptionId: correctOption.id,
        explanation: question.explanation,
        selectedOptionId,
        questionId
      }
    });
  } catch (error) {
    logger.error('Error submitting answer:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la respuesta'
    });
  }
});

// Get specialties for quiz filtering
router.get('/specialties', async (req: Request, res: Response) => {
  try {
    const specialties = await prisma.specialty.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            questions: {
              where: {
                isActive: true,
                isReviewed: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedSpecialties = specialties.map(specialty => ({
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      questionCount: specialty._count.questions
    }));

    return res.json({
      success: true,
      specialties: formattedSpecialties
    });
  } catch (error) {
    logger.error('Error fetching specialties:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las especialidades'
    });
  }
});

// Health check for quiz routes
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'Quiz routes OK' });
});

export default router;
// TEMPORAL: AI Random Question endpoint for testing - ADDED $(date)
router.get('/ai-random', async (req: Request, res: Response) => {
  try {
    logger.info('🤖 AI Random Question endpoint called');

    // Get total count of AI-generated questions
    const totalQuestions = await prisma.questionVariation.count({
      where: {
        baseQuestion: {
          status: 'REVIEW_REQUIRED'
        }
      }
    });

    logger.info(`📊 Total AI questions available: ${totalQuestions}`);

    if (totalQuestions === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay ejercicios de IA disponibles'
      });
    }

    const randomSkip = Math.floor(Math.random() * totalQuestions);
    logger.info(`🎲 Random skip: ${randomSkip}`);

    // Get random AI question with alternatives
    const question = await prisma.questionVariation.findFirst({
      where: {
        baseQuestion: {
          status: 'REVIEW_REQUIRED'
        }
      },
      skip: randomSkip,
      include: {
        alternatives: {
          orderBy: { order: 'asc' }
        },
        baseQuestion: {
          include: {
            aiAnalysis: {
              select: {
                specialty: true,
                topic: true,
                difficulty: true
              }
            }
          }
        }
      }
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'No se pudo obtener ejercicio de IA'
      });
    }

    logger.info(`✅ AI Question found: ${question.id}`);

    // Format response to match frontend expectations
    const formattedQuestion = {
      id: question.id,
      content: question.content,
      explanation: question.explanation || 'Explicación generada por IA',
      difficulty: question.difficulty || question.baseQuestion.aiAnalysis?.difficulty || 'MEDIUM',
      type: 'MULTIPLE_CHOICE',
      specialty: question.baseQuestion.aiAnalysis?.specialty || 'General',
      topic: question.baseQuestion.aiAnalysis?.topic || 'General',
      options: question.alternatives.map(alternative => ({
        id: alternative.id,
        text: alternative.text,
        isCorrect: alternative.isCorrect,
        order: alternative.order
      }))
    };

    logger.info(`🎯 Returning formatted question with ${formattedQuestion.options.length} options`);

    return res.json({
      success: true,
      question: formattedQuestion,
      source: 'AI_FACTORY',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error in AI random question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ejercicio de IA',
      error: error.message
    });
  }
});
