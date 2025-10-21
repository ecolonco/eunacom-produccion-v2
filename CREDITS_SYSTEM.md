# Sistema de Créditos EUNACOM

## 📋 Descripción General

El sistema de créditos permite a los estudiantes acceder a ejercicios de práctica mediante el consumo de créditos. Cada tipo de ejercicio tiene un costo diferente, con descuentos por paquetes.

## 💰 Paquetes Disponibles

### 1. Ejercicio Aleatorio Individual
- **Tipo**: `SINGLE_RANDOM`
- **Costo**: 1 crédito
- **Ejercicios**: 1 pregunta aleatoria
- **Descripción**: Práctica rápida sin filtros

### 2. Ejercicio por Especialidad
- **Tipo**: `SINGLE_SPECIALTY`
- **Costo**: 1 crédito  
- **Ejercicios**: 1 pregunta de la especialidad seleccionada
- **Descripción**: Práctica enfocada en una especialidad médica específica

### 3. Paquete de 20 Preguntas
- **Tipo**: `PACK_20`
- **Costo**: 15 créditos
- **Ejercicios**: 20 preguntas aleatorias
- **Ahorro**: 5 créditos (25% de descuento)
- **Descripción**: Sesión de práctica extendida

### 4. Simulacro de 90 Preguntas
- **Tipo**: `PACK_90`
- **Costo**: 60 créditos
- **Ejercicios**: 90 preguntas aleatorias
- **Ahorro**: 30 créditos (33% de descuento)
- **Descripción**: Simulacro completo tipo examen EUNACOM

## 🏗️ Arquitectura

### Backend

#### Modelo de Datos

```prisma
model CreditTransaction {
  id            String              @id @default(cuid())
  userId        String
  amount        Int                 // Negativo para deducciones, positivo para adiciones
  type          CreditTransactionType
  packageType   String?             // SINGLE_RANDOM, PACK_20, etc.
  description   String
  balanceBefore Int
  balanceAfter  Int
  metadata      Json?               // Información adicional (especialidad, quiz, etc.)
  createdAt     DateTime            @default(now())
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum CreditTransactionType {
  DEDUCTION          // Descuento por uso de ejercicios
  PURCHASE           // Compra de créditos
  REFUND             // Devolución de créditos
  BONUS              // Créditos de bonificación
  ADMIN_ADJUSTMENT   // Ajuste manual por administrador
}
```

#### Servicio de Créditos

**Ubicación**: `backend/src/services/credits.service.ts`

**Métodos principales**:
- `getUserCredits(userId)` - Obtiene el balance actual
- `hasEnoughCredits(userId, packageType)` - Verifica si tiene suficientes créditos
- `deductCredits(userId, packageType, metadata)` - Descuenta créditos con transacción atómica
- `addCredits(userId, amount, type, description)` - Añade créditos
- `getUserTransactions(userId, limit, offset)` - Historial de transacciones

#### Endpoints API

**Base URL**: `/api/credits`

1. **GET `/balance`** - Obtener balance actual
   ```json
   {
     "success": true,
     "data": {
       "credits": 50,
       "userId": "..."
     }
   }
   ```

2. **POST `/check`** - Verificar si tiene suficientes créditos
   ```json
   // Request
   {
     "packageType": "PACK_20"
   }
   
   // Response
   {
     "success": true,
     "data": {
       "hasEnoughCredits": true,
       "currentCredits": 50,
       "requiredCredits": 15,
       "packageInfo": { ... }
     }
   }
   ```

3. **POST `/deduct`** - Descontar créditos
   ```json
   // Request
   {
     "packageType": "SINGLE_SPECIALTY",
     "metadata": {
       "specialtyId": "...",
       "specialtyName": "Cardiología"
     }
   }
   
   // Response
   {
     "success": true,
     "message": "Créditos descontados exitosamente",
     "data": {
       "newBalance": 49,
       "transactionId": "..."
     }
   }
   ```

4. **GET `/transactions`** - Historial de transacciones
   ```json
   {
     "success": true,
     "data": {
       "transactions": [...],
       "total": 25,
       "limit": 50,
       "offset": 0
     }
   }
   ```

5. **GET `/packages`** - Obtener paquetes disponibles
   ```json
   {
     "success": true,
     "data": {
       "packages": [
         {
           "type": "PACK_20",
           "cost": 15,
           "exercises": 20,
           "description": "Paquete de 20 ejercicios aleatorios",
           "savings": 5,
           "savingsPercent": 25
         },
         ...
       ]
     }
   }
   ```

6. **POST `/add`** - Añadir créditos (Solo Admin)
   ```json
   // Request
   {
     "targetUserId": "...",
     "amount": 100,
     "type": "BONUS",
     "description": "Créditos de bienvenida"
   }
   ```

### Frontend

#### Servicio de Créditos

**Ubicación**: `frontend/src/services/credits.service.ts`

**Métodos principales**:
```typescript
class CreditsService {
  getBalance()
  checkCredits(packageType)
  deductCredits(packageType, metadata)
  getTransactions(limit, offset)
  getPackages()
  calculateCostPerExercise(packageInfo)
  formatSavings(packageInfo)
}
```

#### Componentes

1. **CreditConfirmModal**
   - Ubicación: `frontend/src/components/credits/CreditConfirmModal.tsx`
   - Modal de confirmación antes de descontar créditos
   - Muestra información del paquete, costo, balance actual y futuro
   - Advertencia si quedan pocos créditos
   - Bloquea la acción si no hay suficientes créditos

2. **StudentDashboard**
   - Muestra balance de créditos
   - Información de costos por paquete
   - Botones de acceso rápido a cada tipo de práctica

3. **QuickPractice**
   - Integración con sistema de créditos
   - Verificación antes de cargar preguntas
   - Descuento automático al obtener ejercicios

## 🔄 Flujo de Uso

### Escenario: Estudiante practica 20 preguntas

1. **Usuario selecciona paquete**
   - Hace clic en "🔢 Generar 20 preguntas"
   - Frontend verifica créditos disponibles
   
2. **Confirmación**
   - Se muestra modal con información:
     * Costo: 15 créditos
     * Balance actual: 50 créditos
     * Balance después: 35 créditos
     * Ahorro: 5 créditos (25%)
   
3. **Descuento de créditos**
   - Usuario confirma
   - Frontend llama a `POST /api/credits/deduct`
   - Backend ejecuta transacción atómica:
     * Verifica balance actual
     * Descuenta 15 créditos
     * Registra transacción en `credit_transactions`
     * Actualiza balance del usuario
   
4. **Ejercicios cargados**
   - Se cargan las 20 preguntas
   - Usuario puede responder sin costos adicionales
   - Balance actualizado se refleja en UI

## 🔒 Seguridad

### Transacciones Atómicas
Todas las operaciones de créditos usan transacciones de base de datos para evitar race conditions:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Obtener usuario con lock
  const user = await tx.user.findUnique({ where: { id: userId } });
  
  // 2. Verificar balance
  if (user.credits < cost) throw new Error('Insuficientes');
  
  // 3. Actualizar créditos
  await tx.user.update({ 
    where: { id: userId },
    data: { credits: user.credits - cost }
  });
  
  // 4. Registrar transacción
  await tx.creditTransaction.create({ ... });
});
```

### Validaciones
- **Backend**: Verificación de créditos antes de cada descuento
- **Frontend**: Verificación preventiva para mejorar UX
- **Doble verificación**: Backend siempre valida, incluso si frontend permite

## 📊 Auditoría

Todas las transacciones quedan registradas en la tabla `credit_transactions` con:
- Usuario que realizó la transacción
- Monto (positivo o negativo)
- Tipo de transacción
- Balance antes y después
- Metadata adicional (especialidad, quiz, etc.)
- Timestamp

Esto permite:
- Auditoría completa de uso de créditos
- Resolución de disputas
- Análisis de patrones de uso
- Detección de fraudes

## 🚀 Implementación

### 1. Aplicar migración de base de datos

```bash
cd backend
# Si usas DATABASE_URL en .env
npx prisma migrate deploy

# O aplicar SQL manualmente
psql $DATABASE_URL < prisma/migrations/20250108_add_credit_transactions/migration.sql
```

### 2. Generar cliente Prisma

```bash
cd backend
npx prisma generate
```

### 3. Reiniciar servidor

```bash
cd backend
npm run dev
```

### 4. Probar endpoints

```bash
# Obtener balance
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/credits/balance

# Verificar créditos
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"packageType":"PACK_20"}' \
  http://localhost:3000/api/credits/check

# Descontar créditos
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"packageType":"PACK_20"}' \
  http://localhost:3000/api/credits/deduct
```

## 🎯 Casos de Uso

### Añadir créditos manualmente (Admin)

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "user123",
    "amount": 100,
    "type": "BONUS",
    "description": "Créditos de bienvenida"
  }' \
  http://localhost:3000/api/credits/add
```

### Ver historial de transacciones

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/credits/transactions?limit=10&offset=0"
```

## 📈 Métricas

El sistema registra automáticamente:
- Total de créditos consumidos por usuario
- Paquetes más populares
- Patrones de uso por tiempo
- Tasa de conversión de créditos gratuitos a pagados

## 🔮 Futuras Mejoras

1. **Sistema de recarga automática**
   - Compra de créditos con pasarela de pagos
   - Planes de suscripción con créditos mensuales

2. **Promociones y descuentos**
   - Créditos dobles en fechas especiales
   - Descuentos por volumen

3. **Sistema de referidos**
   - Créditos por invitar amigos
   - Bonos por logros

4. **Alertas de créditos bajos**
   - Notificaciones cuando quedan pocos créditos
   - Sugerencias de paquetes según uso

5. **Analytics avanzado**
   - Dashboard de uso de créditos
   - Predicción de necesidad de créditos
   - ROI por tipo de ejercicio

## 📞 Soporte

Para dudas o problemas con el sistema de créditos, contactar a:
- Email: support@eunacom.com
- Slack: #eunacom-credits

