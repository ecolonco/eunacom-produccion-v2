# Marketing Intelligence System

Sistema de inteligencia de marketing con análisis automático mediante IA para optimización de campañas publicitarias.

## 📁 Estructura del Módulo

```
src/marketing/
├── controllers/      # Controladores de endpoints REST
├── services/         # Servicios de integración (Google Ads, Analytics, AI)
├── routes/          # Definición de rutas API
├── types/           # Definiciones de tipos TypeScript
├── utils/           # Utilidades y configuración
├── jobs/            # Cron jobs para automatización
└── README.md        # Esta documentación
```

## 🚀 Configuración Inicial

### 1. Variables de Entorno

Copia las variables de `.env.example` a tu archivo `.env` y configúralas:

```bash
# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CLIENT_ID=your-client-id
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890

# Google Analytics 4
GA4_PROPERTY_ID=123456789
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/google-service-account.json

# AI Analysis
OPENAI_API_KEY=sk-your-openai-key
AI_ANALYSIS_OPENAI_MODEL=gpt-4-turbo-preview

# Features
MARKETING_INTELLIGENCE_ENABLED=true
ENABLE_CRON_JOBS=true
```

### 2. Obtener Credenciales de Google Ads

1. **Developer Token**:
   - Ir a [Google Ads API Center](https://ads.google.com/aw/apicenter)
   - Solicitar token de desarrollador
   - Esperar aprobación (puede tomar 1-2 días)

2. **OAuth2 Credentials**:
   - Ir a [Google Cloud Console](https://console.cloud.google.com)
   - Crear nuevo proyecto
   - Habilitar Google Ads API
   - Crear credenciales OAuth 2.0
   - Descargar Client ID y Client Secret

3. **Refresh Token**:
   ```bash
   # Usar la herramienta oficial de Google
   npm install -g google-ads-api
   google-ads-api generate-refresh-token
   ```

### 3. Configurar Google Analytics 4

1. Crear Service Account en Google Cloud Console
2. Descargar JSON de credenciales
3. Agregar service account como usuario en GA4 con rol "Viewer"
4. Guardar JSON en `backend/credentials/google-service-account.json`

### 4. Ejecutar Migraciones

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add_marketing_intelligence
```

## 📊 Uso del Sistema

### API Endpoints

Una vez implementado completamente, los endpoints disponibles serán:

```
GET    /api/marketing/campaigns              # Listar campañas
GET    /api/marketing/campaigns/:id          # Detalles de campaña
GET    /api/marketing/metrics                # Métricas agregadas
GET    /api/marketing/analysis/daily         # Análisis diario de IA
GET    /api/marketing/analysis/weekly        # Análisis semanal de IA
GET    /api/marketing/recommendations        # Recomendaciones activas
POST   /api/marketing/recommendations/:id/apply  # Aplicar recomendación
GET    /api/marketing/alerts                 # Alertas activas
POST   /api/marketing/alerts/:id/resolve     # Resolver alerta
POST   /api/marketing/chat                   # Chat con IA
```

### Ejemplo de Uso

```typescript
import { MarketingService } from './services/marketing.service';

const service = new MarketingService();

// Obtener métricas de campaña
const metrics = await service.getCampaignMetrics({
  campaignId: 'campaign-123',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// Solicitar análisis de IA
const analysis = await service.requestAIAnalysis({
  type: 'DAILY',
  period: '2024-01-15'
});

// Chatear con la IA
const response = await service.chat({
  sessionId: 'user-session-123',
  message: '¿Cómo están rindiendo mis campañas esta semana?'
});
```

## 🤖 Sistema de Análisis con IA

El sistema utiliza GPT-4 (o Claude 3) para:

1. **Análisis Diario**: Resumen automático cada mañana
2. **Análisis Semanal**: Tendencias y comparativas semanales
3. **Recomendaciones**: Sugerencias de optimización basadas en datos
4. **Alertas**: Detección de anomalías y problemas
5. **Chat Interactivo**: Consultas en lenguaje natural

### Ejemplo de Análisis Generado

```
📊 Análisis Diario - 20 de Octubre 2024

Resumen:
Las campañas muestran un rendimiento estable con ROI de 185%, superando
el promedio histórico de 165%. Se detectó una mejora del 12% en la tasa
de conversión comparado con la semana anterior.

Insights Clave:
✅ Campaña "EUNACOM Preparación" tuvo CTR de 4.2% (+15% vs promedio)
✅ Costo por conversión bajó a $2,850 CLP (-8% vs meta)
⚠️ Campaña "Ensayos Premium" muestra fatiga creativa (CTR -5%)

Recomendaciones:
1. [ALTA] Aumentar presupuesto de "EUNACOM Preparación" en 20%
2. [MEDIA] Refrescar creatividades de "Ensayos Premium"
3. [BAJA] Optimizar horarios de "Controles Online"
```

## 🕐 Automatización con Cron Jobs

Los siguientes jobs se ejecutan automáticamente:

- **Cada hora**: Recolectar métricas de Google Ads y GA4
- **8:00 AM diario**: Generar análisis diario con IA
- **Lunes 9:00 AM**: Generar análisis semanal con IA
- **Cada 15 min**: Detectar anomalías y generar alertas

Configurar en `.env`:
```bash
CRON_COLLECT_METRICS="0 * * * *"
CRON_DAILY_AI_ANALYSIS="0 8 * * *"
CRON_WEEKLY_AI_ANALYSIS="0 9 * * 1"
```

## 💰 Estimación de Costos

### Costos mensuales estimados:

1. **OpenAI GPT-4 Turbo**:
   - Análisis diario: ~10K tokens/día = $0.30/día = $9/mes
   - Análisis semanal: ~30K tokens/semana = $3.60/mes
   - Chat interactivo: ~100K tokens/mes = $9/mes
   - **Total**: ~$22/mes

2. **Google Cloud APIs**:
   - Google Ads API: Gratis
   - Google Analytics 4 API: Gratis
   - **Total**: $0/mes

3. **Infraestructura** (si no existe):
   - Vercel Pro: $20/mes
   - PostgreSQL (Supabase/Neon): $7-25/mes
   - **Total**: $27-45/mes

**Total estimado**: $49-67 USD/mes (~$40,000-55,000 CLP)

### ROI Esperado:

Si optimizas tus campañas y:
- Reduces CPA en 10% → Ahorro de ~$100-200 USD/mes
- Aumentas conversiones en 15% → Ingresos adicionales
- Detectas problemas 24 hrs antes → Evitas gastos desperdiciados

**ROI estimado**: 200-400% en el primer mes

## 🔒 Seguridad

- Todas las API keys deben estar en `.env` (nunca en código)
- Usar HTTPS en producción
- Implementar rate limiting en endpoints
- Validar permisos de usuario (solo ADMIN puede acceder)
- Cifrar credenciales sensibles en base de datos

## 📚 Próximos Pasos

### Fase 1: Data Collection Layer
- [ ] Implementar GoogleAdsService
- [ ] Implementar GoogleAnalyticsService
- [ ] Implementar SearchConsoleService
- [ ] Crear job de recolección automática

### Fase 2: AI Analysis System
- [ ] Implementar AIAnalysisService
- [ ] Crear prompts para análisis
- [ ] Implementar sistema de recomendaciones
- [ ] Implementar detección de anomalías

### Fase 3: Frontend Dashboard
- [ ] Crear componentes React
- [ ] Implementar gráficas con Chart.js
- [ ] Crear interfaz de chat con IA
- [ ] Implementar panel de alertas

## 📖 Recursos Adicionales

- [Documentación Completa](../../../docs/MARKETING_INTELLIGENCE_SYSTEM.md)
- [Google Ads API Docs](https://developers.google.com/google-ads/api/docs/start)
- [Google Analytics 4 API](https://developers.google.com/analytics/devguides/reporting/data/v1)
- [OpenAI API](https://platform.openai.com/docs/api-reference)

## 🆘 Troubleshooting

### Error: "GOOGLE_ADS_DEVELOPER_TOKEN no está configurado"
- Verifica que `.env` tenga la variable configurada
- Reinicia el servidor después de modificar `.env`

### Error: "Invalid refresh token"
- Regenera el refresh token con `google-ads-api generate-refresh-token`
- Verifica que los scopes sean correctos

### Error: "Service account permission denied"
- Asegúrate de agregar el service account en GA4
- Verificar que tenga rol "Viewer" o superior

## 📝 Licencia

Este módulo es parte de EUNACOM Platform - Uso interno solamente.
