const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStats() {
  console.log('\n📊 REPORTE DE ESTADO DE EJERCICIOS\n');

  try {
    // 1. Total activas
    const totalActive = await prisma.questionVariation.count({
      where: { isVisible: true }
    });
    console.log('Total variaciones activas:', totalActive);

    // 2. Distribución
    const dist = await prisma.$queryRaw`
      SELECT
        CASE
          WHEN confidence_score IS NULL THEN 'Sin score'
          WHEN confidence_score = 0 THEN 'Perfecta (0%)'
          WHEN confidence_score < 0.34 THEN 'Baja (1-33%)'
          WHEN confidence_score < 0.67 THEN 'Media (34-66%)'
          ELSE 'Alta (67-100%)'
        END as cat,
        COUNT(*)::int as cant
      FROM question_variations
      WHERE is_visible = true
      GROUP BY cat
      ORDER BY cant DESC
    `;

    console.log('\nDistribución por confidence:');
    dist.forEach(r => console.log(`  ${r.cat}: ${r.cant}`));

    // 3. QA Stats
    const qa = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int as total,
        COUNT(DISTINCT "variationId")::int as unicas,
        SUM(tokens_in)::int as tin,
        SUM(tokens_out)::int as tout
      FROM qa_sweep_2_results
    `;

    console.log('\nQA Sweep 2.0:');
    console.log(`  Total análisis: ${qa[0].total}`);
    console.log(`  Variaciones únicas: ${qa[0].unicas}`);
    console.log(`  Tokens: ${(qa[0].tin + qa[0].tout).toLocaleString()}`);

    // 4. Runs recientes
    const runs = await prisma.qASweep2Run.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: { name: true, status: true, createdAt: true }
    });

    console.log('\nÚltimos 3 runs:');
    runs.forEach(r => console.log(`  ${r.status} - ${r.name}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStats();
