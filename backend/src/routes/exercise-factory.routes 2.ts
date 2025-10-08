import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { prisma } from '../lib/prisma';

// Extend Express Request type to include file
interface MulterRequest extends Request {
  file?: any;
}

const router = Router();

// Lazy load ExerciseFactoryService to prevent startup errors
const getExerciseFactory = async () => {
  try {
    const { ExerciseFactoryService } = await import('../services/exercise-factory.service');
    return new ExerciseFactoryService();
  } catch (error) {
    logger.error('Failed to load ExerciseFactoryService:', error);
    throw new Error('Exercise Factory service unavailable');
  }
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Health check for exercise factory routes (no auth required)
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test if ExerciseFactoryService can be loaded
    await getExerciseFactory();
    res.json({
      status: 'Exercise Factory routes OK - Service available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'Exercise Factory routes OK - Service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Apply auth middleware to all other routes
router.use(authenticate);

// POST /api/exercise-factory/upload-csv - Upload CSV with base questions
router.post('/upload-csv', upload.single('csvFile'), async (req: MulterRequest, res: Response): Promise<Response | void> => {
  try {
    const user = (req as any).user;

    // Check if user has permission (only ADMIN and CONTENT_MANAGER)
    if (!['ADMIN', 'CONTENT_MANAGER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cargar ejercicios'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo CSV'
      });
    }

    const csvData = req.file.buffer.toString('utf-8');
    const questions: string[] = [];

    // Parse CSV
    const parsePromise = new Promise<string[]>((resolve, reject) => {
      (parse as any)(csvData, {
        columns: false,
        skip_empty_lines: true,
        trim: true
      }, (err: any, records: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Smart header detection and processing
        let questions: string[] = [];

        if (records.length > 0) {
          const firstRow = records[0];
          const firstCell = Array.isArray(firstRow) ? firstRow[0] : firstRow;

          // Check if first row looks like a header
          const isHeader = typeof firstCell === 'string' && (
            firstCell.toLowerCase().includes('question') ||
            firstCell.toLowerCase().includes('pregunta') ||
            firstCell.toLowerCase().includes('text') ||
            firstCell.toLowerCase().includes('content') ||
            firstCell.length < 50 // Short text likely to be header
          );

          // Start from row 1 if header detected, otherwise from row 0
          const startIndex = isHeader ? 1 : 0;

          questions = records
            .slice(startIndex) // Skip header if detected
            .flat() // Flatten in case of multiple columns
            .filter((question: string) => question && question.trim().length > 10) // Basic validation
            .map((question: string) => question.trim());

          if (isHeader) {
            logger.info(`Header detected in CSV: "${firstCell}" - skipping first row`);
          }
        }

        resolve(questions);
      });
    });

    const parsedQuestions = await parsePromise;

    if (parsedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron preguntas válidas en el archivo CSV'
      });
    }

    // Create processing job
    const job = await prisma.processingJob.create({
      data: {
        type: 'CSV_UPLOAD',
        status: 'RUNNING',
        totalItems: parsedQuestions.length,
        inputData: {
          fileName: req.file.originalname,
          uploadedBy: user.userId
        },
        startedAt: new Date()
      }
    });

    // Process questions asynchronously
    getExerciseFactory().then(exerciseFactory => {
      return exerciseFactory.processQuestionsBatch(parsedQuestions, req.file.originalname, user.userId, job.id);
    }).catch(error => {
      logger.error('Error processing questions batch:', error);
    });

    res.json({
      success: true,
      message: `Se cargaron ${parsedQuestions.length} preguntas para procesamiento`,
      data: {
        jobId: job.id,
        questionsCount: parsedQuestions.length,
        fileName: req.file.originalname
      }
    });

  } catch (error) {
    logger.error('Error uploading CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/exercise-factory/jobs - Get processing jobs
router.get('/jobs', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const user = (req as any).user;
    logger.info('Getting processing jobs for user:', user?.userId);

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('Database connection OK');
    } catch (dbError) {
      logger.error('Database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

    // Check if processing_jobs table exists
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'processing_jobs'
        )
      `;
      logger.info('Processing jobs table exists:', tableExists);
    } catch (tableError) {
      logger.error('Error checking table existence:', tableError);
    }

    const jobs = await prisma.processingJob.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Latest 20 jobs
    });

    logger.info(`Found ${jobs.length} processing jobs`);

    res.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        fileName: (job.inputData as any)?.fileName || 'Unknown',
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
        progress: job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0
      }))
    });

  } catch (error) {
    logger.error('Error getting jobs - Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      cause: error instanceof Error ? error.cause : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

// GET /api/exercise-factory/base-questions - Get base questions awaiting processing
router.get('/base-questions', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const whereClause: any = {};
    if (status && ['PENDING', 'ANALYZING', 'GENERATING_VARIATIONS', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED'].includes(status as string)) {
      whereClause.status = status;
    }

    const [baseQuestions, total] = await Promise.all([
      prisma.baseQuestion.findMany({
        where: whereClause,
        include: {
          aiAnalysis: true,
          variations: {
            include: {
              alternatives: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limitNumber
      }),
      prisma.baseQuestion.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        baseQuestions,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting base questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/exercise-factory/analyze/:id - Trigger AI analysis for a base question
router.post('/analyze/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const baseQuestion = await prisma.baseQuestion.findUnique({
      where: { id }
    });

    if (!baseQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Pregunta base no encontrada'
      });
    }

    // Start AI analysis
    const exerciseFactory = await getExerciseFactory();
    await exerciseFactory.analyzeQuestion(baseQuestion);

    res.json({
      success: true,
      message: 'Análisis iniciado'
    });

  } catch (error) {
    logger.error('Error starting analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/exercise-factory/generated-questions - Get generated questions with their variations
router.get('/generated-questions', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const [baseQuestions, total] = await Promise.all([
      prisma.baseQuestion.findMany({
        where: {
          status: {
            not: 'PENDING'
          }
        },
        include: {
          aiAnalysis: true,
          variations: {
            include: {
              alternatives: {
                orderBy: {
                  order: 'asc'
                }
              }
            },
            orderBy: {
              variationNumber: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limitNumber
      }),
      prisma.baseQuestion.count({
        where: {
          status: {
            not: 'PENDING'
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        questions: baseQuestions,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting generated questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export { router as exerciseFactoryRoutes };