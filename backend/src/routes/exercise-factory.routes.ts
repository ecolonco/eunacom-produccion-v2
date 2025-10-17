import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { authenticate, authorize } from '../middleware/auth.middleware';
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
    const service = new ExerciseFactoryService();
    logger.info('ExerciseFactoryService loaded successfully');
    return service;
  } catch (error) {
    logger.error('Failed to load ExerciseFactoryService:', error);
    logger.error('Error details:', error instanceof Error ? error.stack : error);
    throw new Error(`Exercise Factory service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    logger.info(`File upload attempt: ${file.originalname}, mimetype: ${file.mimetype}`);

    // Accept various CSV mimetypes and file extensions
    const validMimeTypes = [
      'text/csv',
      'application/csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      'text/plain'
    ];

    const isValidExtension = file.originalname.toLowerCase().endsWith('.csv');
    const isValidMimeType = validMimeTypes.includes(file.mimetype);

    if (isValidExtension || isValidMimeType) {
      logger.info(`File accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      logger.error(`File rejected: ${file.originalname}, mimetype: ${file.mimetype}`);
      cb(new Error(`Only CSV files are allowed. Received: ${file.mimetype}`));
    }
  }
});

// Health check for exercise factory routes (no auth required)
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test if ExerciseFactoryService can be loaded
    const exerciseFactory = await getExerciseFactory();
    const status = exerciseFactory.getServiceStatus();
    
    res.json({
      status: status.available ? 'Exercise Factory routes OK - Service available' : 'Exercise Factory routes OK - Service limited',
      serviceAvailable: status.available,
      error: status.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'Exercise Factory routes OK - Service unavailable',
      serviceAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint for taxonomy classification - TODO: Remove before production
router.get('/debug-classification', async (req: Request, res: Response) => {
  try {
    // Get recent AI analyses to see how exercises are being classified
    const recentAnalyses = await prisma.aIAnalysis.findMany({
      include: {
        baseQuestion: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            content: true
          }
        }
      },
      orderBy: {
        baseQuestion: {
          createdAt: 'desc'
        }
      },
      take: 10
    });

    // Get all specialties and topics from taxonomy
    const officialSpecialties = await prisma.specialty.findMany({
      include: {
        topics: true
      }
    });

    // Check matches between AI classifications and official taxonomy
    const classificationMatches = recentAnalyses.map(analysis => {
      const exactSpecialtyMatch = officialSpecialties.find(s => s.name === analysis.specialty);
      const partialSpecialtyMatch = officialSpecialties.find(s => 
        s.name.toLowerCase().includes(analysis.specialty.toLowerCase()) ||
        analysis.specialty.toLowerCase().includes(s.name.toLowerCase())
      );
      
      let exactTopicMatch = null;
      let partialTopicMatch = null;
      
      if (exactSpecialtyMatch) {
        exactTopicMatch = exactSpecialtyMatch.topics.find(t => t.name === analysis.topic);
        partialTopicMatch = exactSpecialtyMatch.topics.find(t => 
          t.name.toLowerCase().includes(analysis.topic.toLowerCase()) ||
          analysis.topic.toLowerCase().includes(t.name.toLowerCase())
        );
      }

      return {
        aiAnalysis: {
          id: analysis.id,
          specialty: analysis.specialty,
          topic: analysis.topic,
          exerciseId: analysis.baseQuestion?.id,
          exerciseStatus: analysis.baseQuestion?.status,
          createdAt: analysis.baseQuestion?.createdAt
        },
        matches: {
          exactSpecialty: exactSpecialtyMatch ? exactSpecialtyMatch.name : null,
          partialSpecialty: partialSpecialtyMatch ? partialSpecialtyMatch.name : null,
          exactTopic: exactTopicMatch ? exactTopicMatch.name : null,
          partialTopic: partialTopicMatch ? partialTopicMatch.name : null
        },
        willCount: !!(exactSpecialtyMatch && exactTopicMatch)
      };
    });

    res.json({
      success: true,
      data: {
        totalAnalyses: recentAnalyses.length,
        totalOfficialSpecialties: officialSpecialties.length,
        classifications: classificationMatches,
        summary: {
          exactMatches: classificationMatches.filter(c => c.willCount).length,
          mismatches: classificationMatches.filter(c => !c.willCount).length
        }
      }
    });

  } catch (error) {
    logger.error('Error in debug classification endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Emergency endpoint for taxonomy inventory without auth (temporary)
router.get('/taxonomy-inventory-no-auth', async (req: Request, res: Response) => {
  try {
    logger.info('🚨 EMERGENCY: Fetching taxonomy inventory without auth');

    // Get all specialties with their topics and exercise counts
    const specialties = await prisma.specialty.findMany({
      include: {
        topics: {
          include: {
            _count: {
              select: {
                questions: true
              }
            }
          }
        },
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get exercise counts from BaseQuestion (Exercise Factory) - Include REVIEW_REQUIRED
    const baseQuestionCounts = await prisma.$queryRaw<Array<{specialty: string, topic: string, count: bigint}>>`
      SELECT 
        ai.specialty,
        ai.topic,
        COUNT(*) as count
      FROM ai_analysis ai
      INNER JOIN base_questions bq ON ai.base_question_id = bq.id
      WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED')
      GROUP BY ai.specialty, ai.topic
    `;

    // Convert BigInt to number for JSON serialization
    const exerciseFactoryCounts = baseQuestionCounts.map(row => ({
      specialty: row.specialty,
      topic: row.topic,
      count: Number(row.count)
    }));

    logger.info('🚨 EMERGENCY: Taxonomy inventory fetched', {
      specialtiesCount: specialties.length,
      factoryExercisesCount: exerciseFactoryCounts.length
    });

    res.json({
      success: true,
      data: {
        specialties,
        exerciseFactoryCounts,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('🚨 EMERGENCY: Error fetching taxonomy inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Temporary debug endpoint (no auth required) - TODO: Remove before production
router.get('/debug-status', async (req: Request, res: Response) => {
  try {
    // Get all base questions with their status
    const allQuestions = await prisma.baseQuestion.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        variations: true,
        aiAnalysis: true
      }
    });

    // Count by status  
    const statusCountsRaw = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM base_questions 
      GROUP BY status
      ORDER BY count DESC
    ` as any[];

    // Convert BigInt to numbers
    const statusCounts = statusCountsRaw.map(row => ({
      status: row.status,
      count: Number(row.count)
    }));

    // Get recent jobs
    const recentJobs = await prisma.processingJob.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    res.json({
      success: true,
      data: {
        totalQuestions: allQuestions.length,
        questions: allQuestions.map(q => ({
          id: q.id,
          status: q.status,
          createdAt: q.createdAt,
          variationsCount: q.variations.length,
          hasAiAnalysis: !!q.aiAnalysis,
          contentPreview: q.content.substring(0, 100) + '...'
        })),
        statusCounts,
        recentJobs: recentJobs.map(j => ({
          id: j.id,
          status: j.status,
          progress: `${j.processedItems}/${j.totalItems}`,
          createdAt: j.createdAt,
          completedAt: j.completedAt
        }))
      }
    });

  } catch (error) {
    logger.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Apply auth middleware to all other routes
// POST /api/exercise-factory/upload-csv - Upload CSV with base questions (SIMPLIFIED)
router.post('/upload-csv', authenticate, async (req: MulterRequest, res: Response): Promise<Response | void> => {
  try {
    logger.info('🚀 CSV upload endpoint - SIMPLIFIED VERSION');
    
    const user = (req as any).user;
    if (!['ADMIN', 'CONTENT_MANAGER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para cargar ejercicios'
      });
    }

    // Handle file upload with multer
    upload.single('csvFile')(req, res, async (err) => {
      if (err) {
        logger.error('❌ Multer error:', err);
        return res.status(400).json({
          success: false,
          message: `Error uploading file: ${err.message}`
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó archivo CSV'
        });
      }

      logger.info('✅ File received, parsing CSV...');
      
      // Parse CSV content
      const csvData = req.file.buffer.toString('utf-8');
      const lines = csvData.split('\n').filter(line => line.trim().length > 10);
      
      if (lines.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron preguntas válidas en el CSV'
        });
      }

      // Create a simple job for tracking
      const job = await prisma.processingJob.create({
        data: {
          type: 'CSV_UPLOAD',
          status: 'RUNNING',
          totalItems: lines.length,
          processedItems: 0,
          inputData: { fileName: req.file.originalname, uploadedBy: user.userId },
          startedAt: new Date()
        }
      });

      logger.info(`✅ Job created: ${job.id}, processing ${lines.length} questions`);

      // Return immediate response
      res.json({
        success: true,
        message: `Se cargaron ${lines.length} preguntas para procesamiento`,
        data: {
          jobId: job.id,
          questionsCount: lines.length,
          fileName: req.file.originalname
        }
      });

      logger.info(`🔥 ABOUT TO START BACKGROUND PROCESSING for job ${job.id} with ${lines.length} questions`);

      // CRITICAL FIX: Capture variables needed in async block BEFORE it starts
      // This ensures userId and fileName are available inside the async closure
      const userId = user.userId;
      const fileName = req.file.originalname;

      logger.info(`✅ VARIABLES CAPTURED - userId: ${userId}, fileName: ${fileName} - BUILD VERSION 2025-10-17-v3`);

      // Process questions in background using the WORKING individual logic
      (async () => {
        try {
          logger.info(`🚀 BACKGROUND ASYNC STARTED for job ${job.id}`);
          const { ExerciseFactoryService } = await import('../services/exercise-factory.service');
          logger.info(`✅ ExerciseFactoryService imported for job ${job.id}`);
          const exerciseFactory = new ExerciseFactoryService();
          logger.info(`✅ ExerciseFactory instantiated for job ${job.id}`);

          for (let i = 0; i < lines.length; i++) {
            const question = lines[i].trim();
            logger.info(`📝 Processing question ${i + 1}/${lines.length}: ${question.substring(0, 50)}...`);

            try {
              // Create base question
              const baseQuestion = await prisma.baseQuestion.create({
                data: {
                  content: question,
                  sourceFile: fileName,
                  uploadedBy: userId,
                  status: 'PENDING'
                }
              });

              // Use the WORKING analyzeQuestion method
              await exerciseFactory.analyzeQuestion(baseQuestion);
              
              // Update progress
              await prisma.processingJob.update({
                where: { id: job.id },
                data: { processedItems: i + 1 }
              });

              logger.info(`✅ Question ${i + 1} processed successfully`);
            } catch (error) {
              logger.error(`❌ Error processing question ${i + 1}:`, error);
              // Continue with next question
            }
          }

          // Mark job as completed
          await prisma.processingJob.update({
            where: { id: job.id },
            data: { status: 'COMPLETED', completedAt: new Date() }
          });

          logger.info(`🎉 CSV job ${job.id} completed successfully`);
        } catch (error) {
          logger.error(`❌ CSV job ${job.id} failed:`, error);
          await prisma.processingJob.update({
            where: { id: job.id },
            data: { status: 'FAILED', errorMessage: error.message, completedAt: new Date() }
          });
        }
      })();
    });

  } catch (error) {
    logger.error('❌ CSV upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});
// Apply auth middleware to all other routes
router.use(authenticate);
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

    logger.info(`Found ${jobs.length} processing jobs - DB sync confirmed`);

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

// GET /api/exercise-factory/status - Get service status
router.get('/status', authenticate, authorize('ADMIN'), async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const exerciseFactory = await getExerciseFactory();
    const status = exerciseFactory.getServiceStatus();
    const isAvailable = exerciseFactory.isServiceAvailable();

    res.json({
      success: true,
      data: {
        serviceAvailable: isAvailable,
        status: status,
        timestamp: new Date().toISOString(),
        envVars: {
          openaiConfigured: !!process.env.OPENAI_API_KEY,
          deepseekConfigured: !!process.env.DEEPSEEK_API_KEY
        }
      }
    });

  } catch (error) {
    logger.error('Error getting service status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/exercise-factory/metrics - Get classification metrics
router.get('/metrics', authenticate, authorize('ADMIN'), async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const exerciseFactory = await getExerciseFactory();
    const metrics = exerciseFactory.getClassificationMetrics();

    res.json({
      success: true,
      data: {
        ...metrics,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting classification metrics:', error);
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

    // Get base questions with sequential numbering (where new exercises are saved)
    const questionsWithNumbers = await prisma.$queryRaw`
      WITH numbered_questions AS (
        SELECT 
          id,
          content,
          status,
          "createdAt",
          ROW_NUMBER() OVER (ORDER BY "createdAt" ASC)::integer as sequence_number
        FROM "base_questions"
        WHERE status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
      )
      SELECT * FROM numbered_questions 
      ORDER BY sequence_number DESC
      LIMIT ${limitNumber} OFFSET ${offset}
    `;

    const totalCount = await prisma.$queryRaw`
      SELECT COUNT(*)::integer as count
      FROM "base_questions"
      WHERE status != 'PENDING'
    `;

    const total = (totalCount as any[])[0]?.count || 0;
    
    // Get variations for each base question (with correct column names)
    const baseQuestions = await Promise.all(
      (questionsWithNumbers as any[]).map(async (q) => {
        try {
          const variations = await prisma.$queryRaw`
            SELECT id, content, variation_number, difficulty, explanation
            FROM "question_variations"
            WHERE base_question_id = ${q.id}
            ORDER BY variation_number ASC
          `;

          // Get AI analysis for this base question
          const aiAnalysis = await prisma.aIAnalysis.findUnique({
            where: { baseQuestionId: q.id },
            select: {
              specialty: true,
              topic: true,
              difficulty: true
            }
          });

          // Get alternatives for each variation
          const variationsWithAlternatives = await Promise.all(
            (variations as any[]).map(async (v) => {
              const alternatives = await prisma.$queryRaw`
                SELECT id, text, is_correct, "order", explanation
                FROM "alternatives"
                WHERE variation_id = ${v.id}
                ORDER BY "order" ASC
              `;

              return {
                id: v.id,
                content: v.content,
                variationNumber: v.variation_number,
                difficulty: v.difficulty,
                explanation: v.explanation,
                alternatives: (alternatives as any[]).map((alt: any) => ({
                  id: alt.id,
                  text: alt.text,
                  isCorrect: alt.is_correct,
                  explanation: alt.explanation,
                  order: alt.order
                }))
              };
            })
          );

          return {
            id: q.id,
            content: q.content,
            createdAt: q.createdAt,
            status: q.status,
            sequenceNumber: q.sequence_number,
            aiAnalysis: aiAnalysis,
            variations: variationsWithAlternatives
          };
        } catch (error) {
          console.error('Error getting variations for question', q.id, error);
          return {
            id: q.id,
            content: q.content,
            createdAt: q.createdAt,
            status: q.status,
            sequenceNumber: q.sequence_number,
            aiAnalysis: null,
            variations: []
          };
        }
      })
    );

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

// POST /api/exercise-factory/create-single - Create single exercise with variations
router.post('/create-single', [
  body('question')
    .isString()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La pregunta debe tener entre 10 y 2000 caracteres'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('La descripción no debe exceder 500 caracteres')
], async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const user = (req as any).user;
    logger.info(`Single exercise creation by user: ${user?.userId || 'unknown'}, role: ${user?.role || 'unknown'}`);

    // Check if user has permission (only ADMIN and CONTENT_MANAGER)
    if (!['ADMIN', 'CONTENT_MANAGER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear ejercicios'
      });
    }

    const { question, description } = req.body;

    logger.info('Creating single exercise job...');

    // Create processing job for single exercise
    const job = await prisma.processingJob.create({
      data: {
        type: 'SINGLE_EXERCISE',
        status: 'RUNNING',
        totalItems: 1,
        inputData: {
          question: question,
          description: description || '',
          createdBy: user.userId
        },
        startedAt: new Date()
      }
    });

    logger.info(`Single exercise job created with ID: ${job.id}`);

    // Return immediate response
    res.json({
      success: true,
      message: 'Ejercicio enviado para procesamiento',
      data: {
        jobId: job.id,
        question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
        status: 'PROCESSING'
      }
    });

    logger.info('Response sent to client, starting AI processing...');
    logger.info(`About to start async processing for job ${job.id} with question: "${question}"`);

    // Process single question asynchronously - DIRECT IMPORT LIKE DEBUG ROUTE
    (async () => {
      try {
        logger.info(`=== DIRECT IMPORT: Loading ExerciseFactory for job ${job.id} ===`);

        // Import directly like the debug route that works
        const { ExerciseFactoryService } = await import('../services/exercise-factory.service');
        logger.info(`✅ ExerciseFactoryService imported directly for job ${job.id}`);

        const exerciseFactory = new ExerciseFactoryService();
        logger.info(`✅ ExerciseFactory instantiated successfully for job ${job.id}`);
        logger.info(`About to call processQuestionsBatch with question: "${question}"`);

        const startTime = Date.now();
        await exerciseFactory.processQuestionsBatch([question], 'Ejercicio Individual', user.userId, job.id);
        const duration = Date.now() - startTime;

        logger.info(`✅ Single exercise job ${job.id} completed successfully in ${duration}ms`);
      } catch (error) {
        logger.error(`❌ Error processing single exercise for job ${job.id}:`, error);
        logger.error(`Error type: ${typeof error}, message: ${error instanceof Error ? error.message : 'Unknown'}`);
        logger.error(`Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');

        // Update job status to failed
        try {
          await prisma.processingJob.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              completedAt: new Date()
            }
          });
          logger.info(`Job ${job.id} marked as FAILED`);
        } catch (updateError) {
          logger.error('Error updating failed job status:', updateError);
        }
      }
    })();

  } catch (error) {
    logger.error('Error creating single exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/exercise-factory/admin/delete-exercise/:id - Admin endpoint to delete exercise and all variations
router.delete('/admin/delete-exercise/:id', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID del ejercicio es requerido'
      });
    }

    // Verify the exercise exists first
    const baseQuestion = await prisma.baseQuestion.findUnique({
      where: { id },
      include: {
        aiAnalysis: true,
        variations: {
          include: {
            alternatives: true
          }
        }
      }
    });

    if (!baseQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Ejercicio no encontrado'
      });
    }

    // Count what will be deleted
    const variationsCount = baseQuestion.variations.length;
    const alternativesCount = baseQuestion.variations.reduce((sum, v) => sum + v.alternatives.length, 0);

    // Log the deletion for audit purposes
    logger.info(`Admin deletion requested for exercise ${id}`, {
      baseQuestionId: id,
      content: baseQuestion.content.substring(0, 100),
      variationsCount,
      alternativesCount,
      aiAnalysisExists: !!baseQuestion.aiAnalysis,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    // Delete the base question (CASCADE will delete related records)
    await prisma.baseQuestion.delete({
      where: { id }
    });

    logger.info(`Exercise ${id} and all related data deleted successfully`);

    res.json({
      success: true,
      message: 'Ejercicio eliminado exitosamente',
      deletedData: {
        baseQuestionId: id,
        variationsDeleted: variationsCount,
        alternativesDeleted: alternativesCount,
        aiAnalysisDeleted: !!baseQuestion.aiAnalysis,
        reason: reason || 'No reason provided'
      }
    });

  } catch (error) {
    logger.error('Error deleting exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/exercise-factory/admin/quality-report - Admin endpoint to get quality metrics
router.get('/admin/quality-report', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const [
      totalExercises,
      pendingExercises,
      completedExercises,
      exercisesWithVariations,
      totalVariations,
      totalAlternatives
    ] = await Promise.all([
      prisma.baseQuestion.count(),
      prisma.baseQuestion.count({ where: { status: 'PENDING' } }),
      prisma.baseQuestion.count({ where: { status: 'REVIEW_REQUIRED' } }),
      prisma.baseQuestion.count({ 
        where: { 
          variations: { some: {} } 
        } 
      }),
      prisma.questionVariation.count(),
      prisma.alternative.count()
    ]);

    // Get exercises with their variation counts for detailed analysis
    const exercisesWithDetails = await prisma.baseQuestion.findMany({
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        aiAnalysis: {
          select: {
            specialty: true,
            topic: true,
            difficulty: true
          }
        },
        _count: {
          select: {
            variations: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalExercises,
          pendingExercises,
          completedExercises,
          exercisesWithVariations,
          totalVariations,
          totalAlternatives,
          averageVariationsPerExercise: exercisesWithVariations > 0 ? (totalVariations / exercisesWithVariations).toFixed(1) : 0
        },
        recentExercises: exercisesWithDetails.map(ex => ({
          id: ex.id,
          contentPreview: ex.content.substring(0, 100) + '...',
          status: ex.status,
          variationsCount: ex._count.variations,
          classification: ex.aiAnalysis ? {
            specialty: ex.aiAnalysis.specialty,
            topic: ex.aiAnalysis.topic,
            difficulty: ex.aiAnalysis.difficulty
          } : null,
          createdAt: ex.createdAt
        }))
      }
    });

  } catch (error) {
    logger.error('Error getting quality report:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/exercise-factory/admin/taxonomy-inventory - Get complete taxonomy inventory with exercise counts
router.get('/admin/taxonomy-inventory', authenticate, async (req: Request, res: Response) => {
  try {
    logger.info('Fetching taxonomy inventory for admin dashboard');

    // Get all specialties with their topics and exercise counts
    const specialties = await prisma.specialty.findMany({
      include: {
        topics: {
          include: {
            _count: {
              select: {
                questions: true
              }
            }
          }
        },
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get exercise counts from BaseQuestion (Exercise Factory)
    const baseQuestionCounts = await prisma.$queryRaw<Array<{specialty: string, topic: string, count: bigint}>>`
      SELECT 
        ai.specialty,
        ai.topic,
        COUNT(*) as count
      FROM ai_analysis ai
      INNER JOIN base_questions bq ON ai.base_question_id = bq.id
      WHERE bq.status IN ('COMPLETED', 'REVIEW_REQUIRED')
      GROUP BY ai.specialty, ai.topic
    `;

    // Convert BigInt to number for JSON serialization
    const exerciseFactoryCounts = baseQuestionCounts.map(row => ({
      specialty: row.specialty,
      topic: row.topic,
      count: Number(row.count)
    }));

    // Build comprehensive taxonomy inventory
    const inventory = specialties.map(specialty => {
      const topics = specialty.topics.map(topic => {
        // Count from regular questions table
        const regularQuestionCount = topic._count.questions;
        
        // Count from exercise factory (BaseQuestion) - INTELLIGENT MATCHING
        const factoryExercise = exerciseFactoryCounts.find(ex => {
          // Exact match first
          if (ex.specialty === specialty.name && ex.topic === topic.name) {
            return true;
          }
          
          // Smart matching for specialty names
          const specialtyMatches = 
            specialty.name.toLowerCase().includes(ex.specialty.toLowerCase()) ||
            ex.specialty.toLowerCase().includes(specialty.name.toLowerCase()) ||
            // Special cases for known mappings
            (ex.specialty === 'Ginecología' && specialty.name === 'Obstetricia y Ginecología') ||
            (ex.specialty === 'Obstetricia' && specialty.name === 'Obstetricia y Ginecología') ||
            (ex.specialty === 'Medicina Interna' && specialty.name === 'Medicina Interna') ||
            (ex.specialty === 'Cirugía' && specialty.name === 'Cirugía') ||
            (ex.specialty === 'Cirugía General' && specialty.name === 'Cirugía');
          
          // Smart matching for topic names
          const topicMatches =
            topic.name.toLowerCase().includes(ex.topic.toLowerCase()) ||
            ex.topic.toLowerCase().includes(topic.name.toLowerCase()) ||
            ex.topic === topic.name;
          
          return specialtyMatches && topicMatches;
        });
        
        const factoryQuestionCount = factoryExercise ? factoryExercise.count : 0;

        return {
          id: topic.id,
          name: topic.name,
          description: topic.description,
          regularQuestions: regularQuestionCount,
          factoryExercises: factoryQuestionCount,
          totalQuestions: regularQuestionCount + factoryQuestionCount
        };
      });

      // Calculate specialty totals
      const regularTotal = topics.reduce((sum, topic) => sum + topic.regularQuestions, 0);
      const factoryTotal = topics.reduce((sum, topic) => sum + topic.factoryExercises, 0);

      return {
        id: specialty.id,
        name: specialty.name,
        description: specialty.description,
        code: specialty.code,
        isActive: specialty.isActive,
        topics: topics,
        summary: {
          totalTopics: topics.length,
          regularQuestions: regularTotal,
          factoryExercises: factoryTotal,
          totalQuestions: regularTotal + factoryTotal
        }
      };
    });

    // Calculate global totals
    const globalSummary = {
      totalSpecialties: inventory.length,
      totalTopics: inventory.reduce((sum, spec) => sum + spec.summary.totalTopics, 0),
      totalRegularQuestions: inventory.reduce((sum, spec) => sum + spec.summary.regularQuestions, 0),
      totalFactoryExercises: inventory.reduce((sum, spec) => sum + spec.summary.factoryExercises, 0),
      grandTotal: inventory.reduce((sum, spec) => sum + spec.summary.totalQuestions, 0)
    };

    logger.info('Taxonomy inventory fetched successfully', {
      specialtiesCount: inventory.length,
      totalQuestions: globalSummary.grandTotal
    });

    res.json({
      success: true,
      data: {
        inventory,
        summary: globalSummary
      }
    });

  } catch (error) {
    logger.error('Error fetching taxonomy inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export { router as exerciseFactoryRoutes };
