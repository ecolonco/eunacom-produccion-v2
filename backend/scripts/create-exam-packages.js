/**
 * Script para crear los 3 paquetes de pruebas (45 preguntas cada una)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createExamPackages() {
  try {
    console.log('🎯 Creando paquetes de pruebas (45 preguntas)...\n');

    // Paquete 1: 3 pruebas por $8,900
    const package1 = await prisma.examPackage.upsert({
      where: { name: 'Paquete 3 Pruebas' },
      update: {
        description: '3 pruebas de 45 preguntas cada una',
        price: 8900,
        examQty: 3,
        isActive: true,
      },
      create: {
        name: 'Paquete 3 Pruebas',
        description: '3 pruebas de 45 preguntas cada una',
        price: 8900,
        examQty: 3,
        isActive: true,
      },
    });
    console.log('✅ Paquete 1:', package1.name, '-', package1.examQty, 'pruebas -', `$${package1.price.toLocaleString()}`);

    // Paquete 2: 10 pruebas por $18,900
    const package2 = await prisma.examPackage.upsert({
      where: { name: 'Paquete 10 Pruebas' },
      update: {
        description: '10 pruebas de 45 preguntas cada una',
        price: 18900,
        examQty: 10,
        isActive: true,
      },
      create: {
        name: 'Paquete 10 Pruebas',
        description: '10 pruebas de 45 preguntas cada una',
        price: 18900,
        examQty: 10,
        isActive: true,
      },
    });
    console.log('✅ Paquete 2:', package2.name, '-', package2.examQty, 'pruebas -', `$${package2.price.toLocaleString()}`);

    // Paquete 3: 20 pruebas por $32,900
    const package3 = await prisma.examPackage.upsert({
      where: { name: 'Paquete 20 Pruebas' },
      update: {
        description: '20 pruebas de 45 preguntas cada una',
        price: 32900,
        examQty: 20,
        isActive: true,
      },
      create: {
        name: 'Paquete 20 Pruebas',
        description: '20 pruebas de 45 preguntas cada una',
        price: 32900,
        examQty: 20,
        isActive: true,
      },
    });
    console.log('✅ Paquete 3:', package3.name, '-', package3.examQty, 'pruebas -', `$${package3.price.toLocaleString()}`);

    console.log('\n🎉 Paquetes de pruebas creados correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createExamPackages()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

