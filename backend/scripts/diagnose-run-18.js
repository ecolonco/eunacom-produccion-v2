const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnosing Run #18...\n');

  // Obtener todos los runs ordenados por fecha
  const runs = await prisma.qASweep2Run.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      config: true,
      status: true,
      createdAt: true,
      _count: {
        select: { results: true }
      }
    }
  });

  // Encontrar el run #18 (el 18vo creado)
  const run18 = runs[17]; // Index 17 = Run #18

  if (!run18) {
    console.log('❌ Run #18 not found');
    return;
  }

  console.log('✅ Run #18 found:\n');
  console.log(`   ID: ${run18.id}`);
  console.log(`   Name: ${run18.name}`);
  console.log(`   Status: ${run18.status}`);
  console.log(`   Results Count: ${run18._count.results}`);
  console.log(`   Created: ${run18.createdAt}`);
  console.log('\n📋 Configuration:');
  console.log(JSON.stringify(run18.config, null, 2));

  // Analizar la configuración
  const config = run18.config;
  console.log('\n🔎 Analysis:');
  
  if (config.baseQuestionFrom && config.baseQuestionTo) {
    const expectedBaseQuestions = config.baseQuestionTo - config.baseQuestionFrom + 1;
    const expectedVariations = expectedBaseQuestions * 4;
    console.log(`   Range: ${config.baseQuestionFrom} to ${config.baseQuestionTo}`);
    console.log(`   Expected Base Questions: ${expectedBaseQuestions}`);
    console.log(`   Expected Variations: ${expectedVariations}`);
    console.log(`   Actual Results: ${run18._count.results}`);
    console.log(`   Difference: ${run18._count.results - expectedVariations}`);
  } else {
    console.log('   ⚠️  No base question range defined!');
  }

  if (config.specialty) console.log(`   Specialty Filter: ${config.specialty}`);
  if (config.topic) console.log(`   Topic Filter: ${config.topic}`);

  // Obtener una muestra de variaciones procesadas
  console.log('\n📊 Sample of processed variations:');
  const sampleResults = await prisma.qASweep2Result.findMany({
    where: { runId: run18.id },
    select: {
      id: true,
      variationId: true,
      variation: {
        select: {
          displayCode: true,
          baseQuestionId: true,
          baseQuestion: {
            select: {
              displaySequence: true
            }
          }
        }
      }
    },
    take: 10
  });

  sampleResults.forEach((result, idx) => {
    console.log(`   ${idx + 1}. ${result.variation.displayCode} (Base #${result.variation.baseQuestion.displaySequence})`);
  });

  // Verificar rango real de ejercicios base procesados
  const allResults = await prisma.qASweep2Result.findMany({
    where: { runId: run18.id },
    select: {
      variation: {
        select: {
          baseQuestion: {
            select: {
              displaySequence: true
            }
          }
        }
      }
    }
  });

  const displaySequences = allResults.map(r => r.variation.baseQuestion.displaySequence);
  const minSeq = Math.min(...displaySequences);
  const maxSeq = Math.max(...displaySequences);
  const uniqueBaseQuestions = new Set(displaySequences).size;

  console.log('\n🎯 Actual Range Processed:');
  console.log(`   Min Base Question: ${minSeq}`);
  console.log(`   Max Base Question: ${maxSeq}`);
  console.log(`   Unique Base Questions: ${uniqueBaseQuestions}`);
  console.log(`   Total Variations: ${allResults.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

