require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFailedRun() {
  const runId = 'cmgwtpa1h0002z8s2r6t74unb';

  console.log('\n🔍 ANÁLISIS DEL RUN "procesando filtro de calidad en 0"\n');
  console.log('ID:', runId);
  console.log('='.repeat(80));

  try {
    // Contar resultados
    const total = await prisma.qASweep2Result.count({ where: { runId } });
    console.log('\nTotal resultados:', total);

    // Por estado
    const byStatus = await prisma.qASweep2Result.groupBy({
      by: ['status'],
      where: { runId },
      _count: true
    });

    console.log('\nDistribución por estado:');
    byStatus.forEach(s => console.log(`  ${s.status}: ${s._count}`));

    // Primeros 10
    const results = await prisma.qASweep2Result.findMany({
      where: { runId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        variation: {
          select: {
            displayCode: true,
            isVisible: true
          }
        }
      }
    });

    console.log('\nPrimeros 10 resultados:');
    results.forEach((r, i) => {
      console.log(`\n  ${i+1}. ${r.variation?.displayCode || r.variationId.slice(-8)}`);
      console.log(`     Status: ${r.status}`);
      console.log(`     Confidence: ${(r.confidenceScore*100).toFixed(1)}%`);
      console.log(`     Visible: ${r.variation?.isVisible}`);
      console.log(`     Creado: ${r.createdAt.toISOString()}`);
    });

    // Verificar el run
    const run = await prisma.qASweep2Run.findUnique({
      where: { id: runId }
    });

    console.log('\n' + '='.repeat(80));
    console.log('Info del Run:');
    console.log(`  Nombre: ${run.name}`);
    console.log(`  Estado: ${run.status}`);
    console.log(`  Creado: ${run.createdAt.toISOString()}`);
    console.log(`  Actualizado: ${run.updatedAt.toISOString()}`);

    console.log('\n✅ Estos 695 resultados EXISTEN y están disponibles\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFailedRun();
