/**
 * Script para actualizar los porcentajes de ensayos EUNACOM en Topics
 *
 * Distribución oficial EUNACOM (180 preguntas = 100%):
 * - Medicina Interna (37%): 67 preguntas divididas en 11 sub-especialidades
 * - Ginecología y Obstetricia (16%): 29 preguntas
 * - Pediatría (16%): 29 preguntas
 * - Cirugía (12%): 20 preguntas divididas en 3 sub-especialidades
 * - Psiquiatría (8%): 14 preguntas
 * - Salud Pública (5%): 9 preguntas
 * - Especialidades (6%): 12 preguntas divididas en 3 sub-especialidades
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Definición de porcentajes por topic
// Formato: nombre del topic (case-insensitive) => porcentaje
const TOPIC_PERCENTAGES = {
  // Medicina Interna - 11 sub-especialidades (3.33% c/u ≈ 6 preguntas c/u)
  'cardiología': 3.33,
  'cardiologia': 3.33,
  'broncopulmonar': 3.33,
  'gastroenterología': 3.33,
  'gastroenterologia': 3.33,
  'reumatología': 3.33,
  'reumatologia': 3.33,
  'infectología': 3.33,
  'infectologia': 3.33,
  'hemato-oncología': 3.33,
  'hemato-oncologia': 3.33,
  'hematooncología': 3.33,
  'hematooncologia': 3.33,
  'nefrología': 3.33,
  'nefrologia': 3.33,
  'neurología': 3.33,
  'neurologia': 3.33,
  'endocrinología': 3.33,
  'endocrinologia': 3.33,
  'diabetes y nutrición': 3.33,
  'diabetes y nutricion': 3.33,
  'diabetes': 3.33,
  'nutrición': 3.33,
  'nutricion': 3.33,
  'geriatría': 3.33,
  'geriatria': 3.33,

  // Ginecología y Obstetricia (16.11% ≈ 29 preguntas)
  'ginecología y obstetricia': 16.11,
  'ginecologia y obstetricia': 16.11,
  'ginecología': 16.11,
  'ginecologia': 16.11,
  'obstetricia': 16.11,

  // Pediatría (16.11% ≈ 29 preguntas)
  'pediatría': 16.11,
  'pediatria': 16.11,

  // Cirugía - 3 sub-especialidades
  'traumatología': 2.22, // 4 preguntas
  'traumatologia': 2.22,
  'urología': 2.22, // 4 preguntas
  'urologia': 2.22,
  'cirugía y anestesia': 6.67, // 12 preguntas
  'cirugia y anestesia': 6.67,
  'cirugía': 6.67,
  'cirugia': 6.67,
  'anestesia': 6.67,

  // Psiquiatría (7.78% ≈ 14 preguntas)
  'psiquiatría': 7.78,
  'psiquiatria': 7.78,

  // Salud Pública (5.00% ≈ 9 preguntas)
  'salud pública': 5.00,
  'salud publica': 5.00,

  // Especialidades - 3 sub-especialidades (2.22% c/u ≈ 4 preguntas c/u)
  'otorrinolaringología': 2.22,
  'otorrinolaringologia': 2.22,
  'oftalmología': 2.22,
  'oftalmologia': 2.22,
  'dermatología': 2.22,
  'dermatologia': 2.22,
};

async function updateTopicPercentages() {
  try {
    console.log('📊 Actualizando porcentajes de ensayos EUNACOM en Topics...\n');

    // Obtener todos los topics de la base de datos
    const allTopics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        mockExamPercentage: true,
      }
    });

    console.log(`📋 Total de topics en BD: ${allTopics.length}\n`);

    let updated = 0;
    let notFound = 0;
    let totalPercentage = 0;

    // Actualizar cada topic con su porcentaje correspondiente
    for (const topic of allTopics) {
      const normalizedName = topic.name.toLowerCase().trim();
      const percentage = TOPIC_PERCENTAGES[normalizedName];

      if (percentage !== undefined) {
        await prisma.topic.update({
          where: { id: topic.id },
          data: { mockExamPercentage: percentage }
        });

        console.log(`✅ ${topic.name}: ${percentage}%`);
        updated++;
        totalPercentage += percentage;
      } else {
        console.log(`⚠️  ${topic.name}: Sin porcentaje asignado (no está en distribución EUNACOM)`);
        notFound++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Resumen:`);
    console.log(`   Topics actualizados: ${updated}`);
    console.log(`   Topics sin porcentaje: ${notFound}`);
    console.log(`   Suma total de porcentajes: ${totalPercentage.toFixed(2)}%`);

    if (Math.abs(totalPercentage - 100) > 0.5) {
      console.log(`\n⚠️  ADVERTENCIA: La suma de porcentajes (${totalPercentage.toFixed(2)}%) difiere significativamente de 100%`);
    } else {
      console.log(`\n✅ La suma de porcentajes está dentro del rango esperado`);
    }
    console.log('='.repeat(60));

    console.log('\n🎉 Porcentajes actualizados correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateTopicPercentages()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
