/**
 * Script para eliminar usuarios de prueba por email
 * Uso: node backend/scripts/delete-users.js email1@test.com email2@test.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUsers() {
  try {
    // Obtener emails de los argumentos
    const emails = process.argv.slice(2);

    if (emails.length === 0) {
      console.log('❌ Error: Debes proporcionar al menos un email');
      console.log('');
      console.log('Uso: node backend/scripts/delete-users.js email1@test.com email2@test.com');
      process.exit(1);
    }

    console.log('🗑️  Iniciando eliminación de usuarios...\n');
    console.log(`📧 Emails a eliminar: ${emails.join(', ')}\n`);

    for (const email of emails) {
      console.log(`\n🔍 Buscando usuario: ${email}`);

      // Buscar el usuario
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              quizResults: true,
              creditTransactions: true,
              emailVerifications: true,
              payments: true,
              controlPurchases: true,
              examPurchases: true,
              mockExamPurchases: true
            }
          }
        }
      });

      if (!user) {
        console.log(`   ⚠️  Usuario no encontrado: ${email}`);
        continue;
      }

      console.log(`   ✅ Usuario encontrado:`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`      Verificado: ${user.isVerified ? 'Sí' : 'No'}`);
      console.log(`      Creado: ${user.createdAt.toISOString()}`);
      console.log(`      Quiz Results: ${user._count.quizResults}`);
      console.log(`      Transacciones: ${user._count.creditTransactions}`);
      console.log(`      Verificaciones: ${user._count.emailVerifications}`);
      console.log(`      Pagos: ${user._count.payments}`);
      console.log(`      Compras de controles: ${user._count.controlPurchases}`);
      console.log(`      Compras de pruebas: ${user._count.examPurchases}`);
      console.log(`      Compras de ensayos: ${user._count.mockExamPurchases}`);

      // Eliminar usuario (las relaciones se eliminan en cascada según el schema)
      console.log(`\n   🗑️  Eliminando usuario...`);
      await prisma.user.delete({
        where: { email }
      });

      console.log(`   ✅ Usuario eliminado exitosamente: ${email}`);
    }

    console.log('\n\n🎉 Proceso completado');
    console.log(`   Total usuarios procesados: ${emails.length}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteUsers()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
