import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const router = Router();

// Basic health check for debug routes
router.get('/health', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    return res.json({
      status: 'Debug routes OK',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in debug health check:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test ExerciseFactoryService
router.get('/test-exercise-service', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    logger.info('Testing ExerciseFactoryService...');

    // Test 1: Import service
    try {
      const { ExerciseFactoryService } = await import('../services/exercise-factory.service');
      const service = new ExerciseFactoryService();
      logger.info('✅ ExerciseFactoryService instantiated successfully');
    } catch (serviceError) {
      logger.error('❌ ExerciseFactoryService error:', serviceError);
      throw new Error(`ExerciseFactoryService failed: ${serviceError}`);
    }

    // Test 2: Test DeepSeek connectivity
    try {
      const { DeepSeekService } = await import('../services/deepseek.service');
      const deepSeek = new DeepSeekService();
      logger.info('✅ DeepSeekService instantiated successfully');
    } catch (deepSeekError) {
      logger.error('❌ DeepSeekService error:', deepSeekError);
      throw new Error(`DeepSeekService failed: ${deepSeekError}`);
    }

    // Test 3: Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connection OK');
    } catch (dbError) {
      logger.error('❌ Database error:', dbError);
      throw new Error(`Database failed: ${dbError}`);
    }

    // Test 4: Check environment variables
    const deepSeekKey = process.env.DEEPSEEK_API_KEY;
    logger.info('✅ DEEPSEEK_API_KEY exists:', !!deepSeekKey);

    return res.json({
      success: true,
      message: 'ExerciseFactoryService tests completed',
      results: {
        exerciseService: 'OK',
        deepSeekService: 'OK',
        database: 'OK',
        deepSeekKey: !!deepSeekKey
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error testing ExerciseFactoryService:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Test exercise processing without authentication
router.post('/test-create-exercise', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { question = "¿Cuál es la función principal del corazón?" } = req.body as { question?: string };

    logger.info('=== DEBUG: Starting test exercise creation ===');
    logger.info(`Question to process: "${question}"`);

    // Create a test processing job
    const job = await prisma.processingJob.create({
      data: {
        type: 'DEBUG_TEST',
        status: 'RUNNING',
        totalItems: 1,
        inputData: {
          question: question,
          testMode: true
        },
        startedAt: new Date()
      }
    });

    logger.info(`=== DEBUG: Created test job ${job.id} ===`);

    // Import and test ExerciseFactory
    try {
      const { ExerciseFactoryService } = await import('../services/exercise-factory.service');
      logger.info('=== DEBUG: ExerciseFactoryService imported successfully ===');

      const exerciseFactory = new ExerciseFactoryService();
      logger.info('=== DEBUG: ExerciseFactoryService instantiated successfully ===');

      // Call processQuestionsBatch directly
      logger.info('=== DEBUG: About to call processQuestionsBatch ===');
      await exerciseFactory.processQuestionsBatch([question], 'Debug Test', 'debug-user', job.id);
      logger.info('=== DEBUG: processQuestionsBatch completed ===');

    } catch (serviceError) {
      logger.error('=== DEBUG: Error with ExerciseFactoryService ===', serviceError);
      throw serviceError;
    }

    return res.json({
      success: true,
      message: 'Debug exercise processing completed',
      jobId: job.id,
      question: question
    });

  } catch (error) {
    logger.error('=== DEBUG: Error in test exercise creation ===', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Get processing jobs only
router.get('/processing-jobs-only', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const jobs = await prisma.processingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Convert BigInt values to regular numbers for JSON serialization
    const safeJobs = jobs.map(job => ({
      ...job,
      totalItems: Number(job.totalItems),
      processedItems: Number(job.processedItems)
    }));

    return res.json({
      success: true,
      jobsCount: safeJobs.length,
      jobs: safeJobs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting processing jobs:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get exercise factory data summary
router.get('/exercise-factory-data', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const [recentJobs, recentBaseQuestions] = await Promise.all([
      prisma.processingJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.baseQuestion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const summary = {
      recentJobsCount: recentJobs.length,
      baseQuestionsCount: recentBaseQuestions.length
    };

    return res.json({
      success: true,
      summary,
      recentJobs,
      recentBaseQuestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting exercise factory data:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as debugRoutes };