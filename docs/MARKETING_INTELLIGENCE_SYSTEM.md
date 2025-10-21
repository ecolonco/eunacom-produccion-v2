# Marketing Intelligence System con IA

> **Documento Técnico Reutilizable** - Sistema automatizado de monitoreo de campañas digitales con análisis de IA

**Versión**: 1.0
**Fecha**: Octubre 2025
**Autor**: Sistema desarrollado con Claude Code
**Aplicable a**: Cualquier plataforma web con campañas de marketing digital

---

## 📋 **TABLA DE CONTENIDOS**

1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Requisitos Previos](#requisitos-previos)
5. [Guía de Implementación](#guía-de-implementación)
6. [APIs y Configuración](#apis-y-configuración)
7. [Modelos de Datos](#modelos-de-datos)
8. [Backend Implementation](#backend-implementation)
9. [Frontend Dashboard](#frontend-dashboard)
10. [Sistema de IA](#sistema-de-ia)
11. [Testing y QA](#testing-y-qa)
12. [Deployment](#deployment)
13. [Mantenimiento](#mantenimiento)
14. [Costos](#costos)
15. [ROI Esperado](#roi-esperado)

---

## 🎯 **DESCRIPCIÓN GENERAL**

### ¿Qué es este sistema?

Un **dashboard inteligente** que:
- 📊 Recopila datos de todas tus campañas de marketing
- 🤖 Analiza automáticamente con IA (GPT-4/Claude)
- 💡 Genera recomendaciones accionables
- 📈 Predice tendencias y resultados
- ⚡ Te alerta de problemas y oportunidades
- 💬 Responde preguntas sobre tus campañas

### Casos de Uso

- Monitoreo de campañas de Google Ads
- Análisis de rendimiento de SEO
- Optimización de conversiones
- Detección temprana de problemas
- A/B testing automatizado
- Predicción de ventas/conversiones
- ROI tracking en tiempo real

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL DATA SOURCES                     │
├─────────────────────────────────────────────────────────────┤
│  Google Ads API  │  Analytics 4  │  Search Console  │  DB   │
└────────┬──────────────────┬─────────────────┬───────────────┘
         │                  │                 │
         └──────────────────┴─────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │       DATA COLLECTION LAYER         │
         │  ├─ Cron Jobs (hourly/daily)       │
         │  ├─ API Wrappers                   │
         │  └─ Data Transformation            │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │       STORAGE & CACHE LAYER         │
         │  ├─ PostgreSQL (historical data)   │
         │  ├─ Redis (real-time cache)        │
         │  └─ Prisma ORM                     │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │       AI ANALYSIS LAYER             │
         │  ├─ OpenAI GPT-4 / Claude API      │
         │  ├─ Trend Analysis                 │
         │  ├─ Anomaly Detection              │
         │  ├─ Recommendations Engine         │
         │  └─ Prediction Models              │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │       API LAYER (REST/GraphQL)      │
         │  ├─ /api/metrics                   │
         │  ├─ /api/recommendations           │
         │  ├─ /api/ai-chat                   │
         │  └─ /api/alerts                    │
         └──────────────────┬──────────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │       FRONTEND DASHBOARD            │
         │  ├─ React/Vue/Angular              │
         │  ├─ Real-time Charts               │
         │  ├─ AI Chat Interface              │
         │  └─ Mobile Responsive              │
         └─────────────────────────────────────┘
```

---

## 💻 **STACK TECNOLÓGICO**

### Backend
- **Runtime**: Node.js 18+ / TypeScript
- **Framework**: Express.js o Fastify
- **ORM**: Prisma
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Queue**: Bull/BullMQ (para jobs)

### Frontend
- **Framework**: React 18+ / Next.js 13+
- **State Management**: Zustand / Redux Toolkit
- **Charts**: Chart.js / Recharts / Victory
- **UI Library**: Tailwind CSS + shadcn/ui
- **HTTP Client**: Axios / TanStack Query

### AI/ML
- **LLM**: OpenAI GPT-4 Turbo / Anthropic Claude 3
- **ML Library** (opcional): TensorFlow.js / scikit-learn
- **Embeddings** (opcional): OpenAI embeddings para semantic search

### DevOps
- **Hosting**: Vercel / Railway / Render
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry / LogRocket
- **Analytics**: PostHog / Mixpanel

---

## ✅ **REQUISITOS PREVIOS**

### Cuentas y Accesos Necesarios

- [ ] Google Ads cuenta activa
- [ ] Google Cloud Project con APIs habilitadas
- [ ] Google Analytics 4 configurado
- [ ] Google Search Console verificado
- [ ] Cuenta de OpenAI con API key (o Anthropic Claude)
- [ ] Base de datos PostgreSQL
- [ ] Redis instance (opcional pero recomendado)

### Conocimientos Técnicos Recomendados

- Desarrollo backend con Node.js/TypeScript
- Experiencia con APIs REST
- Conocimientos básicos de React
- SQL/Prisma ORM
- Git y GitHub

---

## 📖 **GUÍA DE IMPLEMENTACIÓN**

### Timeline General

| Fase | Descripción | Duración | Esfuerzo |
|------|-------------|----------|----------|
| **Fase 0** | Setup y configuración | 2-3 días | 8-12 hrs |
| **Fase 1** | Recopilación de datos | 3-5 días | 16-24 hrs |
| **Fase 2** | Sistema de IA básico | 3-5 días | 20-30 hrs |
| **Fase 3** | Dashboard frontend | 5-7 días | 30-40 hrs |
| **Fase 4** | Features avanzadas | 7-10 días | 40-60 hrs |
| **Fase 5** | Testing y deployment | 3-5 días | 16-24 hrs |

**Total**: 4-6 semanas | 130-190 horas

---

## 🔑 **FASE 0: SETUP Y CONFIGURACIÓN**

### Paso 1: Crear Google Cloud Project

```bash
# 1. Ve a https://console.cloud.google.com
# 2. Crear nuevo proyecto: "marketing-intelligence"
# 3. Habilitar APIs:

# - Google Ads API
# - Google Analytics Data API
# - Google Search Console API
```

### Paso 2: Configurar Credenciales

```bash
# Crear Service Account
# 1. IAM & Admin → Service Accounts
# 2. Create Service Account: "marketing-bot"
# 3. Descargar JSON key

# Guardar en proyecto:
# credentials/google-service-account.json
```

### Paso 3: Variables de Entorno

```bash
# .env
# ===========================================

# Google APIs
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_dev_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890

GOOGLE_ANALYTICS_PROPERTY_ID=123456789
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://www.your-site.com

# AI Provider
OPENAI_API_KEY=sk-...
# O si usas Claude:
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=openai  # o 'anthropic'
AI_MODEL=gpt-4-turbo-preview  # o 'claude-3-opus-20240229'

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/marketing_db

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# App Config
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Alerting (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_ALERT_RECIPIENT=admin@your-site.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Paso 4: Instalar Dependencias

```bash
# Backend
cd backend
npm install --save \
  express \
  typescript \
  @types/node \
  @types/express \
  prisma \
  @prisma/client \
  google-ads-api \
  @google-analytics/data \
  googleapis \
  openai \
  @anthropic-ai/sdk \
  redis \
  bull \
  axios \
  dotenv \
  cors \
  helmet \
  compression \
  winston \
  joi

# Dev dependencies
npm install --save-dev \
  @types/cors \
  ts-node \
  nodemon \
  jest \
  @types/jest \
  supertest \
  @types/supertest
```

---

## 📊 **MODELOS DE DATOS (PRISMA SCHEMA)**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// MARKETING DATA MODELS
// ==========================================

model Campaign {
  id                String              @id @default(cuid())
  externalId        String              @unique // Google Ads campaign ID
  name              String
  status            String              // ENABLED, PAUSED, REMOVED
  budget            Float
  targetCPA         Float?
  startDate         DateTime
  endDate           DateTime?
  metrics           CampaignMetric[]
  recommendations   Recommendation[]
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([externalId])
  @@index([status])
}

model CampaignMetric {
  id              String     @id @default(cuid())
  campaignId      String
  campaign        Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  // Date
  date            DateTime

  // Performance Metrics
  impressions     Int
  clicks          Int
  conversions     Float
  cost            Float      // En micros (divide by 1,000,000)

  // Calculated Metrics
  ctr             Float      // Click-through rate
  cpc             Float      // Cost per click
  cpa             Float?     // Cost per acquisition
  roi             Float?     // Return on investment

  // Quality Metrics
  qualityScore    Float?
  avgPosition     Float?

  createdAt       DateTime   @default(now())

  @@unique([campaignId, date])
  @@index([date])
  @@index([campaignId])
}

model Recommendation {
  id              String     @id @default(cuid())
  campaignId      String?
  campaign        Campaign?  @relation(fields: [campaignId], references: [id], onDelete: SetNull)

  // Classification
  type            String     // 'opportunity', 'warning', 'optimization', 'alert'
  priority        String     // 'critical', 'high', 'medium', 'low'
  category        String     // 'budget', 'targeting', 'creative', 'bidding', 'schedule'

  // Content
  title           String
  description     String     @db.Text
  action          String     @db.Text
  estimatedImpact String?

  // AI Analysis
  aiReasoning     String?    @db.Text
  aiConfidence    Float?     // 0.0 to 1.0

  // Status
  status          String     @default("pending") // pending, applied, dismissed, expired
  appliedAt       DateTime?
  dismissedAt     DateTime?
  expiresAt       DateTime?

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([status])
  @@index([priority])
  @@index([createdAt])
}

model AIAnalysis {
  id              String     @id @default(cuid())

  // Analysis Type
  type            String     // 'daily_summary', 'weekly_report', 'anomaly_detection', 'prediction'

  // Time Period
  startDate       DateTime
  endDate         DateTime

  // AI Generated Content
  summary         String     @db.Text
  insights        Json       // Array of insights
  recommendations Json       // Array of recommendations
  predictions     Json?      // Future predictions

  // Metadata
  model           String     // 'gpt-4', 'claude-3-opus', etc.
  tokensUsed      Int?
  processingTime  Int?       // milliseconds

  createdAt       DateTime   @default(now())

  @@index([type])
  @@index([createdAt])
}

model Alert {
  id              String     @id @default(cuid())

  // Alert Details
  type            String     // 'spike', 'drop', 'threshold', 'anomaly'
  severity        String     // 'critical', 'high', 'medium', 'low'
  title           String
  message         String     @db.Text

  // Trigger Conditions
  metric          String     // 'cpc', 'ctr', 'conversions', 'cost', etc.
  threshold       Float?
  actualValue     Float?
  expectedValue   Float?
  deviation       Float?     // Percentage deviation

  // Response
  status          String     @default("active") // active, acknowledged, resolved
  acknowledgedAt  DateTime?
  resolvedAt      DateTime?
  resolution      String?    @db.Text

  // Notifications
  emailSent       Boolean    @default(false)
  slackSent       Boolean    @default(false)

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([status])
  @@index([severity])
  @@index([createdAt])
}

model ChatMessage {
  id              String     @id @default(cuid())

  // Conversation
  sessionId       String     // Group messages by session
  role            String     // 'user' or 'assistant'
  content         String     @db.Text

  // Context (what data was used)
  contextUsed     Json?      // What metrics/data AI considered

  // Metadata
  model           String?
  tokensUsed      Int?

  createdAt       DateTime   @default(now())

  @@index([sessionId])
  @@index([createdAt])
}

// ==========================================
// CONFIGURATION & SETTINGS
// ==========================================

model MarketingConfig {
  id              String     @id @default(cuid())
  key             String     @unique
  value           Json
  description     String?
  updatedAt       DateTime   @updatedAt

  @@index([key])
}

// ==========================================
// AUDIT LOG
// ==========================================

model AuditLog {
  id              String     @id @default(cuid())
  action          String     // 'recommendation_applied', 'alert_resolved', etc.
  entity          String     // 'campaign', 'recommendation', 'alert'
  entityId        String
  details         Json?
  userId          String?    // If you have user authentication
  createdAt       DateTime   @default(now())

  @@index([action])
  @@index([createdAt])
}
```

### Migrar Database

```bash
# Inicializar Prisma
npx prisma init

# Copiar el schema de arriba a prisma/schema.prisma

# Crear migración
npx prisma migrate dev --name init

# Generar Prisma Client
npx prisma generate
```

---

## 🔌 **APIS Y SERVICIOS**

### 1. Google Ads API Service

```typescript
// src/services/googleAds.service.ts

import { GoogleAdsApi, enums } from 'google-ads-api';

export class GoogleAdsService {
  private client: GoogleAdsApi;
  private customerId: string;

  constructor() {
    this.client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  }

  async getCampaigns(dateRange: { startDate: string; endDate: string }) {
    const customer = this.client.Customer({
      customer_id: this.customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
      ORDER BY metrics.impressions DESC
    `;

    const campaigns = await customer.query(query);
    return this.transformCampaignData(campaigns);
  }

  private transformCampaignData(rawData: any[]) {
    return rawData.map(row => ({
      externalId: row.campaign.id.toString(),
      name: row.campaign.name,
      status: row.campaign.status,
      budget: row.campaign_budget?.amount_micros / 1_000_000 || 0,
      metrics: {
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        conversions: row.metrics.conversions,
        cost: row.metrics.cost_micros / 1_000_000,
        ctr: row.metrics.ctr,
        cpc: row.metrics.average_cpc / 1_000_000,
      },
    }));
  }

  async getKeywordPerformance(campaignId: string) {
    // Similar implementation for keyword-level data
  }

  async getAdPerformance(campaignId: string) {
    // Similar implementation for ad-level data
  }
}
```

### 2. OpenAI Service (IA Analysis)

```typescript
// src/services/openai.service.ts

import OpenAI from 'openai';

export class AIAnalysisService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeMetrics(data: {
    campaigns: any[];
    dateRange: { start: string; end: string };
    context?: string;
  }) {
    const prompt = this.buildAnalysisPrompt(data);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Eres un experto analista de marketing digital especializado en optimización de campañas.

          Tu trabajo es:
          1. Analizar datos de rendimiento de campañas
          2. Identificar tendencias, anomalías y oportunidades
          3. Generar recomendaciones accionables y específicas
          4. Priorizar por impacto potencial

          IMPORTANTE:
          - Sé específico con números y porcentajes
          - Menciona nombres de campañas concretas
          - Da acciones claras y aplicables
          - Estima el impacto de cada recomendación

          Responde SIEMPRE en formato JSON con esta estructura:
          {
            "summary": "Resumen ejecutivo en 2-3 frases",
            "insights": [
              {
                "type": "positive|negative|neutral",
                "title": "Título corto",
                "description": "Descripción detallada",
                "metrics": { "metric": value }
              }
            ],
            "recommendations": [
              {
                "priority": "critical|high|medium|low",
                "category": "budget|targeting|creative|bidding|schedule",
                "title": "Título de la recomendación",
                "description": "Qué hacer y por qué",
                "action": "Pasos específicos a seguir",
                "estimatedImpact": "Impacto esperado (ej: +20% conversiones)",
                "confidence": 0.0-1.0
              }
            ],
            "predictions": {
              "nextWeek": { "conversions": number, "cost": number },
              "trend": "improving|declining|stable"
            }
          }`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const analysis = JSON.parse(response.choices[0].message.content!);
    return analysis;
  }

  private buildAnalysisPrompt(data: any): string {
    return `
PERÍODO DE ANÁLISIS: ${data.dateRange.start} a ${data.dateRange.end}

DATOS DE CAMPAÑAS:
${JSON.stringify(data.campaigns, null, 2)}

${data.context ? `CONTEXTO ADICIONAL:\n${data.context}` : ''}

Por favor analiza estos datos y genera tu reporte en formato JSON.
    `.trim();
  }

  async detectAnomalies(metrics: any[], historicalData: any[]) {
    // Detecta anomalías comparando con datos históricos
    const prompt = `
Analiza estas métricas actuales vs históricas y detecta anomalías:

ACTUAL (últimos 7 días):
${JSON.stringify(metrics, null, 2)}

HISTÓRICO (promedio 30 días previos):
${JSON.stringify(historicalData, null, 2)}

Identifica:
1. Cambios significativos (>20%)
2. Patrones inusuales
3. Posibles causas
4. Acciones recomendadas

Responde en JSON con:
{
  "anomalies": [
    {
      "metric": "nombre de métrica",
      "currentValue": number,
      "expectedValue": number,
      "deviation": percentage,
      "severity": "critical|high|medium|low",
      "possibleCauses": ["causa 1", "causa 2"],
      "recommendations": ["acción 1", "acción 2"]
    }
  ]
}
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content!);
  }

  async chatWithAI(userQuestion: string, context: any) {
    // Chat interface para hacer preguntas sobre las campañas
    const systemPrompt = `
Eres un asistente de marketing inteligente. Tienes acceso a los datos actuales de las campañas del usuario.

DATOS ACTUALES:
${JSON.stringify(context, null, 2)}

Responde preguntas sobre rendimiento, tendencias, recomendaciones.
Sé específico, usa datos concretos, y da respuestas accionables.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
      ],
    });

    return response.choices[0].message.content;
  }
}
```

### 3. Data Collection Service

```typescript
// src/services/dataCollection.service.ts

import { PrismaClient } from '@prisma/client';
import { GoogleAdsService } from './googleAds.service';
import { AIAnalysisService } from './openai.service';

const prisma = new PrismaClient();

export class DataCollectionService {
  private googleAds: GoogleAdsService;
  private ai: AIAnalysisService;

  constructor() {
    this.googleAds = new GoogleAdsService();
    this.ai = new AIAnalysisService();
  }

  async collectDailyMetrics() {
    console.log('🔄 Collecting daily metrics...');

    const today = new Date().toISOString().split('T')[0];
    const campaigns = await this.googleAds.getCampaigns({
      startDate: today,
      endDate: today,
    });

    for (const campaign of campaigns) {
      // Upsert campaign
      await prisma.campaign.upsert({
        where: { externalId: campaign.externalId },
        update: {
          name: campaign.name,
          status: campaign.status,
          budget: campaign.budget,
        },
        create: {
          externalId: campaign.externalId,
          name: campaign.name,
          status: campaign.status,
          budget: campaign.budget,
          startDate: new Date(),
        },
      });

      // Create metric record
      const dbCampaign = await prisma.campaign.findUnique({
        where: { externalId: campaign.externalId },
      });

      if (dbCampaign) {
        await prisma.campaignMetric.create({
          data: {
            campaignId: dbCampaign.id,
            date: new Date(today),
            impressions: campaign.metrics.impressions,
            clicks: campaign.metrics.clicks,
            conversions: campaign.metrics.conversions,
            cost: campaign.metrics.cost,
            ctr: campaign.metrics.ctr,
            cpc: campaign.metrics.cpc,
            cpa: campaign.metrics.conversions > 0
              ? campaign.metrics.cost / campaign.metrics.conversions
              : null,
          },
        });
      }
    }

    console.log('✅ Daily metrics collected');
  }

  async runDailyAnalysis() {
    console.log('🤖 Running AI analysis...');

    // Get last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const metrics = await prisma.campaignMetric.findMany({
      where: {
        date: { gte: sevenDaysAgo },
      },
      include: {
        campaign: true,
      },
    });

    // Analyze with AI
    const analysis = await this.ai.analyzeMetrics({
      campaigns: metrics,
      dateRange: {
        start: sevenDaysAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
    });

    // Save analysis
    await prisma.aIAnalysis.create({
      data: {
        type: 'daily_summary',
        startDate: sevenDaysAgo,
        endDate: new Date(),
        summary: analysis.summary,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        predictions: analysis.predictions,
        model: 'gpt-4-turbo-preview',
      },
    });

    // Save recommendations
    for (const rec of analysis.recommendations) {
      await prisma.recommendation.create({
        data: {
          type: this.getRecommendationType(rec.priority),
          priority: rec.priority,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          action: rec.action,
          estimatedImpact: rec.estimatedImpact,
          aiReasoning: rec.description,
          aiConfidence: rec.confidence,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }

    console.log('✅ AI analysis completed');
  }

  private getRecommendationType(priority: string): string {
    if (priority === 'critical' || priority === 'high') return 'opportunity';
    return 'optimization';
  }
}
```

### 4. Cron Jobs Setup

```typescript
// src/jobs/scheduler.ts

import cron from 'node-cron';
import { DataCollectionService } from '../services/dataCollection.service';

const collector = new DataCollectionService();

export function setupCronJobs() {
  // Collect metrics every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Hourly metrics collection triggered');
    try {
      await collector.collectDailyMetrics();
    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  });

  // Run AI analysis daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Daily AI analysis triggered');
    try {
      await collector.runDailyAnalysis();
    } catch (error) {
      console.error('❌ Error running AI analysis:', error);
    }
  });

  // Check for anomalies every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    console.log('⏰ Anomaly detection triggered');
    // Implement anomaly detection logic
  });

  console.log('✅ Cron jobs scheduled');
}
```

---

## 🌐 **BACKEND API ENDPOINTS**

```typescript
// src/routes/marketing.routes.ts

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AIAnalysisService } from '../services/openai.service';

const router = express.Router();
const prisma = new PrismaClient();
const ai = new AIAnalysisService();

// ==========================================
// GET DASHBOARD DATA
// ==========================================

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get metrics for last 7 days
    const metrics = await prisma.campaignMetric.findMany({
      where: {
        date: { gte: sevenDaysAgo },
      },
      include: {
        campaign: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate aggregates
    const totals = metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
        cost: acc.cost + m.cost,
      }),
      { impressions: 0, clicks: 0, conversions: 0, cost: 0 }
    );

    const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCPC = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    const avgCPA = totals.conversions > 0 ? totals.cost / totals.conversions : 0;

    res.json({
      success: true,
      data: {
        summary: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          cost: totals.cost,
          ctr: avgCTR,
          cpc: avgCPC,
          cpa: avgCPA,
        },
        dailyMetrics: metrics,
        period: {
          start: sevenDaysAgo.toISOString(),
          end: today.toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET RECOMMENDATIONS
// ==========================================

router.get('/recommendations', async (req, res) => {
  try {
    const { status = 'pending', priority } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // critical first
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// APPLY RECOMMENDATION
// ==========================================

router.post('/recommendations/:id/apply', async (req, res) => {
  try {
    const { id } = req.params;

    const recommendation = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'applied',
        appliedAt: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        action: 'recommendation_applied',
        entity: 'recommendation',
        entityId: id,
        details: recommendation,
      },
    });

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CHAT WITH AI
// ==========================================

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Get context (recent metrics)
    const context = await prisma.campaignMetric.findMany({
      where: {
        date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { campaign: true },
    });

    // Get AI response
    const response = await ai.chatWithAI(message, context);

    // Save chat message
    await prisma.chatMessage.createMany({
      data: [
        {
          sessionId,
          role: 'user',
          content: message,
        },
        {
          sessionId,
          role: 'assistant',
          content: response!,
          model: 'gpt-4-turbo-preview',
        },
      ],
    });

    res.json({
      success: true,
      data: {
        message: response,
        sessionId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET ALERTS
// ==========================================

router.get('/alerts', async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    const alerts = await prisma.alert.findMany({
      where: { status: status as string },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// TRIGGER MANUAL ANALYSIS
// ==========================================

router.post('/analyze', async (req, res) => {
  try {
    const collector = new DataCollectionService();
    await collector.runDailyAnalysis();

    res.json({
      success: true,
      message: 'Analysis triggered successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## 🎨 **FRONTEND DASHBOARD (REACT)**

### Main Dashboard Component

```tsx
// src/components/MarketingDashboard.tsx

import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import axios from 'axios';

interface DashboardData {
  summary: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number;
    cpc: number;
    cpa: number;
  };
  dailyMetrics: any[];
}

export function MarketingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/marketing/dashboard');
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (!data) return <div>No hay datos disponibles</div>;

  return (
    <div className="dashboard">
      <h1 className="text-3xl font-bold mb-6">Marketing Intelligence</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          title="Impresiones"
          value={data.summary.impressions.toLocaleString()}
          icon="👁️"
        />
        <KPICard
          title="Clicks"
          value={data.summary.clicks.toLocaleString()}
          icon="🖱️"
        />
        <KPICard
          title="Conversiones"
          value={data.summary.conversions.toFixed(0)}
          icon="✅"
        />
        <KPICard
          title="CTR"
          value={`${data.summary.ctr.toFixed(2)}%`}
          icon="📊"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Conversiones Diarias</h2>
          <ConversionChart data={data.dailyMetrics} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Costo por Click</h2>
          <CPCChart data={data.dailyMetrics} />
        </div>
      </div>

      {/* Recommendations */}
      <RecommendationsPanel />

      {/* AI Chat */}
      <AIChat />
    </div>
  );
}

function KPICard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
```

### Recommendations Panel

```tsx
// src/components/RecommendationsPanel.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Recommendation {
  id: string;
  priority: string;
  title: string;
  description: string;
  action: string;
  estimatedImpact: string;
  status: string;
}

export function RecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    const response = await axios.get('/api/marketing/recommendations');
    setRecommendations(response.data.data);
  };

  const applyRecommendation = async (id: string) => {
    await axios.post(`/api/marketing/recommendations/${id}/apply`);
    fetchRecommendations(); // Refresh
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-2xl font-bold mb-4">🤖 Recomendaciones de IA</h2>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`border-l-4 p-4 rounded ${getPriorityColor(rec.priority)}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{rec.title}</h3>
                <p className="text-gray-700 mt-2">{rec.description}</p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Acción:</strong> {rec.action}
                </p>
                {rec.estimatedImpact && (
                  <p className="text-sm text-green-600 mt-1">
                    <strong>Impacto estimado:</strong> {rec.estimatedImpact}
                  </p>
                )}
              </div>

              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => applyRecommendation(rec.id)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Aplicar
                </button>
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'border-red-500 bg-red-50';
    case 'high':
      return 'border-orange-500 bg-orange-50';
    case 'medium':
      return 'border-yellow-500 bg-yellow-50';
    default:
      return 'border-blue-500 bg-blue-50';
  }
}
```

### AI Chat Component

```tsx
// src/components/AIChat.tsx

import React, { useState } from 'react';
import axios from 'axios';

export function AIChat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/marketing/chat', {
        message: input,
        sessionId: 'session-' + Date.now(), // Generate proper session ID
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.data.message },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">💬 Consulta a la IA</h2>

      <div className="h-96 overflow-y-auto mb-4 border rounded p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-center">
            Pregunta cualquier cosa sobre tus campañas...
          </p>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-12'
                : 'bg-gray-100 mr-12'
            }`}
          >
            <p className="text-sm font-semibold mb-1">
              {msg.role === 'user' ? 'Tú' : '🤖 IA'}
            </p>
            <p>{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="bg-gray-100 mr-12 p-3 rounded">
            <p className="text-sm font-semibold mb-1">🤖 IA</p>
            <p className="text-gray-500">Pensando...</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ej: ¿Por qué bajaron las conversiones esta semana?"
          className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
```

---

## 🚀 **DEPLOYMENT**

### Vercel (Frontend + Backend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables en Vercel

```bash
# Settings → Environment Variables
# Agregar todas las variables del .env
```

### Database (Render/Railway/Supabase)

```bash
# Usar Render para PostgreSQL
# https://render.com

# O Railway
# https://railway.app

# Copiar DATABASE_URL a Vercel
```

---

## 💰 **COSTOS MENSUALES ESTIMADOS**

| Servicio | Costo Mensual | Notas |
|----------|---------------|-------|
| **Vercel Pro** | $20 USD | Hosting frontend + serverless |
| **Render PostgreSQL** | $7-25 USD | Según uso |
| **Redis Cloud** | $0-10 USD | Free tier disponible |
| **OpenAI API** | $10-50 USD | Según volumen de análisis |
| **Google Ads API** | Gratis | ✅ |
| **Google Analytics API** | Gratis | ✅ |
| **Total** | **$37-105 USD/mes** | ~$30,000-85,000 CLP |

---

## 📈 **ROI ESPERADO**

### Ahorros Mensuales
- ⏰ **Tiempo de análisis**: 20 hrs/mes → $0 (automatizado)
- 💰 **Gasto desperdiciado en ads**: -20% → $40,000+ CLP/mes
- 📊 **Mejora en conversiones**: +15% → Valor variable según negocio

### ROI Conservador
- **Inversión**: $60,000 CLP/mes (promedio)
- **Retorno**: $100,000+ CLP/mes (ahorro + mejoras)
- **ROI**: **166%+**

---

## 🎓 **PRÓXIMOS PASOS**

### Para EUNACOM Test específicamente:

1. ✅ Configurar Google Cloud Project
2. ✅ Conectar Google Ads API
3. ✅ Setup base de datos
4. ✅ Implementar collectors
5. ✅ Integrar OpenAI
6. ✅ Crear dashboard frontend
7. ✅ Deploy a producción
8. ✅ Monitorear y ajustar

---

## 📞 **SOPORTE**

- **Documentación**: Este archivo
- **Issues**: GitHub Issues del proyecto
- **Updates**: Revisar este documento periódicamente

---

## 📝 **CHANGELOG**

- **v1.0** (Octubre 2025): Versión inicial del documento

---

**Desarrollado con 🤖 Claude Code**
