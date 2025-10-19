require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseRun26() {
  console.log('\n🔍 DIAGNÓSTICO RUN #26\n');
  console.log('='.repeat(80));

  try {
    // 1. Buscar el run con "160" en el nombre
    console.log('\n1️⃣  Buscando run con "160" en el nombre...');

    const run26 = await prisma.qASweep2Run.findFirst({
      where: {
        name: {
          contains: '160',
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { results: true }
        }
      }
    });

    if (!run26) {
      console.log('⚠️  No se encontró ningún run con "160" en el nombre');

      // Mostrar últimos 5 runs
      const recentRuns = await prisma.qASweep2Run.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { results: true }
          }
        }
      });

      console.log('\n📋 Últimos 5 runs:');
      recentRuns.forEach((run, idx) => {
        console.log(`\n${idx + 1}. ${run.name}`);
        console.log(`   ID: ${run.id}`);
        console.log(`   Estado: ${run.status}`);
        console.log(`   Resultados: ${run._count.results}`);
      });

      return;
    }

    console.log('\n✅ Run encontrado:');
    console.log(`   ID: ${run26.id}`);
    console.log(`   Nombre: ${run26.name}`);
    console.log(`   Estado: ${run26.status}`);
    console.log(`   Total resultados: ${run26._count.results}`);
    console.log(`   Creado: ${run26.createdAt.toISOString()}`);

    // 2. Verificar cuántos resultados hay realmente
    console.log('\n2️⃣  Contando resultados...');
    const totalResults = await prisma.qASweep2Result.count({
      where: { runId: run26.id }
    });
    console.log(`   Total en BD: ${totalResults}`);

    if (totalResults === 0) {
      console.log('\n⚠️  NO HAY RESULTADOS para este run');
      console.log('   El worker aún no ha procesado ninguna variación');
      console.log('   O el run fue cancelado antes de procesar');
      return;
    }

    // 3. Obtener primeros 10 resultados
    console.log('\n3️⃣  Primeros 10 resultados:');
    const results = await prisma.qASweep2Result.findMany({
      where: { runId: run26.id },
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

    results.forEach((r, idx) => {
      console.log(`\n   ${idx + 1}. ${r.variation?.displayCode || r.variationId.slice(-8)}`);
      console.log(`      Result ID: ${r.id}`);
      console.log(`      Status: ${r.status}`);
      console.log(`      Confidence: ${(r.confidenceScore * 100).toFixed(1)}%`);
      console.log(`      Variation visible: ${r.variation?.isVisible}`);
      console.log(`      Creado: ${r.createdAt.toISOString()}`);
    });

    // 4. Simular la query de paginación del endpoint
    console.log('\n4️⃣  Simulando query de paginación (página 1, límite 25):');

    // Esta es la misma query que usa el endpoint
    const run = await prisma.qASweep2Run.findUnique({
      where: { id: run26.id },
      include: {
        results: {
          include: {
            variation: {
              select: {
                displayCode: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    console.log(`   Total resultados en include: ${run.results.length}`);

    // Aplicar paginación como lo hace el endpoint
    const page = 1;
    const limit = 25;
    const offset = (page - 1) * limit;
    const paginatedResults = run.results.slice(offset, offset + limit);

    console.log(`   Resultados en página 1: ${paginatedResults.length}`);
    console.log(`   Total páginas: ${Math.ceil(run.results.length / limit)}`);

    if (paginatedResults.length === 0 && run.results.length > 0) {
      console.log('\n⚠️  PROBLEMA: Hay resultados pero la paginación retorna 0');
      console.log('   Esto sugiere un bug en el offset o en el slice');
    } else {
      console.log('\n✅ La paginación funciona correctamente');
    }

    // 5. Distribución por estado
    console.log('\n5️⃣  Distribución de resultados por estado:');
    const byStatus = await prisma.qASweep2Result.groupBy({
      by: ['status'],
      where: { runId: run26.id },
      _count: true
    });

    byStatus.forEach(s => {
      console.log(`   ${s.status}: ${s._count}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Diagnóstico completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseRun26()
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
