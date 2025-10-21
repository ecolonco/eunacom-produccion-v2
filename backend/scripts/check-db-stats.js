require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStats() {
  console.log('\n📊 REPORTE COMPLETO DE ESTADO DE EJERCICIOS\n');
  console.log('='.repeat(80));

  try {
    // 1. Total de variaciones activas
    console.log('\n1️⃣  TOTAL VARIACIONES ACTIVAS');
    console.log('-'.repeat(80));
    const totalActive = await prisma.questionVariation.count({
      where: { isVisible: true }
    });
    console.log(`   Total: ${totalActive.toLocaleString()}`);

    // 2. Distribución por confidence score
    console.log('\n2️⃣  DISTRIBUCIÓN POR CONFIDENCE SCORE (solo activas)');
    console.log('-'.repeat(80));

    const distribution = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN confidence_score IS NULL THEN 'Sin score (nunca analizadas)'
          WHEN confidence_score = 0 THEN 'Perfecta (0% - sin errores)'
          WHEN confidence_score < 0.34 THEN 'Baja (1-33% - severidad alta)'
          WHEN confidence_score < 0.67 THEN 'Media (34-66% - severidad moderada)'
          ELSE 'Alta (67-100% - severidad leve o corregidas)'
        END as categoria,
        COUNT(*)::int as cantidad,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentaje
      FROM question_variations
      WHERE is_visible = true
      GROUP BY
        CASE
          WHEN confidence_score IS NULL THEN 'Sin score (nunca analizadas)'
          WHEN confidence_score = 0 THEN 'Perfecta (0% - sin errores)'
          WHEN confidence_score < 0.34 THEN 'Baja (1-33% - severidad alta)'
          WHEN confidence_score < 0.67 THEN 'Media (34-66% - severidad moderada)'
          ELSE 'Alta (67-100% - severidad leve o corregidas)'
        END
      ORDER BY cantidad DESC
    `;

    distribution.forEach(row => {
      console.log(`   ${row.categoria.padEnd(45)} ${row.cantidad.toString().padStart(6)} (${row.porcentaje}%)`);
    });

    // 3. Estadísticas de QA Sweep 2.0
    console.log('\n3️⃣  ESTADÍSTICAS QA SWEEP 2.0');
    console.log('-'.repeat(80));

    const qaStats = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT r.id)::int as total_analisis,
        COUNT(DISTINCT r."variationId")::int as variaciones_unicas_analizadas,
        COUNT(DISTINCT CASE WHEN r.status = 'APPLIED' THEN r.id END)::int as correcciones_aplicadas,
        ROUND(AVG(r.confidence_score)::numeric, 4) as confidence_promedio,
        SUM(r.tokens_in)::int as total_tokens_in,
        SUM(r.tokens_out)::int as total_tokens_out
      FROM qa_sweep_2_results r
    `;

    const stats = qaStats[0];
    console.log(`   Total análisis realizados:        ${stats.total_analisis?.toLocaleString() || 0}`);
    console.log(`   Variaciones únicas analizadas:    ${stats.variaciones_unicas_analizadas?.toLocaleString() || 0}`);
    console.log(`   Correcciones aplicadas:           ${stats.correcciones_aplicadas?.toLocaleString() || 0}`);
    console.log(`   Confidence score promedio:        ${stats.confidence_promedio || 0}`);
    console.log(`   Total tokens input:               ${stats.total_tokens_in?.toLocaleString() || 0}`);
    console.log(`   Total tokens output:              ${stats.total_tokens_out?.toLocaleString() || 0}`);
    console.log(`   Total tokens:                     ${((stats.total_tokens_in || 0) + (stats.total_tokens_out || 0)).toLocaleString()}`);

    // 4. Runs de QA Sweep 2.0
    console.log('\n4️⃣  RUNS QA SWEEP 2.0 (por estado)');
    console.log('-'.repeat(80));

    const runsByStatus = await prisma.qASweep2Run.groupBy({
      by: ['status'],
      _count: true
    });

    const statusOrder = { RUNNING: 1, PENDING: 2, COMPLETED: 3, FAILED: 4 };
    runsByStatus
      .sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99))
      .forEach(row => {
        const emoji = {
          RUNNING: '🔄',
          PENDING: '⏳',
          COMPLETED: '✅',
          FAILED: '❌'
        }[row.status] || '❓';
        console.log(`   ${emoji} ${row.status.padEnd(15)} ${row._count}`);
      });

    // 5. Últimos 5 runs
    console.log('\n5️⃣  ÚLTIMOS 5 RUNS CREADOS');
    console.log('-'.repeat(80));

    const recentRuns = await prisma.qASweep2Run.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { results: true }
        }
      }
    });

    recentRuns.forEach((run, idx) => {
      const emoji = {
        RUNNING: '🔄',
        PENDING: '⏳',
        COMPLETED: '✅',
        FAILED: '❌'
      }[run.status] || '❓';

      console.log(`\n   ${idx + 1}. ${run.name}`);
      console.log(`      Estado: ${emoji} ${run.status}`);
      console.log(`      Resultados: ${run._count.results}`);
      console.log(`      Creado: ${run.createdAt.toLocaleString('es-CL')}`);
    });

    // 6. Resumen de calidad
    console.log('\n6️⃣  RESUMEN DE CALIDAD');
    console.log('-'.repeat(80));

    const needsReview = await prisma.questionVariation.count({
      where: {
        isVisible: true,
        OR: [
          { confidenceScore: null },
          { confidenceScore: { lt: 0.34 } }
        ]
      }
    });

    const goodQuality = await prisma.questionVariation.count({
      where: {
        isVisible: true,
        confidenceScore: { gte: 0.67 }
      }
    });

    console.log(`   ⚠️  Variaciones que necesitan revisión (sin score o baja): ${needsReview.toLocaleString()}`);
    console.log(`   ✅ Variaciones de buena calidad (≥67%):                    ${goodQuality.toLocaleString()}`);
    console.log(`   📊 Porcentaje de cobertura QA:                             ${((totalActive - needsReview) / totalActive * 100).toFixed(2)}%`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Reporte completado\n');

  } catch (error) {
    console.error('❌ Error al generar reporte:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStats()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
