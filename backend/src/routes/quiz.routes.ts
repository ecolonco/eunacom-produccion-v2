import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { body, validationResult, query } from 'express-validator';
import { logger } from '../utils/logger';
import { extractFormattedIdentifier } from '../utils/questionIdentifiers';
import { authenticate } from '../middleware/auth.middleware';
import { CreditsService } from '../services/credits.service';

const router = Router();
const prisma = new PrismaClient();

const normalizeSpecialtyParam = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue.toLowerCase() === 'all') {
    return undefined;
  }

  return trimmedValue;
};

const buildAiRandomWhere = (specialty?: string): Prisma.QuestionVariationWhereInput => {
  const baseQuestionFilter: Prisma.BaseQuestionWhereInput = {
    status: 'REVIEW_REQUIRED',
  };

  if (specialty) {
    baseQuestionFilter.aiAnalysis = {
      is: {
        specialty,
      },
    };
  }

  return {
    baseQuestion: baseQuestionFilter,
  };
};

const fetchRandomAiQuestion = async (specialty?: string) => {
  const where = buildAiRandomWhere(specialty);

  const totalQuestions = await prisma.questionVariation.count({
    where,
  });

  if (totalQuestions === 0) {
    return null;
  }

  const randomSkip = Math.floor(Math.random() * totalQuestions);

  const question = await prisma.questionVariation.findFirst({
    where,
    skip: randomSkip,
    include: {
      alternatives: {
        orderBy: { order: 'asc' },
      },
      baseQuestion: {
        include: {
          aiAnalysis: {
            select: {
              specialty: true,
              topic: true,
              difficulty: true,
              analysisResult: true,
            },
          },
        },
      },
    },
  });

  if (!question) {
    return null;
  }

  const formattedId = extractFormattedIdentifier(question);
  const displayCode = formattedId ?? question.displayCode ?? null;

  if (displayCode && displayCode !== question.displayCode) {
    await prisma.questionVariation.update({
      where: { id: question.id },
      data: { displayCode },
    });
  }

  const formattedQuestion = {
    id: question.id,
    formattedId: displayCode,
    displayId: displayCode,
    displayCode,
    variationNumber: question.variationNumber ?? null,
    content: question.content,
    explanation: question.explanation || 'Explicación generada por IA',
    difficulty: question.difficulty || question.baseQuestion.aiAnalysis?.difficulty || 'MEDIUM',
    type: 'MULTIPLE_CHOICE',
    specialty: question.baseQuestion.aiAnalysis?.specialty || 'General',
    topic: question.baseQuestion.aiAnalysis?.topic || 'General',
    options: question.alternatives.map((alternative) => ({
      id: alternative.id,
      text: alternative.text,
      isCorrect: alternative.isCorrect,
      order: alternative.order,
      explanation: alternative.explanation || null,
    })),
  };

  return {
    formattedQuestion,
    totalQuestions,
  };
};

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

    const formattedId = extractFormattedIdentifier(question);

    return res.json({
      success: true,
      data: {
        ...question,
        formattedId: formattedId ?? null,
        displayId: formattedId ?? null,
      }
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

    const { questionId, selectedOptionId } = req.body;
    const userId = (req as any).user?.userId;

    let creditsRemaining = 0;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
      });
      creditsRemaining = user?.credits ?? 0;
    }

    const variation = await prisma.questionVariation.findUnique({
      where: { id: questionId },
      include: {
        alternatives: true
      }
    });

    if (variation) {
      const correctAlternative = variation.alternatives.find(opt => opt.isCorrect);
      const selectedAlternative = variation.alternatives.find(opt => opt.id === selectedOptionId);

      if (!selectedAlternative || !correctAlternative) {
        return res.status(400).json({
          success: false,
          message: 'Opción inválida'
        });
      }

      const isCorrect = selectedAlternative.id === correctAlternative.id;

      return res.json({
        success: true,
        result: {
          isCorrect,
          correctAnswer: correctAlternative.text,
          correctOptionId: correctAlternative.id,
          correctAnswerExplanation: correctAlternative.explanation || null,
          selectedAnswer: selectedAlternative.text,
          selectedOptionId,
          selectedAnswerExplanation: selectedAlternative.explanation || null,
          explanation: variation.explanation || 'Explicación generada por IA',
          points: isCorrect ? 1 : 0,
          creditsRemaining
        }
      });
    }

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

    const isCorrect = selectedOption.id === correctOption.id;

    return res.json({
      success: true,
      result: {
        isCorrect,
        correctAnswer: correctOption.text,
        correctOptionId: correctOption.id,
        correctAnswerExplanation: null,
        selectedAnswer: selectedOption.text,
        selectedOptionId,
        selectedAnswerExplanation: null,
        explanation: question.explanation || 'No hay explicación disponible',
        points: isCorrect ? 1 : 0,
        creditsRemaining
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
    const specialtyFilter = normalizeSpecialtyParam(req.query.specialty);

    if (specialtyFilter) {
      logger.info(`🤖 AI Random Question requested for specialty: ${specialtyFilter}`);
    } else {
      logger.info('🤖 AI Random Question endpoint called without specialty filter');
    }

    const result = await fetchRandomAiQuestion(specialtyFilter);

    if (!result) {
      const message = specialtyFilter
        ? 'No hay ejercicios de IA disponibles para la especialidad seleccionada'
        : 'No hay ejercicios de IA disponibles';

      return res.status(404).json({
        success: false,
        message,
      });
    }

    const { formattedQuestion, totalQuestions } = result;

    logger.info(`✅ AI Question found: ${formattedQuestion.id}`);

    return res.json({
      success: true,
      question: formattedQuestion,
      source: 'AI_FACTORY',
      timestamp: new Date().toISOString(),
      totalAvailable: totalQuestions,
      specialtyFilter: specialtyFilter ?? null,
    });
  } catch (error: any) {
    logger.error('❌ Error in AI random question:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ejercicio de IA',
      error: error?.message,
    });
  }
});

// ALIAS: Redirect /random-question to working /ai-random endpoint
router.get('/random-question', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    const specialtyFilter = normalizeSpecialtyParam(req.query.specialty);

    if (specialtyFilter) {
      logger.info(`🔄 Random-question alias requested for specialty: ${specialtyFilter}`);
    } else {
      logger.info('🔄 Random-question alias requested without specialty filter');
    }

    const result = await fetchRandomAiQuestion(specialtyFilter);

    if (!result) {
      const message = specialtyFilter
        ? 'No se encontraron preguntas para la especialidad seleccionada'
        : 'No se encontraron preguntas con los criterios especificados';

      return res.status(404).json({
        success: false,
        message,
      });
    }

    const { formattedQuestion } = result;

    // Descontar 1 crédito al mostrar la pregunta y obtener el nuevo balance
    const deductResult = await CreditsService.deductCredits(userId, 'SINGLE_RANDOM', {
      questionId: formattedQuestion.id,
      specialty: specialtyFilter,
    });

    logger.info(`💳 1 crédito descontado para usuario ${userId}, nuevo balance: ${deductResult.newBalance}`);

    return res.json({
      success: true,
      question: formattedQuestion,
      specialtyFilter: specialtyFilter ?? null,
      credits: {
        remaining: deductResult.newBalance,
        deducted: 1,
        transaction: deductResult.transaction
      }
    });
  } catch (error: any) {
    logger.error('❌ Error in random-question alias:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener pregunta',
      error: error?.message,
    });
  }
});
