require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRun26() {
  console.log('\n🔍 DIAGNÓSTICO RUN #26\n');
  console.log('='.repeat(80));

  try {
    // 1. Buscar runs con nombre que contenga "160" o "sin score"
    const matchingRuns = await prisma.qASweep2Run.findMany({
      where: {
        OR: [
          { name: { contains: '160', mode: 'insensitive' } },
          { name: { contains: 'sin score', mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { results: true }
        }
      }
    });

    console.log('\n📋 Runs que matchean "160" o "sin score":');
    matchingRuns.forEach((run, idx) => {
      console.log(`\n  ${idx + 1}. Run ID: ${run.id}`);
      console.log(`     Nombre: ${run.name}`);
      console.log(`     Estado: ${run.status}`);
      console.log(`     Resultados: ${run._count.results}`);
      console.log(`     Creado: ${run.createdAt.toISOString()}`);
    });

    // 2. Si encontramos el run #26, mostrar detalles
    if (matchingRuns.length > 0) {
      const latestRun = matchingRuns[0];

      console.log('\n\n🔍 DETALLE DEL RUN MÁS RECIENTE:');
      console.log('='.repeat(80));
      console.log(`ID: ${latestRun.id}`);
      console.log(`Nombre: ${latestRun.name}`);
      console.log(`Estado: ${latestRun.status}`);
      console.log(`Total Resultados: ${latestRun._count.results}`);

      // Obtener primeros 10 resultados
      const results = await prisma.qASweep2Result.findMany({
        where: { runId: latestRun.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          variation: {
            select: {
              displayCode: true,
              isVisible: true
            }
          }
        }
      });

      console.log(`\n📊 Primeros ${Math.min(10, results.length)} resultados:`);
      results.forEach((r, idx) => {
        console.log(`\n  ${idx + 1}. ${r.variation?.displayCode || r.variationId.slice(-8)}`);
        console.log(`     Status: ${r.status}`);
        console.log(`     Confidence: ${(r.confidenceScore * 100).toFixed(1)}%`);
        console.log(`     Creado: ${r.createdAt.toISOString()}`);
      });

      // Verificar si hay resultados pero no se están retornando
      console.log('\n\n🔍 ANÁLISIS DE PAGINACIÓN:');
      console.log('='.repeat(80));

      // Simular la query del endpoint con paginación
      const page = 1;
      const limit = 25;
      const offset = (page - 1) * limit;

      const paginatedResults = await prisma.qASweep2Result.findMany({
        where: { runId: latestRun.id },
        skip: offset,
        take: limit,
        include: {
          variation: {
            select: {
              displayCode: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`Página ${page}, Límite ${limit}, Offset ${offset}`);
      console.log(`Resultados retornados: ${paginatedResults.length}`);
      console.log(`Total en BD: ${latestRun._count.results}`);

      if (paginatedResults.length === 0 && latestRun._count.results > 0) {
        console.log('\n⚠️  PROBLEMA DETECTADO: Hay resultados en BD pero la paginación retorna 0!');
      } else if (paginatedResults.length > 0) {
        console.log('✅ La paginación funciona correctamente');
      }
    } else {
      console.log('\n⚠️  No se encontraron runs con "160" o "sin score" en el nombre');

      // Mostrar últimos 5 runs para referencia
      const recentRuns = await prisma.qASweep2Run.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { results: true }
          }
        }
      });

      console.log('\n📋 Últimos 5 runs en la base de datos:');
      recentRuns.forEach((run, idx) => {
        console.log(`\n  ${idx + 1}. ${run.name}`);
        console.log(`     ID: ${run.id}`);
        console.log(`     Estado: ${run.status}`);
        console.log(`     Resultados: ${run._count.results}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Diagnóstico completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkRun26()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
