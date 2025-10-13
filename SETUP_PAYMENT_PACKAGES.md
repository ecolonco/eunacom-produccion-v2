# Configuración de Paquetes de Pago - Flow.cl

## 🎯 Sistema Implementado

Se ha implementado el sistema completo de compra de paquetes para:
- **Controles** (15 preguntas)
- **Pruebas** (45 preguntas)
- **Ensayos EUNACOM** (180 preguntas)

## ✅ Estado Actual

### Backend (Render)
- ✅ Migración aplicada (`20250113000000_add_package_type_to_payment`)
- ✅ Endpoints de pago implementados
- ✅ Webhook configurado para acreditar paquetes
- ✅ Commit: `616b2ad`

### Frontend (Vercel)
- ✅ Integración Flow.cl en ControlStore, ExamStore, MockExamStore
- ✅ Polling de estado de pago implementado
- ✅ Commit: `54598cb`

## 🚀 Pasos para Activar el Sistema

### 1. Crear Paquetes de Controles

Ejecuta en la shell de Render:

```bash
cd ~/project/src/backend
node scripts/create-control-packages.js
```

**Paquetes que se crearán:**
- Paquete 5 Controles - $4,900 CLP
- Paquete 15 Controles - $11,900 CLP
- Paquete 30 Controles - $19,900 CLP

### 2. Crear Paquetes de Pruebas

```bash
node scripts/create-exam-packages.js
```

**Paquetes que se crearán:**
- Paquete 3 Pruebas - $8,900 CLP
- Paquete 10 Pruebas - $18,900 CLP
- Paquete 20 Pruebas - $32,900 CLP

### 3. Crear Paquetes de Ensayos EUNACOM

```bash
node scripts/create-mock-exam-packages.js
```

**Paquetes que se crearán:**
- Paquete 1 Ensayo - $6,900 CLP
- Paquete 3 Ensayos - $14,900 CLP
- Paquete 5 Ensayos - $22,900 CLP

## 🧪 Probar el Sistema

### Flujo de Compra Completo

1. **Acceder a la aplicación**: https://eunacom-nuevo.vercel.app
2. **Iniciar sesión** con tu usuario de prueba
3. **Ir a Controles/Pruebas/Ensayos**
4. **Hacer clic en "Comprar Ahora"**
5. **Confirmar la compra**
6. **Serás redirigido a Flow.cl** (sandbox)
7. **Completar el pago de prueba**
8. **Serás redirigido de vuelta** a la aplicación
9. **El sistema verifica automáticamente** el estado del pago (polling cada 3 segundos)
10. **Recibes confirmación** y el paquete se acredita automáticamente

### Verificar Compras en la Base de Datos

Para ver las compras de un usuario:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPurchases(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      controlPurchases: { include: { package: true } },
      examPurchases: { include: { package: true } },
      mockExamPurchases: { include: { package: true } }
    }
  });
  
  console.log('Usuario:', user.email);
  console.log('Controles:', user.controlPurchases.length);
  console.log('Pruebas:', user.examPurchases.length);
  console.log('Ensayos:', user.mockExamPurchases.length);
  
  await prisma.\$disconnect();
}

checkPurchases('abonosaremko@gmail.com').catch(console.error);
"
```

## 📊 Verificar Pagos

Para ver todos los pagos:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listPayments() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { email: true } } }
  });
  
  payments.forEach(p => {
    console.log(\`\${p.createdAt.toISOString()} | \${p.user.email} | \${p.packageType} | \$\${p.amount} | \${p.status}\`);
  });
  
  await prisma.\$disconnect();
}

listPayments().catch(console.error);
"
```

## 🔧 Variables de Entorno Requeridas

Verifica que estas variables estén configuradas en Render:

```
FLOW_API_KEY=tu-api-key-sandbox
FLOW_API_SECRET=tu-api-secret-sandbox
FLOW_API_BASE=sandbox
FLOW_COMMERCE_ID=tu-commerce-id (opcional)
```

## 🎯 Endpoints Disponibles

### Crear Pagos
- `POST /api/payments/flow/create-control-purchase` - Controles
- `POST /api/payments/flow/create-exam-purchase` - Pruebas
- `POST /api/payments/flow/create-mock-exam-purchase` - Ensayos

### Verificar Estado
- `GET /api/payments/flow/check/:paymentId` - Polling de estado

### Webhook (Flow.cl)
- `POST /api/payments/flow/webhook` - Confirmación automática

## 🐛 Troubleshooting

### El pago no se acredita automáticamente

1. Verifica los logs de Render para errores del webhook
2. Usa el endpoint `/flow/check/:paymentId` manualmente
3. Verifica que las credenciales de Flow.cl sean correctas

### Error "Paquete no encontrado"

Asegúrate de haber ejecutado los scripts de creación de paquetes.

### Error de autenticación

Verifica que el token JWT esté válido en `localStorage.accessToken`.

## 📝 Notas Importantes

- El sistema usa **polling** en lugar de depender únicamente del webhook
- El polling se ejecuta cada 3 segundos durante 5 minutos
- Las compras son **idempotentes** (no se duplican)
- Todos los tipos de paquetes usan el mismo flujo de Flow.cl
- Los pagos quedan registrados en la tabla `payments` con su `packageType`

## 🎉 ¡Listo!

Una vez ejecutados los scripts, el sistema estará completamente funcional y los estudiantes podrán comprar paquetes de Controles, Pruebas y Ensayos directamente desde la aplicación.

