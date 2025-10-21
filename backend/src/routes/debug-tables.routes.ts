import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// Debug endpoint to list all tables
router.get('/tables', authenticate, async (req, res) => {
  try {
    // Get all table names from PostgreSQL
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    return res.status(200).json({
      success: true,
      tables: tables,
      message: "Lista de todas las tablas en la base de datos"
    });
  } catch (error: any) {
    console.error('Error listing tables:', error);
    return res.status(500).json({
      success: false,
      message: `Error al listar tablas: ${error.message}`
    });
  }
});

export default router;

// Debug endpoint to check base_questions content
router.get('/base-questions', authenticate, async (req, res) => {
  try {
    const baseQuestions = await prisma.$queryRaw`
      SELECT id, content, status, "createdAt"
      FROM "base_questions" 
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    return res.status(200).json({
      success: true,
      baseQuestions: baseQuestions,
      count: (baseQuestions as any[]).length,
      message: "Contenido de la tabla base_questions"
    });
  } catch (error: any) {
    console.error('Error checking base_questions:', error);
    return res.status(500).json({
      success: false,
      message: `Error al consultar base_questions: ${error.message}`
    });
  }
});

// Simple debug endpoint to test generated-questions logic
router.get('/test-generated-questions', authenticate, async (req, res) => {
  try {
    console.log('Testing generated-questions logic...');
    
    // Step 1: Test basic query
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
      LIMIT 10 OFFSET 0
    `;

    console.log('Step 1 - Base questions:', questionsWithNumbers);

    // Step 2: Test count query
    const totalCount = await prisma.$queryRaw`
      SELECT COUNT(*)::integer as count
      FROM "base_questions"
      WHERE status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
    `;

    console.log('Step 2 - Total count:', totalCount);

    // Step 3: Test variations query for first question
    if ((questionsWithNumbers as any[]).length > 0) {
      const firstQuestion = (questionsWithNumbers as any[])[0];
      const variations = await prisma.$queryRaw`
        SELECT id, content, "variationNumber", difficulty
        FROM "question_variations"
        WHERE "baseQuestionId" = ${firstQuestion.id}
        ORDER BY "variationNumber" ASC
      `;
      
      console.log('Step 3 - Variations for first question:', variations);
    }

    return res.status(200).json({
      success: true,
      debug: {
        questionsCount: (questionsWithNumbers as any[]).length,
        totalCount: (totalCount as any[])[0]?.count || 0,
        questions: questionsWithNumbers
      }
    });

  } catch (error: any) {
    console.error('Debug test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint to check question_variations structure
router.get('/variations-structure', authenticate, async (req, res) => {
  try {
    const variations = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'question_variations'
      ORDER BY ordinal_position
    `;

    const sampleData = await prisma.$queryRaw`
      SELECT * FROM "question_variations" LIMIT 3
    `;

    return res.status(200).json({
      success: true,
      structure: variations,
      sampleData: sampleData,
      message: "Estructura de la tabla question_variations"
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});
