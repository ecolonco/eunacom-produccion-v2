# 📚 Documentación Técnica - Plataforma EUNACOM

## Tabla de Contenidos
1. [Arquitectura General](#arquitectura-general)
2. [Sistema de Autenticación](#sistema-de-autenticación)
3. [Dashboard del Estudiante](#dashboard-del-estudiante)
4. [Fábrica de Ejercicios](#fábrica-de-ejercicios)
5. [Sistema QA Sweep 2.0](#sistema-qa-sweep-20)
6. [Panel Administrativo](#panel-administrativo)
7. [Sistema de Pagos](#sistema-de-pagos)

---

## 1. Arquitectura General

### Stack Tecnológico
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL
- **ORM**: Prisma
- **Autenticación**: JWT
- **IA**: OpenAI (GPT-5-mini, GPT-5)
- **Pagos**: Flow.cl
- **Hosting**: Vercel (frontend) + Render (backend)
- **DNS/CDN**: Cloudflare

### URLs de Producción
- Frontend: `https://eunacomtest.cl`
- Backend: `https://eunacom-backend-v3.onrender.com`

---

## 2. Sistema de Autenticación

### 2.1 Registro de Usuario

**Flujo:**
```
Usuario → Formulario registro → Backend valida → Crea usuario
→ Genera token verificación → Envía email → Usuario verifica → Activa cuenta
```

**Endpoint:** `POST /api/auth/register`

**Datos requeridos:**
```typescript
{
  email: string,
  password: string,
  firstName: string,
  lastName: string
}
```

**Proceso:**
1. Validación de email único
2. Hash de contraseña (bcrypt)
3. Creación de usuario con rol "STUDENT"
4. Asignación de 10 créditos iniciales gratuitos
5. Generación de token de verificación
6. Envío de email con link de verificación

**Tabla: `User`**
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  firstName     String
  lastName      String
  role          Role     @default(STUDENT)
  isVerified    Boolean  @default(false)
  isActive      Boolean  @default(true)
  credits       Int      @default(10)
  createdAt     DateTime @default(now())
}
```

### 2.2 Verificación de Email

**Endpoint:** `GET /api/auth/verify-email?token=xxx`

**Flujo:**
1. Usuario hace clic en link del email
2. Backend valida token (24h de validez)
3. Marca `isVerified = true`
4. Redirige al login

**Tabla: `EmailVerification`**
```prisma
model EmailVerification {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

### 2.3 Login

**Endpoint:** `POST /api/auth/login`

**Datos:**
```typescript
{
  email: string,
  password: string
}
```

**Flujo:**
1. Valida email existe
2. Valida cuenta verificada (`isVerified = true`)
3. Valida cuenta activa (`isActive = true`)
4. Compara password con hash (bcrypt)
5. Genera JWT token (válido 7 días)
6. Retorna token + datos de usuario

**Response:**
```typescript
{
  token: string,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: 'STUDENT' | 'ADMIN',
    credits: number,
    isVerified: boolean
  }
}
```

### 2.4 Protección de Rutas

**Middleware:** `authenticate`

```typescript
// Valida JWT en header: Authorization: Bearer <token>
// Agrega req.user con datos del usuario
// Redirige a login si token inválido
```

**Uso en backend:**
```typescript
router.get('/protected', authenticate, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  // ...
});
```

**Uso en frontend:**
```typescript
// AuthContext provee:
- isAuthenticated: boolean
- user: UserData | null
- login(email, password)
- logout()
- checkAuth()
```

---

## 3. Dashboard del Estudiante

### 3.1 Vista Principal

**Componente:** `StudentDashboard.tsx`

**Secciones:**
1. **Header**: Información del usuario (nombre, email)
2. **Botones de acción**:
   - 📝 Controles (15 preguntas)
   - 📋 Pruebas (45 preguntas)
   - 🎓 Ensayos EUNACOM (180 preguntas)
   - 📊 Mi Rendimiento
   - 🚪 Cerrar Sesión

**Endpoint inicial:** `GET /api/auth/me`
- Retorna datos actualizados del usuario (créditos, paquetes disponibles)

### 3.2 Sistema de Controles (15 preguntas)

**Flujo completo:**

#### A. Compra de Paquetes

**Componente:** `ControlStore.tsx`

**Paquetes disponibles:**
```typescript
[
  { name: "Paquete 5 Controles", quantity: 5, price: 4900 },
  { name: "Paquete 15 Controles", quantity: 15, price: 11900 },
  { name: "Paquete 30 Controles", quantity: 30, price: 19900 }
]
```

**Endpoint:** `GET /api/controls/packages`

**Proceso de compra:**
1. Usuario selecciona paquete
2. `POST /api/payments/flow/create-control-purchase`
   ```typescript
   { packageId: string }
   ```
3. Backend crea registro en `Payment` (status: PENDING)
4. Backend llama a Flow.cl API
5. Redirige a Flow.cl para pago
6. Flow.cl webhook notifica pago exitoso: `POST /api/payments/flow/webhook`
7. Backend crea `ControlPurchase` (status: ACTIVE)
8. Frontend polling verifica estado: `GET /api/payments/flow/check/:paymentId`

**Tabla: `ControlPackage`**
```prisma
model ControlPackage {
  id       String @id @default(uuid())
  name     String
  quantity Int
  price    Int
  isActive Boolean @default(true)
}
```

**Tabla: `ControlPurchase`**
```prisma
model ControlPurchase {
  id            String   @id @default(uuid())
  userId        String
  packageId     String
  controlsTotal Int
  controlsUsed  Int      @default(0)
  status        String   @default("ACTIVE")
  purchasedAt   DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id])
  package       ControlPackage @relation(fields: [packageId], references: [id])
}
```

#### B. Iniciar Control

**Componente:** `ControlsDashboard.tsx`

**Funcionalidades:**
- **Filtro por especialidad**: Dropdown con todas las especialidades disponibles
- **Mostrar controles disponibles**: `controlsTotal - controlsUsed`
- **Botón "Iniciar Nuevo Control"**

**Endpoint:** `POST /api/controls/start`

**Request:**
```typescript
{
  specialtyId?: string  // Opcional, null = todas las especialidades
}
```

**Proceso:**
1. Valida usuario autenticado
2. Busca `ControlPurchase` activa con controles disponibles
3. Decrementa `controlsUsed++`
4. Selecciona 15 preguntas aleatorias visibles (última versión)
   - Si `specialtyId` presente: filtra por especialidad
   - Deduplica variaciones (mantiene versión más reciente)
5. Crea registro `Control` (status: IN_PROGRESS)
6. Retorna control con preguntas

**Response:**
```typescript
{
  control: {
    id: string,
    userId: string,
    startedAt: Date,
    status: 'IN_PROGRESS'
  },
  questions: Array<{
    id: string,
    variation: {
      id: string,
      displayCode: string,  // e.g., "510.3"
      version: number,       // e.g., 2
      enunciado: string,
      baseQuestion: {
        specialty: { name: string },
        topic: { name: string }
      }
    },
    alternatives: Array<{
      id: string,
      text: string,
      isCorrect: boolean,
      explanation: string
    }>
  }>
}
```

**Lógica de selección de preguntas:**
```typescript
// backend/src/services/control.service.ts
async selectRandomQuestions(count: number, specialtyName?: string) {
  // 1. Fetch variaciones visibles
  const variations = await prisma.questionVariation.findMany({
    where: {
      isVisible: true,
      baseQuestion: {
        aiAnalysis: specialtyName ? {
          specialty: { contains: specialtyName }
        } : undefined
      }
    },
    include: {
      baseQuestion: {
        include: {
          specialty: true,
          topic: true,
          aiAnalysis: true
        }
      }
    }
  });

  // 2. Deduplicar: mantener solo versión más reciente
  const variationMap = new Map();
  for (const v of variations) {
    const key = `${v.baseQuestionId}-${v.variationNumber}`;
    const existing = variationMap.get(key);
    if (!existing || v.version > existing.version) {
      variationMap.set(key, v);
    }
  }

  // 3. Seleccionar aleatoriamente
  const unique = Array.from(variationMap.values());
  const shuffled = unique.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```

#### C. Sesión de Control

**Componente:** `ControlSession.tsx`

**Estado:**
```typescript
{
  control: ControlData,
  questions: QuestionData[],
  currentIndex: number,
  answers: Record<questionId, alternativeId>,
  timeRemaining: number
}
```

**Interfaz:**
- **Header**: "Control de Práctica - 15 preguntas"
- **Contador**: "Pregunta X de 15"
- **Ejercicio**: "Ejercicio 510.3 v2" (displayCode + version)
- **Enunciado**: Texto del caso clínico
- **Alternativas**: Radio buttons (A, B, C, D, E)
- **Navegación**: "Anterior" / "Siguiente"
- **Botón**: "Finalizar Control" (cuando todas respondidas)

**Interacción:**
1. Usuario responde pregunta → guarda en estado local
2. Navegación entre preguntas sin enviar al servidor
3. Al finalizar: `POST /api/controls/:id/complete`

**Endpoint de finalización:** `POST /api/controls/:controlId/complete`

**Request:**
```typescript
{
  answers: Array<{
    questionId: string,
    selectedAlternativeId: string
  }>
}
```

**Response:**
```typescript
{
  control: {
    id: string,
    status: 'COMPLETED',
    completedAt: Date,
    score: number,         // correctas / total
    timeSpent: number      // segundos
  },
  results: Array<{
    question: { id, displayCode, enunciado, version },
    selectedAlternative: { id, text },
    correctAlternative: { id, text },
    isCorrect: boolean,
    explanation: string
  }>
}
```

#### D. Resultados de Control

**Componente:** `ControlResults.tsx`

**Muestra:**
1. **Resumen**:
   - Correctas: X/15
   - Porcentaje: XX%
   - Tiempo total: XX min
2. **Detalle por pregunta**:
   - ✅ / ❌ Ejercicio X.X vY
   - Tu respuesta: [alternativa seleccionada]
   - Respuesta correcta: [alternativa correcta]
   - Explicación: [texto explicativo]

**Endpoint:** `GET /api/controls/:id`
- Retorna control completo con resultados

### 3.3 Sistema de Pruebas (45 preguntas)

**Componentes:**
- `ExamStore.tsx` - Compra de paquetes
- `ExamsDashboard.tsx` - Lista y inicio
- `ExamSession.tsx` - Sesión de examen
- `ExamResults.tsx` - Resultados

**Paquetes:**
```typescript
[
  { name: "Paquete 3 Pruebas", quantity: 3, price: 8900 },
  { name: "Paquete 10 Pruebas", quantity: 10, price: 18900 },
  { name: "Paquete 20 Pruebas", quantity: 20, price: 32900 }
]
```

**Endpoints:**
- `GET /api/exams/packages`
- `POST /api/payments/flow/create-exam-purchase`
- `POST /api/exams/start`
- `POST /api/exams/:id/complete`
- `GET /api/exams/:id`

**Diferencias con Controles:**
- 45 preguntas en lugar de 15
- Sin filtro de especialidad (siempre aleatorio)
- Mismo sistema de versioning y deduplicación

### 3.4 Sistema de Ensayos EUNACOM (180 preguntas)

**Componentes:**
- `MockExamStore.tsx`
- `MockExamsDashboard.tsx`
- `MockExamSession.tsx`
- `MockExamResults.tsx`

**Paquetes:**
```typescript
[
  { name: "Paquete 1 Ensayo", quantity: 1, price: 6900 },
  { name: "Paquete 3 Ensayos", quantity: 3, price: 14900 },
  { name: "Paquete 5 Ensayos", quantity: 5, price: 22900 }
]
```

**Endpoints:**
- `GET /api/mock-exams/packages`
- `POST /api/payments/flow/create-mock-exam-purchase`
- `POST /api/mock-exams/start`
- `POST /api/mock-exams/:id/complete`
- `GET /api/mock-exams/:id`

**Características especiales:**
- 180 preguntas (simulación examen real EUNACOM)
- Mayor tiempo de sesión
- Estadísticas más detalladas

### 3.5 Panel de Rendimiento

**Componente:** `PerformancePanel.tsx`

**Endpoint:** `GET /api/students/performance`

**Muestra:**
1. **Resumen Consolidado**:
   - Total de actividades: X
   - Promedio general: XX%
   - Tiempo total invertido: XX horas
   
2. **Por Tipo**:
   
   **Controles:**
   - Completados: X
   - Promedio: XX%
   - Mejor resultado: XX%
   - Tiempo promedio: XX min
   
   **Pruebas:**
   - (mismas métricas)
   
   **Ensayos EUNACOM:**
   - (mismas métricas)

3. **Historial**:
   - Lista de todas las actividades completadas
   - Fecha, tipo, score, tiempo
   - Link para revisar resultados

---

## 4. Fábrica de Ejercicios

### 4.1 Estructura de Datos

**Modelo de 3 niveles:**

```
BaseQuestion (Ejercicio Madre)
  ├─ QuestionVariation 1 (Variación A) → v1, v2, v3...
  ├─ QuestionVariation 2 (Variación B) → v1, v2...
  ├─ QuestionVariation 3 (Variación C) → v1...
  └─ QuestionVariation 4 (Variación D) → v1, v2...
      └─ Alternative 1-5 (A, B, C, D, E)
          └─ explanation
```

### 4.2 Tablas Principales

**`BaseQuestion`**
```prisma
model BaseQuestion {
  id              String   @id @default(uuid())
  displaySequence Int      @unique  // Número ejercicio (e.g., 510)
  originalPrompt  String   @db.Text
  specialtyId     String
  topicId         String
  difficultyLevel String
  createdAt       DateTime @default(now())
  
  specialty       Specialty @relation(fields: [specialtyId], references: [id])
  topic           Topic     @relation(fields: [topicId], references: [id])
  variations      QuestionVariation[]
  aiAnalysis      AIAnalysis?
}
```

**`QuestionVariation`**
```prisma
model QuestionVariation {
  id              String   @id @default(uuid())
  baseQuestionId  String
  variationNumber Int      // 1, 2, 3, 4
  version         Int      @default(1)  // Para versionado QA
  enunciado       String   @db.Text
  isVisible       Boolean  @default(true)
  displayCode     String   // e.g., "510.3" (displaySequence.variationNumber)
  modifiedAt      DateTime?
  parentVersionId String?  // Referencia a versión anterior
  createdAt       DateTime @default(now())
  
  baseQuestion    BaseQuestion @relation(fields: [baseQuestionId], references: [id])
  parentVersion   QuestionVariation? @relation("VariationVersions", fields: [parentVersionId], references: [id])
  alternatives    Alternative[]
  
  @@unique([baseQuestionId, variationNumber, version])
  @@index([isVisible, version])
  @@index([displayCode])
}
```

**`Alternative`**
```prisma
model Alternative {
  id          String   @id @default(uuid())
  variationId String
  letter      String   // A, B, C, D, E
  text        String   @db.Text
  isCorrect   Boolean
  explanation String   @db.Text
  createdAt   DateTime @default(now())
  
  variation   QuestionVariation @relation(fields: [variationId], references: [id])
  
  @@index([variationId])
}
```

### 4.3 Taxonomía

**`Specialty`**
```prisma
model Specialty {
  id          String @id @default(uuid())
  name        String @unique
  description String?
  isActive    Boolean @default(true)
  
  topics      Topic[]
  baseQuestions BaseQuestion[]
}
```

Ejemplos:
- Medicina Interna
- Cirugía
- Pediatría
- Obstetricia y Ginecología
- Psiquiatría

**`Topic`**
```prisma
model Topic {
  id          String @id @default(uuid())
  specialtyId String
  name        String
  description String?
  isActive    Boolean @default(true)
  
  specialty   Specialty @relation(fields: [specialtyId], references: [id])
  baseQuestions BaseQuestion[]
  
  @@unique([specialtyId, name])
}
```

Ejemplos (para Obstetricia y Ginecología):
- Ginecología
- Obstetricia
- Patología Mamaria

### 4.4 Generación de Ejercicios con IA

**Service:** `exercise-factory.service.ts`

**Proceso de creación:**

1. **Input**: Prompt inicial del usuario
```typescript
{
  prompt: "Caso clínico de diabetes gestacional",
  specialty: "Obstetricia y Ginecología",
  topic: "Obstetricia",
  difficulty: "intermediate"
}
```

2. **Análisis con GPT-4o**:
```typescript
// Endpoint: POST /api/admin/exercise-factory/analyze
const analysis = await OpenAIService.analyzeQuestion(prompt);

// Retorna:
{
  refinedPrompt: string,
  specialty: string,
  topic: string,
  difficulty: 'basic' | 'intermediate' | 'advanced',
  keyLearningPoints: string[]
}
```

3. **Generación de 4 variaciones**:
```typescript
// Para cada variación (1-4):
const variation = await OpenAIService.generateQuestionVariation(
  refinedPrompt,
  variationNumber,
  { specialty, topic, difficulty }
);

// Retorna:
{
  enunciado: string,
  alternatives: Array<{
    letter: 'A' | 'B' | 'C' | 'D' | 'E',
    text: string,
    isCorrect: boolean,
    explanation: string
  }>
}
```

4. **Almacenamiento**:
```typescript
// Crear BaseQuestion
const baseQuestion = await prisma.baseQuestion.create({
  data: {
    displaySequence: nextSequence,  // Auto-incrementa
    originalPrompt: prompt,
    specialtyId: specialty.id,
    topicId: topic.id,
    difficultyLevel: difficulty
  }
});

// Crear AIAnalysis
await prisma.aIAnalysis.create({
  data: {
    baseQuestionId: baseQuestion.id,
    specialty: analysis.specialty,
    topic: analysis.topic,
    difficulty: analysis.difficulty,
    analysisResult: JSON.stringify(analysis)
  }
});

// Crear 4 variaciones
for (let i = 1; i <= 4; i++) {
  const varData = await generateVariation(i);
  
  const variation = await prisma.questionVariation.create({
    data: {
      baseQuestionId: baseQuestion.id,
      variationNumber: i,
      version: 1,
      displayCode: `${baseQuestion.displaySequence}.${i}`,
      enunciado: varData.enunciado,
      isVisible: true
    }
  });
  
  // Crear 5 alternativas
  for (const alt of varData.alternatives) {
    await prisma.alternative.create({
      data: {
        variationId: variation.id,
        letter: alt.letter,
        text: alt.text,
        isCorrect: alt.isCorrect,
        explanation: alt.explanation
      }
    });
  }
}
```

### 4.5 Versionado de Ejercicios

**Concepto:**
- Cada corrección crea una **nueva versión** de la variación
- La versión anterior se marca como `isVisible: false`
- La nueva versión se marca como `isVisible: true`
- Se mantiene trazabilidad vía `parentVersionId`

**Ejemplo:**
```
Ejercicio 510.3:
  - v1 (isVisible: false, parentVersionId: null) ← Original con errores
  - v2 (isVisible: false, parentVersionId: v1.id) ← Primera corrección
  - v3 (isVisible: true, parentVersionId: v2.id) ← Corrección actual (activa)
```

**Lógica de selección:**
```typescript
// Los estudiantes SIEMPRE ven la última versión visible
const variations = await prisma.questionVariation.findMany({
  where: { isVisible: true }
});

// Deduplicar para obtener versión más reciente
const latestVersions = new Map();
for (const v of variations) {
  const key = `${v.baseQuestionId}-${v.variationNumber}`;
  const existing = latestVersions.get(key);
  if (!existing || v.version > existing.version) {
    latestVersions.set(key, v);
  }
}
```

---

## 5. Sistema QA Sweep 2.0

### 5.1 Arquitectura

**Componentes:**
1. **Frontend**: `QASweep2Panel.tsx` - Panel administrativo
2. **Backend API**: `qa-sweep-2.routes.ts` - Endpoints REST
3. **Service**: `qa-sweep-2.service.ts` - Lógica de negocio
4. **Worker**: Servicio Render separado para procesamiento asíncrono
5. **OpenAI Service**: Integración con GPT-5-mini y GPT-5
6. **Report Service**: Generación de reportes con GPT-5

### 5.2 Modelos de Datos

**`QASweep2Run`**
```prisma
model QASweep2Run {
  id               String   @id @default(uuid())
  createdBy        String
  status           String   @default("PENDING")
  // PENDING | RUNNING | COMPLETED | FAILED
  
  config           Json     // Configuración del run
  /*
  {
    baseQuestionFrom: 1,
    baseQuestionTo: 100,
    specialty?: string,
    topic?: string,
    batchSize: 50,
    maxConcurrency: 3
  }
  */
  
  startedAt        DateTime?
  completedAt      DateTime?
  totalVariations  Int      @default(0)
  processedCount   Int      @default(0)
  errorCount       Int      @default(0)
  
  results          QASweep2Result[]
  creator          User     @relation(fields: [createdBy], references: [id])
  
  @@index([status])
  @@index([createdBy])
}
```

**`QASweep2Result`**
```prisma
model QASweep2Result {
  id                String   @id @default(uuid())
  runId             String
  variationId       String
  
  // Evaluación (GPT-5-mini)
  evaluationTags    String[] // ["error_clinico", "incoherencia"]
  confidenceScore   Float    // 0.0 - 1.0
  severidadGlobal   String   // "critica" | "alta" | "media" | "baja" | "ninguna"
  riesgoSeguridad   Boolean
  diagnosis         String   @db.Text
  
  // Corrección (GPT-5)
  action            String   // "none" | "polish" | "deep_rewrite"
  correctedContent  Json?    // { enunciado, alternatives: [...] }
  
  // Metadatos
  metadata          Json?    // { applied: bool, newVersionId, processingTime, etc }
  createdAt         DateTime @default(now())
  
  run               QASweep2Run @relation(fields: [runId], references: [id])
  variation         QuestionVariation @relation(fields: [variationId], references: [id])
  
  @@unique([runId, variationId])
  @@index([runId])
  @@index([variationId])
}
```

**`AIReport`**
```prisma
model AIReport {
  id          String   @id @default(uuid())
  runId       String   @unique
  reportType  String   // "qa_sweep_2_summary"
  content     String   @db.Text
  statistics  Json     // { totalProcessed, critical, high, etc }
  generatedAt DateTime @default(now())
  
  run         QASweep2Run @relation(fields: [runId], references: [id])
}
```

### 5.3 Flujo Completo

#### Fase 1: Configuración y Creación del Run

**Frontend:** `QASweep2Panel.tsx`

**Formulario:**
```typescript
{
  baseQuestionFrom: number,  // e.g., 1
  baseQuestionTo: number,    // e.g., 100
  specialty?: string,        // Opcional
  topic?: string,           // Opcional
  batchSize: number,        // e.g., 50
  maxConcurrency: number    // e.g., 3
}
```

**Endpoint:** `POST /api/admin/qa-sweep-2/runs`

**Proceso:**
1. Valida rango de ejercicios
2. Cuenta variaciones a procesar
3. Crea `QASweep2Run` con status: PENDING
4. Retorna ID del run

#### Fase 2: Inicio del Análisis

**Endpoint:** `POST /api/admin/qa-sweep-2/runs/:id/analyze`

**Proceso:**
1. Valida run existe y está en PENDING
2. Retorna confirmación inmediata al frontend
3. El **Worker** detecta el run y lo procesa

#### Fase 3: Procesamiento por Worker

**Worker:** Servicio Render independiente

**Loop principal:**
```typescript
async function workerLoop() {
  while (true) {
    // 1. Claim: buscar run PENDING y marcar como RUNNING (atómico)
    const run = await prisma.qASweep2Run.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!run) {
      await sleep(5000);  // Esperar 5s
      continue;
    }
    
    await prisma.qASweep2Run.update({
      where: { id: run.id },
      data: { 
        status: 'RUNNING',
        startedAt: new Date()
      }
    });
    
    // 2. Procesar run
    try {
      await processRun(run);
      
      await prisma.qASweep2Run.update({
        where: { id: run.id },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    } catch (error) {
      await prisma.qASweep2Run.update({
        where: { id: run.id },
        data: { 
          status: 'FAILED',
          completedAt: new Date()
        }
      });
    }
  }
}
```

**Procesamiento de Run:**
```typescript
async function processRun(run: QASweep2Run) {
  const config = run.config as QASweep2Config;
  
  // 1. Obtener variaciones a procesar
  const variations = await getVariationsForAnalysis(config);
  
  // 2. Procesar en batches con concurrencia
  const batches = chunk(variations, config.batchSize);
  
  for (const batch of batches) {
    await Promise.all(
      batch.map(v => processVariation(run.id, v))
    ).catch(error => {
      // Log error pero continuar
      console.error('Batch error:', error);
    });
    
    // Actualizar progreso
    await prisma.qASweep2Run.update({
      where: { id: run.id },
      data: {
        processedCount: await countProcessed(run.id)
      }
    });
  }
}
```

**Obtención de variaciones:**
```typescript
async function getVariationsForAnalysis(config: QASweep2Config) {
  // 1. Filtros base
  const where: any = {
    isVisible: true,
    baseQuestion: {
      displaySequence: {
        gte: config.baseQuestionFrom,
        lte: config.baseQuestionTo
      }
    }
  };
  
  // 2. Filtros opcionales por taxonomía
  if (config.specialty || config.topic) {
    where.baseQuestion.aiAnalysis = {};
    if (config.specialty) {
      where.baseQuestion.aiAnalysis.specialty = {
        contains: config.specialty
      };
    }
    if (config.topic) {
      where.baseQuestion.aiAnalysis.topic = {
        contains: config.topic
      };
    }
  }
  
  // 3. Fetch
  const all = await prisma.questionVariation.findMany({
    where,
    include: {
      baseQuestion: {
        include: {
          specialty: true,
          topic: true,
          aiAnalysis: true
        }
      },
      alternatives: true
    },
    orderBy: [
      { baseQuestion: { displaySequence: 'asc' } },
      { variationNumber: 'asc' },
      { version: 'desc' }
    ]
  });
  
  // 4. Deduplicar: mantener solo última versión visible
  const map = new Map();
  for (const v of all) {
    const key = `${v.baseQuestionId}-${v.variationNumber}`;
    const existing = map.get(key);
    if (!existing || v.version > existing.version) {
      map.set(key, v);
    }
  }
  
  return Array.from(map.values());
}
```

#### Fase 4: Procesamiento Individual de Variación

**Función:** `processVariation(runId, variation)`

**Paso 1: Evaluación con GPT-5-mini**

**Prompt:** `backend/prompts/evaluacion_gpt4o_mini.txt`

**Request a OpenAI:**
```typescript
const evaluation = await OpenAIService.callOpenAI({
  model: 'gpt-5-mini',
  messages: [
    {
      role: 'system',
      content: promptEvaluacion
    },
    {
      role: 'user',
      content: JSON.stringify({
        id: variation.displayCode,
        enunciado: variation.enunciado,
        alternativas: variation.alternatives.map(a => ({
          letra: a.letter,
          texto: a.text,
          correcta: a.isCorrect,
          explicacion: a.explanation
        })),
        metadatos: {
          especialidad: variation.baseQuestion.specialty.name,
          tema: variation.baseQuestion.topic.name
        }
      })
    }
  ],
  response_format: { type: 'json_object' }
});

// Parse y validación
const result = JSON.parse(evaluation);
validateEvaluationSchema(result);
```

**Respuesta esperada:**
```typescript
{
  id: "510.3",
  etiquetas: ["error_clinico", "incoherencia_opciones"],
  confianza: 0.85,
  severidad_global: "alta",
  riesgo_seguridad: true,
  diagnostico: "El enunciado presenta inconsistencia...",
  problemas: [
    {
      tipo: "error_clinico",
      ubicacion: "enunciado",
      descripcion: "...",
      gravedad: "critica"
    }
  ]
}
```

**Paso 2: Decisión de Acción**

```typescript
function decideAction(evaluation) {
  // Política de decisión
  if (evaluation.severidad_global === 'ninguna' || 
      evaluation.severidad_global === 'baja') {
    return 'none';  // No hacer nada
  }
  
  if (evaluation.severidad_global === 'critica' || 
      evaluation.riesgo_seguridad) {
    return 'deep_rewrite';  // Reescritura profunda
  }
  
  return 'polish';  // Pulido
}
```

**Paso 3A: Pulido (GPT-5)**

**Prompt:** `backend/prompts/pulido_gpt4o.txt`

**Request:**
```typescript
const correction = await OpenAIService.callOpenAI({
  model: 'gpt-5',
  messages: [
    {
      role: 'system',
      content: promptPulido
    },
    {
      role: 'user',
      content: JSON.stringify({
        ejercicio_original: exerciseData,
        diagnostico: evaluation.diagnostico,
        problemas: evaluation.problemas
      })
    }
  ],
  response_format: { type: 'json_object' }
});
```

**Respuesta esperada:**
```typescript
{
  enunciado_corregido: "...",
  alternativas: [
    {
      letra: "A",
      texto: "...",
      correcta: true,
      explicacion: "..."
    },
    // ... B, C, D, E
  ],
  cambios_realizados: [
    "Corregido género del paciente",
    "Ajustada terminología médica"
  ]
}
```

**Paso 3B: Reescritura Profunda (GPT-5)**

**Prompt:** `backend/prompts/reescritura_profunda_gpt4o.txt`

Similar a pulido pero con instrucciones para cambios más sustanciales.

**Paso 4: Validación de Taxonomía**

```typescript
async function validateAndMapTaxonomy(correction, originalSpecialty, originalTopic) {
  // Si la IA sugiere cambio de taxonomía
  if (correction.nueva_clasificacion) {
    const { especialidad, tema } = correction.nueva_clasificacion;
    
    // Buscar en BD con matching flexible
    const specialty = await findSpecialtyFlexible(especialidad);
    const topic = await findTopicFlexible(tema, specialty.id);
    
    if (specialty && topic) {
      return { specialtyId: specialty.id, topicId: topic.id };
    }
  }
  
  // Mantener taxonomía original
  return {
    specialtyId: originalSpecialty.id,
    topicId: originalTopic.id
  };
}

function findSpecialtyFlexible(name: string) {
  // Matching con normalización de diacríticos y case-insensitive
  const normalized = removeDiacritics(name.toLowerCase());
  
  return prisma.specialty.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { name: { contains: normalized, mode: 'insensitive' } }
      ]
    }
  });
}
```

**Paso 5: Aplicar Corrección como Nueva Versión**

```typescript
async function applyCorrectionsAsNewVersion(
  originalVariation: QuestionVariation,
  correctedContent: any,
  taxonomy: { specialtyId, topicId }
) {
  // 1. Marcar versión actual como invisible
  await prisma.questionVariation.update({
    where: { id: originalVariation.id },
    data: { isVisible: false }
  });
  
  // 2. Crear nueva versión
  const newVersion = await prisma.questionVariation.create({
    data: {
      baseQuestionId: originalVariation.baseQuestionId,
      variationNumber: originalVariation.variationNumber,
      version: originalVariation.version + 1,
      displayCode: originalVariation.displayCode,
      enunciado: correctedContent.enunciado_corregido,
      isVisible: true,
      modifiedAt: new Date(),
      parentVersionId: originalVariation.id
    }
  });
  
  // 3. Crear nuevas alternativas
  for (const alt of correctedContent.alternativas) {
    await prisma.alternative.create({
      data: {
        variationId: newVersion.id,
        letter: alt.letra,
        text: alt.texto,
        isCorrect: alt.correcta,
        explanation: alt.explicacion
      }
    });
  }
  
  // 4. Actualizar taxonomía si cambió
  if (taxonomy) {
    await prisma.baseQuestion.update({
      where: { id: originalVariation.baseQuestionId },
      data: {
        specialtyId: taxonomy.specialtyId,
        topicId: taxonomy.topicId
      }
    });
  }
  
  return newVersion;
}
```

**Paso 6: Guardar Resultado**

```typescript
await prisma.qASweep2Result.create({
  data: {
    runId: runId,
    variationId: variation.id,
    
    // Evaluación
    evaluationTags: evaluation.etiquetas,
    confidenceScore: evaluation.confianza,
    severidadGlobal: evaluation.severidad_global,
    riesgoSeguridad: evaluation.riesgo_seguridad,
    diagnosis: evaluation.diagnostico,
    
    // Corrección
    action: action,
    correctedContent: action !== 'none' ? correction : null,
    
    // Metadata
    metadata: {
      applied: action !== 'none',
      newVersionId: newVersion?.id,
      processingTime: Date.now() - startTime,
      modelEval: 'gpt-5-mini',
      modelFix: action !== 'none' ? 'gpt-5' : null
    }
  }
});
```

#### Fase 5: Generación de Reporte

**Endpoint:** `POST /api/admin/qa-sweep-2/runs/:id/report`

**Proceso:**
1. Fetch todos los resultados del run
2. Calcular estadísticas
3. Generar reporte con GPT-5

**Estadísticas:**
```typescript
const stats = {
  totalProcessed: results.length,
  byAction: {
    none: results.filter(r => r.action === 'none').length,
    polish: results.filter(r => r.action === 'polish').length,
    deep_rewrite: results.filter(r => r.action === 'deep_rewrite').length
  },
  bySeverity: {
    critica: results.filter(r => r.severidadGlobal === 'critica').length,
    alta: results.filter(r => r.severidadGlobal === 'alta').length,
    media: results.filter(r => r.severidadGlobal === 'media').length,
    baja: results.filter(r => r.severidadGlobal === 'baja').length,
    ninguna: results.filter(r => r.severidadGlobal === 'ninguna').length
  },
  safetyRisks: results.filter(r => r.riesgoSeguridad).length,
  topTags: getTopTags(results)
};
```

**Prompt para reporte:**
```typescript
const reportPrompt = `
Eres un analista de control de calidad médica.

Analiza los siguientes resultados de QA Sweep 2.0:

Estadísticas:
${JSON.stringify(stats, null, 2)}

Casos críticos (top 10):
${criticalCases.map(c => `
Ejercicio: ${c.variation.displayCode}
Severidad: ${c.severidadGlobal}
Diagnóstico: ${c.diagnosis}
Acción: ${c.action}
`).join('\n')}

Genera un reporte ejecutivo que incluya:
1. Resumen de hallazgos (2-3 párrafos)
2. Análisis de problemas más frecuentes
3. Casos críticos destacados
4. Recomendaciones para mejora continua
`;

const report = await OpenAIService.generateText({
  model: 'gpt-5',
  messages: [{ role: 'user', content: reportPrompt }],
  maxTokens: 2000
});
```

**Almacenamiento:**
```typescript
await prisma.aIReport.create({
  data: {
    runId: runId,
    reportType: 'qa_sweep_2_summary',
    content: report,
    statistics: stats
  }
});
```

### 5.4 Interfaz Administrativa

**Componente:** `QASweep2Panel.tsx`

**Secciones:**

#### A. Configuración de Nuevo Run
- Inputs: baseQuestionFrom, baseQuestionTo
- Dropdowns: Specialty, Topic (opcionales)
- Sliders: Batch size, Max concurrency
- Botón: "Crear Run"

#### B. Lista de Runs
- Tabla paginada (25 por página)
- Columnas:
  - ID secuencial
  - Rango (e.g., "1-100")
  - Estado (PENDING/RUNNING/COMPLETED/FAILED)
  - Progreso (e.g., "45/100")
  - Fecha creación
- Acciones:
  - "Iniciar Análisis" (si PENDING)
  - "Ver Resultados" (si COMPLETED)
  - "Reporte IA" (si COMPLETED)

#### C. Modal de Resultados
- Estadísticas generales
- Filtros por severidad, tags
- Lista paginada de variaciones procesadas
- Cada item muestra:
  - Display code (e.g., 510.3 v2)
  - Tags
  - Severidad
  - Acción tomada
  - Link a diagnóstico detallado

#### D. Modal de Reporte IA
- Texto completo del reporte GPT-5
- Estadísticas visualizadas
- Botón "Regenerar" (con `regenerate: true`)

### 5.5 Diagnóstico Individual

**Tab adicional:** "Diagnóstico Individual"

**Funcionalidad:**
- Input para ingresar ID numérico (e.g., "510.3")
- Botón "Diagnosticar"
- Toggle "Auto-aplicar correcciones"

**Endpoint:** `POST /api/admin/qa-sweep-2/diagnose`

**Request:**
```typescript
{
  exerciseId: "510.3",  // displayCode
  autoApply: boolean
}
```

**Proceso:**
1. Parse displayCode → baseQuestionId + variationNumber
2. Fetch variación más reciente visible
3. Ejecutar evaluación + corrección (si aplica)
4. Si autoApply: aplicar como nueva versión
5. Retornar resultado con comparativa

**Response:**
```typescript
{
  original: {
    displayCode: "510.3",
    version: 2,
    enunciado: "...",
    alternatives: [...],
    specialty: "...",
    topic: "..."
  },
  evaluation: {
    tags: [...],
    confidence: 0.85,
    severity: "alta",
    diagnosis: "..."
  },
  corrected: {
    displayCode: "510.3",
    version: 3,  // Si se aplicó
    enunciado: "...",
    alternatives: [...],
    specialty: "...",
    topic: "...",
    changes: [...]
  } | null
}
```

**Modal de Comparación:**
- Tabla lado a lado:
  - Original (v2) | Corregido (v3)
- Filas:
  - Ejercicio
  - Enunciado
  - Alternativas A-E
  - Especialidad
  - Tema
- Cambios resaltados en amarillo

---

## 6. Panel Administrativo

### 6.1 Acceso

**Ruta:** `/admin` (requiere rol ADMIN)

**Componentes:**
- `AdminDashboard.tsx` - Layout principal
- `AdminUsersTable.tsx` - Gestión de usuarios
- `AdminPaymentsTable.tsx` - Gestión de pagos
- `ExerciseFactory.tsx` - Fábrica de ejercicios
- `QASweep2Panel.tsx` - Control de calidad

### 6.2 Gestión de Usuarios

**Endpoint:** `GET /api/admin/users`

**Tabla:**
- Email
- Nombre
- Rol
- isVerified / isActive (switches editables)
- Créditos (editable)
- Paquetes (C:X P:Y E:Z)
- Fecha registro
- Acciones

**Funcionalidades:**

#### A. Ver Paquetes (expandible)
Click en "C:5 P:3 E:2" despliega:
- **Controles Activos:**
  - Paquete 5 Controles | Total: 5 | Usados: [input editable] | [Guardar]
- **Pruebas Activas:**
  - Paquete 10 Pruebas | Total: 10 | Usados: [input editable] | [Guardar]
- **Ensayos Activos:**
  - Paquete 3 Ensayos | Total: 3 | Usados: [input editable] | [Guardar]

#### B. Asignar Nuevo Paquete
- **Controles:** [Dropdown con paquetes disponibles] → Asigna automáticamente
- **Pruebas:** [Dropdown]
- **Ensayos:** [Dropdown]

**Endpoints:**
- `PUT /api/admin/users/:userId` - Actualizar usuario
- `PUT /api/admin/users/:userId/control-purchases/:purchaseId` - Actualizar usados
- `POST /api/admin/users/:userId/control-purchases` - Asignar paquete
- `GET /api/admin/control-packages` - Listar paquetes

### 6.3 Gestión de Pagos

**Endpoint:** `GET /api/admin/payments`

**Tabla:**
- ID
- Usuario
- Tipo (CREDITS/CONTROL/EXAM/MOCK_EXAM)
- Monto
- Estado (PENDING/COMPLETED/FAILED/REFUNDED)
- Flow Order
- Fecha
- Acciones

**Funcionalidades:**
- Ver detalles de pago
- "Verificar y acreditar" para PENDING
- Input manual de Flow Order (si falta)

**Endpoints:**
- `POST /api/admin/payments/:id/credit` - Acreditar manualmente

### 6.4 Fábrica de Ejercicios

**Componente:** `ExerciseFactory.tsx`

**Formulario:**
- Textarea: Prompt inicial
- Select: Especialidad
- Select: Tema
- Select: Dificultad (básica/intermedia/avanzada)
- Botón: "Analizar"

**Proceso:**
1. Análisis con GPT-4o
2. Muestra refinamiento sugerido
3. Botón: "Generar 4 variaciones"
4. Genera y almacena ejercicio completo
5. Muestra preview de las 4 variaciones

**Endpoints:**
- `POST /api/admin/exercise-factory/analyze`
- `POST /api/admin/exercise-factory/generate`

---

## 7. Sistema de Pagos

### 7.1 Integración Flow.cl

**Servicio:** `flow.service.ts`

**Configuración:**
```typescript
const config = {
  apiKey: process.env.FLOW_API_KEY,
  secretKey: process.env.FLOW_SECRET_KEY,
  baseUrl: process.env.FLOW_API_BASE,
  urlReturn: `${process.env.BACKEND_URL}/api/payments/flow/return`,
  urlConfirmation: `${process.env.BACKEND_URL}/api/payments/flow/webhook`
};
```

### 7.2 Creación de Pago

**Endpoints:**
- `POST /api/payments/flow/create` - Créditos (400 por $20.000)
- `POST /api/payments/flow/create-control-purchase` - Paquete controles
- `POST /api/payments/flow/create-exam-purchase` - Paquete pruebas
- `POST /api/payments/flow/create-mock-exam-purchase` - Paquete ensayos

**Proceso común:**

1. **Validación de email**:
```typescript
if (!email.includes('@') || email.endsWith('.local')) {
  return res.status(400).json({ 
    error: 'Email inválido para pagos' 
  });
}
```

2. **Creación de Payment**:
```typescript
const payment = await prisma.payment.create({
  data: {
    userId: req.user!.id,
    amount: package.price,
    currency: 'CLP',
    status: 'PENDING',
    packageType: 'CONTROL',  // o EXAM, MOCK_EXAM, CREDITS
    packageId: package.id
  }
});
```

3. **Llamada a Flow.cl**:
```typescript
const flowResponse = await FlowService.createPayment({
  commerceOrder: payment.id,
  subject: `Compra ${package.name}`,
  amount: payment.amount,
  email: user.email,
  urlConfirmation: config.urlConfirmation,
  urlReturn: config.urlReturn
});
```

4. **Actualización con datos de Flow**:
```typescript
await prisma.payment.update({
  where: { id: payment.id },
  data: {
    flowToken: flowResponse.token,
    flowOrder: flowResponse.flowOrder.toString(),
    flowUrl: flowResponse.url
  }
});
```

5. **Redirección a Flow**:
```typescript
res.json({
  paymentId: payment.id,
  flowUrl: flowResponse.url
});
```

### 7.3 Confirmación (Webhook)

**Endpoint:** `POST /api/payments/flow/webhook`

**Request de Flow.cl:**
```typescript
{
  token: string  // Token del pago
}
```

**Proceso:**

1. **Obtener estado del pago de Flow**:
```typescript
const flowStatus = await FlowService.getPaymentStatus(token);
```

2. **Buscar Payment en BD**:
```typescript
const payment = await prisma.payment.findUnique({
  where: { flowToken: token }
});
```

3. **Validar y actualizar**:
```typescript
if (flowStatus.status === 2) {  // 2 = pagado
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'COMPLETED' }
  });
  
  // Acreditar según tipo
  if (payment.packageType === 'CREDITS') {
    await prisma.user.update({
      where: { id: payment.userId },
      data: { credits: { increment: 400 } }
    });
  }
  
  if (payment.packageType === 'CONTROL') {
    // Verificar si ya se creó (idempotencia)
    const existing = await prisma.controlPurchase.findFirst({
      where: {
        userId: payment.userId,
        packageId: payment.packageId,
        purchasedAt: payment.createdAt
      }
    });
    
    if (!existing) {
      const pkg = await prisma.controlPackage.findUnique({
        where: { id: payment.packageId }
      });
      
      await prisma.controlPurchase.create({
        data: {
          userId: payment.userId,
          packageId: payment.packageId,
          controlsTotal: pkg.quantity,
          controlsUsed: 0,
          status: 'ACTIVE'
        }
      });
    }
  }
  
  // Similar para EXAM y MOCK_EXAM
}
```

### 7.4 Verificación Manual (Polling)

**Endpoint:** `GET /api/payments/flow/check/:paymentId`

**Proceso:**
1. Frontend hace polling cada 3s después de volver de Flow
2. Backend consulta estado a Flow.cl
3. Si pagado: acredita y retorna success
4. Si pendiente: retorna pending
5. Si rechazado: retorna failed

**Frontend:**
```typescript
useEffect(() => {
  if (!currentPaymentId) return;
  
  const interval = setInterval(async () => {
    const res = await fetch(`/api/payments/flow/check/${currentPaymentId}`);
    const data = await res.json();
    
    if (data.status === 'COMPLETED') {
      clearInterval(interval);
      setCurrentPaymentId(null);
      // Recargar datos
      loadPackages();
    }
  }, 3000);
  
  return () => clearInterval(interval);
}, [currentPaymentId]);
```

### 7.5 Redirección Post-Pago

**Endpoint:** `GET /api/payments/flow/return`

**Proceso:**
1. Usuario termina en Flow.cl
2. Flow redirige a este endpoint
3. Backend redirige al frontend: `${FRONTEND_URL}/?payment=success`

---

## Apéndice: Variables de Entorno

### Backend (Render)

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=https://eunacomtest.cl

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...

# Flow.cl
FLOW_API_KEY=...
FLOW_SECRET_KEY=...
FLOW_API_BASE=https://www.flow.cl/api
BACKEND_URL=https://eunacom-backend-v3.onrender.com

# OpenAI
OPENAI_API_KEY=...
MODEL_EVAL=gpt-5-mini
MODEL_FIX=gpt-5
QA_SWEEP_VERSION=2.0
```

### Frontend (Vercel)

```bash
VITE_API_URL=https://eunacom-backend-v3.onrender.com
VITE_API_BASE_URL=https://eunacom-backend-v3.onrender.com
```

---

## Conclusión

Este documento describe la arquitectura completa de la plataforma EUNACOM, desde la autenticación hasta el control de calidad con IA. El sistema está diseñado para:

1. **Escalabilidad**: Procesamiento asíncrono con workers
2. **Calidad**: QA Sweep 2.0 automatizado con GPT-5
3. **Monetización**: Múltiples productos (controles, pruebas, ensayos)
4. **Trazabilidad**: Versionado completo de ejercicios
5. **Seguridad**: Autenticación JWT, validación de emails

**Stack moderno, robusto y listo para producción.** 🚀

