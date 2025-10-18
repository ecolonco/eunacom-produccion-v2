require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Calcula el confidence score basado en el scorecard de la evaluación
 */
function calculateConfidenceScore(evaluation) {
  if (!evaluation || !evaluation.scorecard) return 0;

  const scores = Object.values(evaluation.scorecard);
  const maxScore = Math.max(...scores);

  // Invertir el score (0 = alta confianza, 3 = baja confianza)
  return Math.max(0, 1 - (maxScore / 3));
}

/**
 * Calcula el confidence score mejorado después de aplicar correcciones
 */
function calculateImprovedConfidence(severityGlobal) {
  const confidenceMap = {
    0: 1.0,   // Perfecto
    1: 0.85,  // Correcciones leves
    2: 0.75,  // Correcciones moderadas
    3: 0.60   // Correcciones graves
  };

  return confidenceMap[severityGlobal] ?? 0.70;
}

async function backfillConfidenceScores() {
  console.log('🔄 Iniciando backfill de confidence scores...\n');

  try {
    // PASO 1: Poblar scores de variaciones que fueron analizadas directamente
    console.log('📊 Paso 1: Variaciones con análisis QA directo...');

    const variationsWithQA = await prisma.$queryRaw`
      SELECT
        r."variationId" as variation_id,
        r.confidence_score,
        r."createdAt" as created_at
      FROM qa_sweep_2_results r
      INNER JOIN question_variations v ON v.id = r."variationId"
      WHERE v.confidence_score IS NULL
      ORDER BY r."createdAt" DESC
    `;

    console.log(`   Encontradas ${variationsWithQA.length} variaciones con QA sin score`);

    let updated1 = 0;
    for (const item of variationsWithQA) {
      await prisma.questionVariation.update({
        where: { id: item.variation_id },
        data: {
          confidenceScore: item.confidence_score,
          lastQADate: item.created_at
        }
      });
      updated1++;
    }

    console.log(`   ✅ Actualizadas ${updated1} variaciones con score directo\n`);

    // PASO 2: Poblar scores de variaciones corregidas (v2, v3, etc.)
    console.log('📊 Paso 2: Variaciones corregidas (heredan score mejorado)...');

    // Encontrar variaciones sin score que tienen parentVersionId (son versiones corregidas)
    const correctedVariations = await prisma.questionVariation.findMany({
      where: {
        confidenceScore: null,
        parentVersionId: { not: null }
      },
      select: {
        id: true,
        parentVersionId: true,
        version: true,
        displayCode: true
      }
    });

    console.log(`   Encontradas ${correctedVariations.length} variaciones corregidas sin score`);

    let updated2 = 0;
    let skipped = 0;

    for (const corrected of correctedVariations) {
      // Buscar el QA result de alguna versión anterior
      let qaResult = await prisma.qASweep2Result.findFirst({
        where: { variationId: corrected.parentVersionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!qaResult) {
        // Intentar buscar cualquier versión anterior de la misma baseQuestion
        const baseVariation = await prisma.questionVariation.findUnique({
          where: { id: corrected.id },
          select: { baseQuestionId: true, variationNumber: true }
        });

        if (baseVariation) {
          // Buscar v1 de esta variación
          const v1 = await prisma.questionVariation.findFirst({
            where: {
              baseQuestionId: baseVariation.baseQuestionId,
              variationNumber: baseVariation.variationNumber,
              version: 1
            }
          });

          if (v1) {
            qaResult = await prisma.qASweep2Result.findFirst({
              where: { variationId: v1.id },
              orderBy: { createdAt: 'desc' }
            });
          }
        }
      }

      if (qaResult && qaResult.diagnosis) {
        const diagnosis = qaResult.diagnosis;
        const severityGlobal = diagnosis.severidad_global ?? 1;
        const improvedScore = calculateImprovedConfidence(severityGlobal);

        await prisma.questionVariation.update({
          where: { id: corrected.id },
          data: {
            confidenceScore: improvedScore,
            lastQADate: qaResult.createdAt
          }
        });

        updated2++;
      } else {
        skipped++;
      }
    }

    console.log(`   ✅ Actualizadas ${updated2} variaciones corregidas`);
    console.log(`   ⚠️  Saltadas ${skipped} variaciones sin QA result disponible\n`);

    // RESUMEN FINAL
    console.log('📊 Resumen del backfill:');
    console.log(`   Variaciones con score directo: ${updated1}`);
    console.log(`   Variaciones con score heredado: ${updated2}`);
    console.log(`   Total actualizadas: ${updated1 + updated2}`);
    console.log(`   Saltadas: ${skipped}\n`);

    // Verificar estado final
    const stats = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN confidence_score IS NULL THEN 'Sin score'
          WHEN confidence_score < 0.34 THEN 'Baja (0-33%)'
          WHEN confidence_score < 0.67 THEN 'Media (34-66%)'
          ELSE 'Alta (67-100%)'
        END as categoria,
        COUNT(*)::text as cantidad
      FROM question_variations
      WHERE is_visible = true
      GROUP BY categoria
      ORDER BY categoria
    `;

    console.log('📈 Distribución final (solo variaciones activas):');
    stats.forEach(s => {
      console.log(`   ${s.categoria}: ${s.cantidad}`);
    });

    console.log('\n✅ Backfill completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillConfidenceScores()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
