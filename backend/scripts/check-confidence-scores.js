require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConfidenceScores() {
  console.log('🔍 Analizando confidence scores de variaciones activas...\n');

  try {
    // 1. Total de variaciones activas (visibles)
    const totalActive = await prisma.questionVariation.count({
      where: { isVisible: true }
    });

    console.log(`📊 Total variaciones activas: ${totalActive}`);

    // 2. Variaciones activas con resultados de QA
    const activeWithQA = await prisma.$queryRaw`
      SELECT
        v.id as variation_id,
        v.display_code,
        v.version,
        r.confidence_score,
        r.created_at
      FROM question_variations v
      INNER JOIN qa_sweep_2_results r ON v.id = r.variation_id
      WHERE v.is_visible = true
      ORDER BY r.confidence_score ASC
      LIMIT 20
    `;

    console.log(`\n✅ Variaciones activas con QA analizadas: ${activeWithQA.length}`);

    if (activeWithQA.length > 0) {
      console.log('\n📋 Primeras 20 variaciones con scores más bajos:');
      console.log('Display Code\tVersion\tConfidence\tFecha QA');
      console.log('─'.repeat(60));

      activeWithQA.forEach(v => {
        const score = (v.confidence_score * 100).toFixed(1);
        const date = new Date(v.created_at).toLocaleDateString();
        console.log(`${v.display_code}\t\tv${v.version}\t${score}%\t\t${date}`);
      });
    }

    // 3. Estadísticas por categoría de confidence
    const stats = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN r.confidence_score IS NULL THEN 'Nunca analizada'
          WHEN r.confidence_score < 0.34 THEN 'Baja (0-33%)'
          WHEN r.confidence_score < 0.67 THEN 'Media (34-66%)'
          ELSE 'Alta (67-100%)'
        END as categoria,
        COUNT(*)::text as cantidad
      FROM question_variations v
      LEFT JOIN qa_sweep_2_results r ON v.id = r.variation_id
      WHERE v.is_visible = true
      GROUP BY categoria
      ORDER BY
        CASE
          WHEN r.confidence_score IS NULL THEN 0
          WHEN r.confidence_score < 0.34 THEN 1
          WHEN r.confidence_score < 0.67 THEN 2
          ELSE 3
        END
    `;

    console.log('\n📊 Distribución de Confidence Scores (variaciones activas):');
    console.log('─'.repeat(50));

    let total = 0;
    stats.forEach(s => {
      const count = parseInt(s.cantidad);
      total += count;
      const percentage = ((count / totalActive) * 100).toFixed(1);
      console.log(`${s.categoria.padEnd(20)} ${count.toString().padStart(6)} (${percentage}%)`);
    });
    console.log('─'.repeat(50));
    console.log(`${'TOTAL'.padEnd(20)} ${total.toString().padStart(6)} (100%)`);

    // 4. Variaciones activas SIN análisis de QA
    const neverAnalyzed = await prisma.$queryRaw`
      SELECT COUNT(*)::text as count
      FROM question_variations v
      LEFT JOIN qa_sweep_2_results r ON v.id = r.variation_id
      WHERE v.is_visible = true AND r.id IS NULL
    `;

    const neverCount = parseInt(neverAnalyzed[0]?.count || '0');
    console.log(`\n⚠️  Variaciones activas nunca analizadas: ${neverCount}`);

    // 5. Total en qa_sweep_2_results
    const totalQAResults = await prisma.qASweep2Result.count();
    console.log(`\n📦 Total de análisis en QA Sweep 2: ${totalQAResults}`);

    // 6. Recomendación
    console.log('\n💡 Recomendaciones:');
    if (neverCount > totalActive * 0.5) {
      console.log('   ⚠️  Más del 50% nunca fue analizado. Ejecuta QA Sweep en todos los ejercicios.');
    }

    const lowConfidence = stats.find(s => s.categoria.includes('Baja'));
    if (lowConfidence && parseInt(lowConfidence.cantidad) > 0) {
      console.log(`   🔧 Hay ${lowConfidence.cantidad} variaciones con baja confianza que deberían mejorarse.`);
    }

    const highConfidence = stats.find(s => s.categoria.includes('Alta'));
    if (highConfidence && parseInt(highConfidence.cantidad) > 0) {
      console.log(`   ✅ Hay ${highConfidence.cantidad} variaciones con alta confianza (67-100%).`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkConfidenceScores()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
