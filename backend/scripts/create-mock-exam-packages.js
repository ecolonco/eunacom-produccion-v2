/**
 * Script para crear los 3 paquetes de ensayos EUNACOM (180 preguntas cada uno)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMockExamPackages() {
  try {
    console.log('🎯 Creando paquetes de ensayos EUNACOM (180 preguntas)...\n');

    // Paquete 1: 1 ensayo por $6,900
    const package1 = await prisma.mockExamPackage.upsert({
      where: { name: 'Paquete 1 Ensayo' },
      update: {
        description: '1 ensayo EUNACOM de 180 preguntas',
        price: 6900,
        mockExamQty: 1,
        isActive: true,
      },
      create: {
        name: 'Paquete 1 Ensayo',
        description: '1 ensayo EUNACOM de 180 preguntas',
        price: 6900,
        mockExamQty: 1,
        isActive: true,
      },
    });
    console.log('✅ Paquete 1:', package1.name, '-', package1.mockExamQty, 'ensayo -', `$${package1.price.toLocaleString()}`);

    // Paquete 2: 3 ensayos por $14,900
    const package2 = await prisma.mockExamPackage.upsert({
      where: { name: 'Paquete 3 Ensayos' },
      update: {
        description: '3 ensayos EUNACOM de 180 preguntas cada uno',
        price: 14900,
        mockExamQty: 3,
        isActive: true,
      },
      create: {
        name: 'Paquete 3 Ensayos',
        description: '3 ensayos EUNACOM de 180 preguntas cada uno',
        price: 14900,
        mockExamQty: 3,
        isActive: true,
      },
    });
    console.log('✅ Paquete 2:', package2.name, '-', package2.mockExamQty, 'ensayos -', `$${package2.price.toLocaleString()}`);

    // Paquete 3: 5 ensayos por $22,900
    const package3 = await prisma.mockExamPackage.upsert({
      where: { name: 'Paquete 5 Ensayos' },
      update: {
        description: '5 ensayos EUNACOM de 180 preguntas cada uno',
        price: 22900,
        mockExamQty: 5,
        isActive: true,
      },
      create: {
        name: 'Paquete 5 Ensayos',
        description: '5 ensayos EUNACOM de 180 preguntas cada uno',
        price: 22900,
        mockExamQty: 5,
        isActive: true,
      },
    });
    console.log('✅ Paquete 3:', package3.name, '-', package3.mockExamQty, 'ensayos -', `$${package3.price.toLocaleString()}`);

    console.log('\n🎉 Paquetes de ensayos EUNACOM creados correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMockExamPackages()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

