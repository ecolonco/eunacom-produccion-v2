/**
 * Script para crear los 3 paquetes de controles
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createControlPackages() {
  try {
    console.log('🎯 Creando paquetes de controles...\n');

    // Paquete 1: 5 controles por $4,900
    const package1 = await prisma.controlPackage.upsert({
      where: { name: 'Paquete 5 Controles' },
      update: {
        description: '5 controles de 15 preguntas cada uno',
        price: 4900,
        controlQty: 5,
        isActive: true,
      },
      create: {
        name: 'Paquete 5 Controles',
        description: '5 controles de 15 preguntas cada uno',
        price: 4900,
        controlQty: 5,
        isActive: true,
      },
    });
    console.log('✅ Paquete 1:', package1.name, '-', package1.controlQty, 'controles -', `$${package1.price.toLocaleString()}`);

    // Paquete 2: 15 controles por $11,900
    const package2 = await prisma.controlPackage.upsert({
      where: { name: 'Paquete 15 Controles' },
      update: {
        description: '15 controles de 15 preguntas cada uno',
        price: 11900,
        controlQty: 15,
        isActive: true,
      },
      create: {
        name: 'Paquete 15 Controles',
        description: '15 controles de 15 preguntas cada uno',
        price: 11900,
        controlQty: 15,
        isActive: true,
      },
    });
    console.log('✅ Paquete 2:', package2.name, '-', package2.controlQty, 'controles -', `$${package2.price.toLocaleString()}`);

    // Paquete 3: 30 controles por $19,900
    const package3 = await prisma.controlPackage.upsert({
      where: { name: 'Paquete 30 Controles' },
      update: {
        description: '30 controles de 15 preguntas cada uno',
        price: 19900,
        controlQty: 30,
        isActive: true,
      },
      create: {
        name: 'Paquete 30 Controles',
        description: '30 controles de 15 preguntas cada uno',
        price: 19900,
        controlQty: 30,
        isActive: true,
      },
    });
    console.log('✅ Paquete 3:', package3.name, '-', package3.controlQty, 'controles -', `$${package3.price.toLocaleString()}`);

    console.log('\n🎉 Paquetes de controles creados correctamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createControlPackages()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

