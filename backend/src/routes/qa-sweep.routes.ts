import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// QA Sweep endpoint
router.post('/run', authenticate, async (req, res) => {
  try {
    const { from, to, apply = false, useLLM = true, concurrency = 4 } = req.body;

    // Validate input
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros "from" y "to" son requeridos'
      });
    }

    const fromNum = parseInt(from);
    const toNum = parseInt(to);

    if (isNaN(fromNum) || isNaN(toNum) || fromNum > toNum) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros "from" y "to" deben ser números válidos y from <= to'
      });
    }

    // Get exercises from database using sequence numbers
    const exercises = await prisma.$queryRaw`
      WITH numbered_questions AS (
        SELECT 
          id,
          content,
          "createdAt",
          ROW_NUMBER() OVER (ORDER BY "createdAt" ASC)::integer as sequence_number
        FROM "base_questions"
        WHERE status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
      )
      SELECT * FROM numbered_questions 
      WHERE sequence_number BETWEEN ${fromNum} AND ${toNum}
    `;

    if (!exercises || (exercises as any[]).length === 0) {
      return res.status(404).json({
        success: false,
        message: `No se encontraron ejercicios en el rango ${from}-${to}`
      });
    }

    // Process each exercise through QA
    const results: any[] = [];
    let accepted = 0;
    let fixed = 0;
    let rejected = 0;

    for (const exercise of exercises as any[]) {
      const qaResult = await processExerciseQA(exercise, useLLM);
      results.push(qaResult);

      // Count results
      switch (qaResult.status) {
        case 'accepted':
          accepted++;
          break;
        case 'fixed':
          fixed++;
          break;
        case 'rejected':
          rejected++;
          break;
      }

      // If apply is true, save the changes to database
      if (apply && qaResult.status === 'fixed' && qaResult.fixedContent) {
        await prisma.baseQuestion.update({
          where: { id: exercise.id },
          data: { content: qaResult.fixedContent }
        });
      }
    }

    // Return results
    res.json({
      success: true,
      range: { from, to },
      apply,
      total: results.length,
      accepted,
      fixed,
      rejected,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('QA Sweep Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Function to process individual exercise through QA
async function processExerciseQA(exercise: any, useLLM: boolean) {
  const issues: string[] = [];
  const notes: string[] = [];
  let status: 'accepted' | 'fixed' | 'rejected' = 'accepted';
  let fixedContent = null;

  try {
    // Get variations for this base question (THIS IS WHAT WE SHOULD ANALYZE)
    const variations = await prisma.$queryRaw`
      SELECT id, content, variation_number, difficulty, explanation
      FROM "question_variations"
      WHERE base_question_id = ${exercise.id}
      ORDER BY variation_number ASC
    `;

    if (!variations || (variations as any[]).length === 0) {
      return {
        id: exercise.sequence_number || exercise.id,
        exerciseId: exercise.id,
        status: 'rejected' as const,
        issues: ['No se encontraron variaciones para este ejercicio'],
        notes: ['El ejercicio base debe tener variaciones generadas'],
        fixedContent: null,
        originalContent: exercise.content
      };
    }

    // Analyze each variation (NOT the base question)
    let totalVariations = (variations as any[]).length;
    let acceptedVariations = 0;
    let rejectedVariations = 0;

    for (const variation of variations as any[]) {
      const variationResult = await runVariationHeuristicChecks(variation);
      
      if (variationResult.issues.length === 0) {
        acceptedVariations++;
      } else {
        rejectedVariations++;
        issues.push(`Variación #${variation.variation_number}: ${variationResult.issues.join(', ')}`);
      }
      
      notes.push(...variationResult.notes.map(note => `Variación #${variation.variation_number}: ${note}`));
    }

    // Determine overall status based on variations quality
    if (rejectedVariations === 0) {
      status = 'accepted';
      notes.push(`✅ Todas las ${totalVariations} variaciones cumplen estándares de calidad`);
    } else if (rejectedVariations < totalVariations / 2) {
      status = 'fixed';
      notes.push(`⚠️ ${acceptedVariations}/${totalVariations} variaciones aceptables`);
    } else {
      status = 'rejected';
      notes.push(`❌ Demasiadas variaciones con problemas: ${rejectedVariations}/${totalVariations}`);
    }

    return {
      id: exercise.sequence_number || exercise.id,
      exerciseId: exercise.id,
      status,
      issues,
      notes,
      fixedContent,
      originalContent: exercise.content,
      variationsAnalyzed: totalVariations
    };

  } catch (error: any) {
    return {
      id: exercise.sequence_number || exercise.id,
      exerciseId: exercise.id,
      status: 'rejected' as const,
      issues: ['Error al procesar el ejercicio'],
      notes: [`Error: ${error.message}`],
      fixedContent: null,
      originalContent: null
    };
  }
}

// Heuristic checks for variations (the actual QA target)
async function runVariationHeuristicChecks(variation: any) {
  const issues: string[] = [];
  const notes: string[] = [];
  let fixedContent = null;

  // Check variation content
  if (!variation.content || variation.content.trim() === '') {
    issues.push('Variación sin contenido');
  } else {
    // Check if it's a proper medical question
    if (variation.content.length < 50) {
      issues.push('Contenido demasiado corto');
    }
    
    // Check if it has question mark
    if (!variation.content.includes('?')) {
      issues.push('No tiene pregunta clara');
    }
    
    // Check for medical context
    const medicalKeywords = ['años', 'paciente', 'presenta', 'consulta', 'examen', 'diagnóstico', 'tratamiento', 'mg/dl', 'síntomas', 'historia', 'clínica'];
    const hasContext = medicalKeywords.some(keyword => variation.content.toLowerCase().includes(keyword.toLowerCase()));
    if (!hasContext) {
      issues.push('Falta contexto médico claro');
    }
  }

  // Check explanation
  if (!variation.explanation || variation.explanation.trim() === '') {
    issues.push('Falta explicación');
  } else {
    if (variation.explanation.length < 30) {
      issues.push('Explicación demasiado corta');
    }
    notes.push('Explicación presente');
  }

  // Check difficulty level
  if (!variation.difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(variation.difficulty)) {
    issues.push('Nivel de dificultad inválido');
  } else {
    notes.push(`Dificultad: ${variation.difficulty}`);
  }

  // Check alternatives (NOW IMPLEMENTED!)
  try {
    const alternatives = await prisma.$queryRaw`
      SELECT id, text, is_correct, "order"
      FROM "alternatives"
      WHERE variation_id = ${variation.id}
      ORDER BY "order" ASC
    `;

    const altArray = alternatives as any[];
    
    if (!altArray || altArray.length === 0) {
      issues.push('No tiene alternativas');
    } else {
      // Check quantity (should be 4-5 alternatives)
      if (altArray.length < 3) {
        issues.push('Muy pocas alternativas');
      } else if (altArray.length > 6) {
        issues.push('Demasiadas alternativas');
      } else {
        notes.push(`${altArray.length} alternativas`);
      }

      // Check correct answers
      const correctAlts = altArray.filter(alt => alt.is_correct);
      if (correctAlts.length === 0) {
        issues.push('No hay alternativa correcta');
      } else if (correctAlts.length > 1) {
        issues.push('Múltiples alternativas correctas');
      } else {
        notes.push('Una alternativa correcta marcada');
      }

      // Check for empty alternatives
      const emptyAlts = altArray.filter(alt => !alt.text || alt.text.trim() === '');
      if (emptyAlts.length > 0) {
        issues.push('Alternativas vacías detectadas');
      }

      // Check minimum length for alternatives
      const shortAlts = altArray.filter(alt => alt.text && alt.text.trim().length < 5);
      if (shortAlts.length > 0) {
        issues.push('Alternativas demasiado cortas');
      }

      if (issues.filter(i => i.includes('alternativa')).length === 0) {
        notes.push('Alternativas verificadas correctamente');
      }
    }
  } catch (error) {
    issues.push('Error al verificar alternativas');
    notes.push(`Error alternativas: ${(error as any).message}`);
  }

  // If no issues found, it's accepted
  if (issues.length === 0) {
    notes.push('Variación cumple estándares de calidad');
  }

  return {
    issues,
    notes,
    fixedContent
  };
}

// Basic heuristic checks (DEPRECATED - now we analyze variations)
function runHeuristicChecks(content: string) {
  const issues: string[] = [];
  const notes: string[] = [];
  let fixedContent = null;

  // Check if content (base question) exists and has substance
  if (!content || content.trim() === '') {
    issues.push('Falta la pregunta principal');
  } else {
    // Check if it's a proper medical question
    if (content.length < 20) {
      issues.push('La pregunta es demasiado corta');
    }
    
    // Check if it ends with a question mark
    if (!content.includes('?')) {
      issues.push('La pregunta no tiene signo de interrogación');
    }
    
    // Check for medical context
    const medicalKeywords = ['años', 'paciente', 'presenta', 'consulta', 'examen', 'diagnóstico', 'tratamiento', 'mg/dl', 'síntomas'];
    const hasContext = medicalKeywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
    if (!hasContext) {
      issues.push('La pregunta no parece tener contexto médico claro');
    }
  }

  // Automatic fixes for negative consignas
  if (content && (content.includes('NO debe') || content.includes('no debe') || content.includes('NO es'))) {
    issues.push('Consigna negativa detectada');
    notes.push('Se recomienda reformular la pregunta en positivo');
  }

  // Check for common quality issues
  if (content && content.includes('¿Cuál será la actitud correcta?')) {
    notes.push('Pregunta con formato estándar EUNACOM');
  }

  // If no issues found, it's accepted
  if (issues.length === 0) {
    notes.push('Pregunta base cumple estándares de calidad');
    notes.push('Las variaciones y alternativas se verifican por separado');
  }

  return {
    issues,
    notes,
    fixedContent
  };
}

export default router;
