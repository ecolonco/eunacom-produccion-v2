import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

// DELETE /api/admin-cleanup/all-exercises - Delete ALL exercises and variations
router.delete('/all-exercises', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow admin users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden realizar limpieza completa'
      });
    }

    logger.info('🧹 ADMIN CLEANUP: Starting complete exercise deletion');

    // Delete in correct order to avoid foreign key constraints
    const deletionResults = {
      alternatives: 0,
      variations: 0,
      aiAnalysis: 0,
      baseQuestions: 0,
      regularQuestions: 0,
      processingJobs: 0
    };

    // 1. Delete alternatives
    const alternativesResult = await prisma.alternative.deleteMany({});
    deletionResults.alternatives = alternativesResult.count;
    logger.info(`🗑️ Deleted ${alternativesResult.count} alternatives`);

    // 2. Delete question variations
    const variationsResult = await prisma.questionVariation.deleteMany({});
    deletionResults.variations = variationsResult.count;
    logger.info(`🗑️ Deleted ${variationsResult.count} question variations`);

    // 3. Delete AI analysis
    const aiAnalysisResult = await prisma.aIAnalysis.deleteMany({});
    deletionResults.aiAnalysis = aiAnalysisResult.count;
    logger.info(`🗑️ Deleted ${aiAnalysisResult.count} AI analysis records`);

    // 4. Delete base questions (Exercise Factory)
    const baseQuestionsResult = await prisma.baseQuestion.deleteMany({});
    deletionResults.baseQuestions = baseQuestionsResult.count;
    logger.info(`🗑️ Deleted ${baseQuestionsResult.count} base questions`);

    // 5. Delete regular questions (if any)
    const regularQuestionsResult = await prisma.question.deleteMany({});
    deletionResults.regularQuestions = regularQuestionsResult.count;
    logger.info(`🗑️ Deleted ${regularQuestionsResult.count} regular questions`);

    // 6. Delete processing jobs
    const jobsResult = await prisma.processingJob.deleteMany({});
    deletionResults.processingJobs = jobsResult.count;
    logger.info(`🗑️ Deleted ${jobsResult.count} processing jobs`);

    logger.info('✅ ADMIN CLEANUP: Complete exercise deletion finished successfully');

    res.json({
      success: true,
      message: 'Limpieza completa realizada exitosamente',
      data: deletionResults
    });

  } catch (error: any) {
    logger.error('❌ ADMIN CLEANUP: Error during complete deletion:', error);
    res.status(500).json({
      success: false,
      message: `Error durante la limpieza: ${error.message}`,
      error: error.message
    });
  }
});

// DELETE /api/admin-cleanup/taxonomy-safe - Delete taxonomy safely (topics first, then empty specialties)
router.delete('/taxonomy-safe', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow admin users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden realizar limpieza de taxonomía'
      });
    }

    logger.info('🧹 ADMIN CLEANUP: Starting safe taxonomy deletion');

    const deletionResults = {
      topics: 0,
      specialties: 0
    };

    // 1. Delete all topics first
    const topicsResult = await prisma.topic.deleteMany({});
    deletionResults.topics = topicsResult.count;
    logger.info(`🗑️ Deleted ${topicsResult.count} topics`);

    // 2. Delete specialties that have no children
    const specialtiesResult = await prisma.specialty.deleteMany({
      where: {
        children: {
          none: {}
        }
      }
    });
    deletionResults.specialties = specialtiesResult.count;
    logger.info(`🗑️ Deleted ${specialtiesResult.count} childless specialties`);

    // 3. Try to delete remaining specialties (parent specialties)
    const remainingSpecialtiesResult = await prisma.specialty.deleteMany({});
    deletionResults.specialties += remainingSpecialtiesResult.count;
    logger.info(`🗑️ Deleted ${remainingSpecialtiesResult.count} remaining specialties`);

    logger.info('✅ ADMIN CLEANUP: Safe taxonomy deletion finished');

    res.json({
      success: true,
      message: 'Limpieza de taxonomía realizada exitosamente',
      data: deletionResults
    });

  } catch (error: any) {
    logger.error('❌ ADMIN CLEANUP: Error during taxonomy deletion:', error);
    res.status(500).json({
      success: false,
      message: `Error durante la limpieza de taxonomía: ${error.message}`,
      error: error.message
    });
  }
});

// POST /api/admin-cleanup/reset-sequences - Reset database sequences
router.post('/reset-sequences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow admin users
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden resetear secuencias'
      });
    }

    logger.info('🔄 ADMIN CLEANUP: Resetting database sequences');

    // Reset sequences for clean numbering
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS base_questions_id_seq RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS question_variations_id_seq RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS alternatives_id_seq RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS specialties_id_seq RESTART WITH 1`;
    await prisma.$executeRaw`ALTER SEQUENCE IF EXISTS topics_id_seq RESTART WITH 1`;

    logger.info('✅ ADMIN CLEANUP: Database sequences reset successfully');

    res.json({
      success: true,
      message: 'Secuencias de base de datos reseteadas exitosamente'
    });

  } catch (error: any) {
    logger.error('❌ ADMIN CLEANUP: Error resetting sequences:', error);
    res.status(500).json({
      success: false,
      message: `Error reseteando secuencias: ${error.message}`,
      error: error.message
    });
  }
});

export default router;
