const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnóstico de los últimos 2 QA Sweep 2.0 Runs\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Obtener los últimos 2 runs
  const runs = await prisma.qASweep2Run.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: {
      results: {
        include: {
          variation: {
            select: {
              id: true,
              displayCode: true,
              baseQuestion: {
                select: {
                  displaySequence: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (runs.length === 0) {
    console.log('❌ No se encontraron runs de QA Sweep 2.0');
    return;
  }

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`RUN #${i + 1} - ${run.status}`);
    console.log(`${'═'.repeat(80)}\n`);

    console.log(`📋 ID: ${run.id}`);
    console.log(`📝 Nombre: ${run.name}`);
    console.log(`📄 Descripción: ${run.description || 'N/A'}`);
    console.log(`📊 Estado: ${run.status}`);
    console.log(`📅 Creado: ${run.createdAt.toLocaleString('es-CL')}`);
    console.log(`🔄 Actualizado: ${run.updatedAt.toLocaleString('es-CL')}`);

    console.log(`\n⚙️  CONFIGURACIÓN:`);
    const config = run.config;
    console.log(JSON.stringify(config, null, 2));

    console.log(`\n📊 ESTADÍSTICAS:`);
    console.log(`   Total de variaciones procesadas: ${run.results.length}`);

    if (run.results.length > 0) {
      const statusCounts = {};
      const severityCounts = {};
      const categoryCounts = {};
      let totalConfidence = 0;
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let totalLatency = 0;
      let correctionsApplied = 0;
      let autoApplied = 0;

      for (const result of run.results) {
        // Status counts
        statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;

        // Confidence
        totalConfidence += result.confidenceScore;

        // Tokens
        totalTokensIn += result.tokensIn;
        totalTokensOut += result.tokensOut;
        totalLatency += result.latencyMs;

        // Check metadata for auto-apply
        if (result.metadata && result.metadata.autoApplied) {
          autoApplied++;
        }
        if (result.metadata && result.metadata.newVariationId) {
          correctionsApplied++;
        }

        // Parse diagnosis for severity and category
        try {
          const diagnosis = result.diagnosis;
          if (diagnosis.severidad_global) {
            severityCounts[diagnosis.severidad_global] = (severityCounts[diagnosis.severidad_global] || 0) + 1;
          }
          if (diagnosis.etiquetas && Array.isArray(diagnosis.etiquetas)) {
            diagnosis.etiquetas.forEach(tag => {
              if (tag.categoria) {
                categoryCounts[tag.categoria] = (categoryCounts[tag.categoria] || 0) + 1;
              }
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      console.log(`\n   📈 Por Estado:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
      });

      console.log(`\n   🎯 Confianza Promedio: ${(totalConfidence / run.results.length * 100).toFixed(2)}%`);
      console.log(`   🔧 Correcciones Aplicadas: ${correctionsApplied}`);
      console.log(`   ⚡ Auto-Aplicadas: ${autoApplied}`);

      console.log(`\n   💰 Tokens:`);
      console.log(`      Input: ${totalTokensIn.toLocaleString()}`);
      console.log(`      Output: ${totalTokensOut.toLocaleString()}`);
      console.log(`      Total: ${(totalTokensIn + totalTokensOut).toLocaleString()}`);

      console.log(`\n   ⏱️  Latencia:`);
      console.log(`      Total: ${totalLatency.toLocaleString()} ms`);
      console.log(`      Promedio: ${Math.round(totalLatency / run.results.length)} ms`);

      if (Object.keys(severityCounts).length > 0) {
        console.log(`\n   🚨 Por Severidad:`);
        Object.entries(severityCounts).forEach(([sev, count]) => {
          console.log(`      ${sev}: ${count}`);
        });
      }

      if (Object.keys(categoryCounts).length > 0) {
        console.log(`\n   🏷️  Por Categoría:`);
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          console.log(`      ${cat}: ${count}`);
        });
      }

      // Muestras de resultados
      console.log(`\n   📝 MUESTRA DE RESULTADOS (primeros 3):`);
      for (let j = 0; j < Math.min(3, run.results.length); j++) {
        const result = run.results[j];
        console.log(`\n      ───────────────────────────────────────────────────────────`);
        console.log(`      Variación #${j + 1}:`);
        console.log(`      ID: ${result.variationId}`);
        console.log(`      Display Code: ${result.variation.displayCode || 'N/A'}`);
        console.log(`      Base Question: #${result.variation.baseQuestion?.displaySequence || 'N/A'}`);
        console.log(`      Estado: ${result.status}`);
        console.log(`      Confianza: ${(result.confidenceScore * 100).toFixed(2)}%`);
        console.log(`      Modelo: ${result.aiModelUsed}`);
        
        console.log(`\n      📋 Diagnóstico:`);
        try {
          const diag = result.diagnosis;
          if (diag.severidad_global) {
            console.log(`         Severidad: ${diag.severidad_global}`);
          }
          if (diag.confianza_diagnostico) {
            console.log(`         Confianza: ${(diag.confianza_diagnostico * 100).toFixed(2)}%`);
          }
          if (diag.riesgo_seguridad) {
            console.log(`         Riesgo: ${diag.riesgo_seguridad}`);
          }
          if (diag.decision_recomendada) {
            console.log(`         Decisión: ${diag.decision_recomendada}`);
          }
          if (diag.etiquetas && Array.isArray(diag.etiquetas)) {
            console.log(`         Etiquetas (${diag.etiquetas.length}):`);
            diag.etiquetas.slice(0, 3).forEach(tag => {
              console.log(`            - ${tag.nombre} (${tag.categoria}, ${tag.severidad})`);
            });
          }
        } catch (e) {
          console.log(`         [Error al parsear diagnóstico]`);
        }

        if (result.corrections) {
          console.log(`\n      ✏️  Corrección Aplicada: SÍ`);
          try {
            const corr = result.corrections;
            if (corr.cambios_aplicados) {
              console.log(`         Cambios: ${corr.cambios_aplicados}`);
            }
          } catch (e) {
            console.log(`         [Error al parsear corrección]`);
          }
        } else {
          console.log(`\n      ✏️  Corrección Aplicada: NO`);
        }

        if (result.metadata) {
          console.log(`\n      📦 Metadata:`);
          if (result.metadata.newVariationId) {
            console.log(`         Nueva Variación: ${result.metadata.newVariationId}`);
          }
          if (result.metadata.autoApplied !== undefined) {
            console.log(`         Auto-Aplicada: ${result.metadata.autoApplied ? 'SÍ' : 'NO'}`);
          }
          if (result.metadata.appliedTaxonomy) {
            console.log(`         Taxonomía Aplicada:`);
            console.log(`            Especialidad: ${result.metadata.appliedTaxonomy.specialty || 'N/A'}`);
            console.log(`            Tema: ${result.metadata.appliedTaxonomy.topic || 'N/A'}`);
          }
        }
      }
    }
  }

  console.log(`\n${'═'.repeat(80)}\n`);
  console.log('🏁 Diagnóstico completado\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
  })
  .finally(() => prisma.$disconnect());

