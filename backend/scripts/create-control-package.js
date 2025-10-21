/**
 * Script para crear el paquete inicial de controles
 * Ejecutar desde Render shell: node scripts/create-control-package.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createInitialPackage() {
  try {
    console.log('🚀 Creando paquete inicial de controles...');
    
    const pkg = await prisma.controlPackage.create({
      data: {
        name: 'Paquete 5 Controles',
        description: '5 controles de 15 preguntas cada uno para evaluar tu conocimiento',
        price: 4900,
        controlQty: 5,
        isActive: true,
      },
    });

    console.log('✅ Paquete creado exitosamente:');
    console.log(JSON.stringify(pkg, null, 2));
    console.log('');
    console.log('📦 Detalles:');
    console.log(`  ID: ${pkg.id}`);
    console.log(`  Nombre: ${pkg.name}`);
    console.log(`  Precio: $${pkg.price.toLocaleString('es-CL')} CLP`);
    console.log(`  Cantidad: ${pkg.controlQty} controles`);
    console.log(`  Total preguntas: ${pkg.controlQty * 15} preguntas`);
    console.log('');
    console.log('🎯 Los estudiantes ahora pueden ver y comprar este paquete!');
    
  } catch (error) {
    console.error('❌ Error al crear paquete:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createInitialPackage()
  .then(() => {
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });

