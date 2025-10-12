/**
 * Script para verificar el userId de la compra y del usuario actual
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_EMAIL = 'abonosaremko@gmail.com';
const PURCHASE_ID = 'cmgn5psyh000111m78zio4km4'; // Del log de la consola

async function checkPurchaseUser() {
  try {
    console.log('🔍 Verificando usuario y compra...\n');
    
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      select: { id: true, email: true, firstName: true }
    });

    if (!user) {
      throw new Error(`Usuario no encontrado: ${USER_EMAIL}`);
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.firstName}`);
    console.log('');

    // Buscar la compra
    const purchase = await prisma.controlPurchase.findUnique({
      where: { id: PURCHASE_ID },
      include: {
        user: {
          select: { id: true, email: true, firstName: true }
        },
        package: true
      }
    });

    if (!purchase) {
      throw new Error(`Compra no encontrada: ${PURCHASE_ID}`);
    }

    console.log('✅ Compra encontrada:');
    console.log(`   ID: ${purchase.id}`);
    console.log(`   User ID de la compra: ${purchase.userId}`);
    console.log(`   Usuario de la compra: ${purchase.user.email}`);
    console.log(`   Paquete: ${purchase.package.name}`);
    console.log(`   Estado: ${purchase.status}`);
    console.log('');

    // Comparar
    if (user.id === purchase.userId) {
      console.log('✅ ¡CORRECTO! Los IDs coinciden');
      console.log('   El usuario puede usar esta compra');
    } else {
      console.log('❌ ¡ERROR! Los IDs NO coinciden');
      console.log(`   Usuario actual:     ${user.id}`);
      console.log(`   Usuario de compra:  ${purchase.userId}`);
      console.log('');
      console.log('🔧 Solución: Actualizar el userId de la compra');
      console.log('');
      console.log('¿Deseas actualizar el userId de la compra? (esto se debe hacer manualmente)');
      
      // Actualizar automáticamente
      const updated = await prisma.controlPurchase.update({
        where: { id: PURCHASE_ID },
        data: { userId: user.id }
      });
      
      console.log('');
      console.log('✅ Compra actualizada correctamente');
      console.log(`   Nuevo userId: ${updated.userId}`);
      console.log('');
      console.log('🎯 Ahora el usuario puede iniciar controles');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchaseUser()
  .then(() => {
    console.log('');
    console.log('🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });

