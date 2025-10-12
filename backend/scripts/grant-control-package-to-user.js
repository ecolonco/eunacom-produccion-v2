/**
 * Script para otorgar un paquete de controles a un usuario específico
 * Ejecutar desde Render shell: node scripts/grant-control-package-to-user.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_EMAIL = 'abonosaremko@gmail.com';

async function grantPackageToUser() {
  try {
    console.log('🔍 Buscando usuario y paquete...');
    
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      select: { id: true, email: true, firstName: true, lastName: true }
    });

    if (!user) {
      throw new Error(`Usuario no encontrado: ${USER_EMAIL}`);
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log('');

    // Buscar el paquete activo
    const pkg = await prisma.controlPackage.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!pkg) {
      throw new Error('No se encontró ningún paquete activo');
    }

    console.log('✅ Paquete encontrado:');
    console.log(`   ID: ${pkg.id}`);
    console.log(`   Nombre: ${pkg.name}`);
    console.log(`   Precio: $${pkg.price.toLocaleString('es-CL')}`);
    console.log(`   Cantidad: ${pkg.controlQty} controles`);
    console.log('');

    // Verificar si ya tiene una compra activa
    const existingPurchase = await prisma.controlPurchase.findFirst({
      where: {
        userId: user.id,
        packageId: pkg.id,
        status: 'ACTIVE'
      }
    });

    if (existingPurchase) {
      console.log('⚠️  El usuario ya tiene una compra activa de este paquete:');
      console.log(`   Controles usados: ${existingPurchase.controlsUsed}/${existingPurchase.controlsTotal}`);
      console.log(`   Controles restantes: ${existingPurchase.controlsTotal - existingPurchase.controlsUsed}`);
      console.log('');
      console.log('¿Deseas continuar de todos modos? El usuario tendrá 2 compras activas.');
      console.log('');
    }

    // Crear la compra
    console.log('🚀 Creando compra de paquete...');
    
    const purchase = await prisma.controlPurchase.create({
      data: {
        userId: user.id,
        packageId: pkg.id,
        controlsTotal: pkg.controlQty,
        controlsUsed: 0,
        status: 'ACTIVE',
        // No hay paymentId porque es una compra de prueba/regalo
      },
      include: {
        package: true
      }
    });

    console.log('✅ Compra creada exitosamente:');
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📦 RESUMEN DE LA COMPRA');
    console.log('═══════════════════════════════════════════════');
    console.log(`ID de Compra: ${purchase.id}`);
    console.log(`Usuario: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Paquete: ${purchase.package.name}`);
    console.log(`Controles totales: ${purchase.controlsTotal}`);
    console.log(`Controles usados: ${purchase.controlsUsed}`);
    console.log(`Controles restantes: ${purchase.controlsTotal - purchase.controlsUsed}`);
    console.log(`Estado: ${purchase.status}`);
    console.log(`Fecha de compra: ${purchase.purchasedAt.toLocaleString('es-CL')}`);
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('🎯 El usuario ahora puede:');
    console.log('   1. Ir a Dashboard → Controles');
    console.log('   2. Ver su compra activa');
    console.log('   3. Iniciar nuevos controles');
    console.log('   4. Resolver 15 preguntas por control');
    console.log('   5. Ver resultados y revisión detallada');
    console.log('');
    console.log('🎉 ¡Listo para usar!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

grantPackageToUser()
  .then(() => {
    console.log('');
    console.log('🏁 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });

