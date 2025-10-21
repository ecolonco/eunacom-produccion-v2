# EUNACOM Marketing Intelligence System
## Documentación de Diseño - Google Ads API Integration

**Empresa:** EUNACOMTEST
**Sitio Web:** https://eunacomtest.cl
**Fecha:** Octubre 2025
**Versión:** 1.0

---

## 1. DESCRIPCIÓN GENERAL

El **EUNACOM Marketing Intelligence System** es una plataforma interna de análisis y reporting para optimizar campañas publicitarias de Google Ads.

### Objetivo
Centralizar métricas de marketing digital en un dashboard unificado que permita:
- Monitorear rendimiento de campañas en tiempo real
- Generar reportes automáticos con análisis de IA
- Recibir recomendaciones accionables para optimización
- Visualizar tendencias y patrones de rendimiento

### Usuario Final
Equipo interno de marketing de EUNACOMTEST (3-5 usuarios)

---

## 2. ARQUITECTURA DEL SISTEMA

### Componentes Principales

```
┌─────────────────────────────────────────────────────┐
│              Frontend Dashboard                      │
│         (React + TypeScript + Recharts)             │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ REST API
                  │
┌─────────────────▼───────────────────────────────────┐
│              Backend API                             │
│         (Node.js + Express + Prisma)                │
└─────────────────┬───────────────────────────────────┘
                  │
     ┌────────────┼────────────┬──────────────┐
     │            │            │              │
     ▼            ▼            ▼              ▼
┌─────────┐  ┌──────────┐ ┌────────────┐ ┌──────────┐
│ Google  │  │ Google   │ │  OpenAI    │ │PostgreSQL│
│  Ads    │  │Analytics │ │    API     │ │ Database │
│  API    │  │ 4 API    │ │            │ │          │
└─────────┘  └──────────┘ └────────────┘ └──────────┘
```

### Stack Tecnológico
- **Backend:** Node.js 20+ con TypeScript
- **Framework:** Express.js
- **Base de datos:** PostgreSQL 15+
- **ORM:** Prisma
- **Librerías de integración:**
  - `google-ads-api` v16.0.0
  - `@google-analytics/data` v4.0.0
  - `openai` v4.0.0

---

## 3. INTEGRACIÓN CON GOOGLE ADS API

### 3.1 Autenticación

**Método:** OAuth 2.0 con Refresh Token

**Credenciales:**
- **Developer Token:** Almacenado de forma segura en variables de entorno
- **Client ID / Client Secret:** OAuth 2.0 credentials de Google Cloud Project
- **Refresh Token:** Generado una vez, almacenado encriptado
- **Customer ID:** 725-201-2286 (MCC Account)

**Flujo de autenticación:**
1. Refresh token almacenado se usa para obtener access token
2. Access token se renueva automáticamente antes de expirar
3. No se requiere intervención manual del usuario

### 3.2 Operaciones de API

**SOLO LECTURA - No se modifican campañas**

#### Endpoints Utilizados:

**1. GoogleAdsService.ReportingService**
```
Queries GAQL (Google Ads Query Language)
- SELECT campaign metrics
- SELECT ad_group metrics
- SELECT keyword_view data
```

**2. Métricas Recolectadas:**
- Impresiones (impressions)
- Clicks (clicks)
- Conversiones (conversions)
- Costo (cost_micros)
- CTR (ctr)
- CPC promedio (average_cpc)
- Valor de conversiones (conversions_value)

**3. Recursos Accedidos:**
- `campaign` - Información de campañas
- `campaign_budget` - Presupuestos
- `ad_group` - Grupos de anuncios
- `ad_group_criterion` - Criterios (keywords)
- `keyword_view` - Rendimiento de palabras clave
- `customer` - Información de cuenta

### 3.3 Tipos de Campaña Soportados

La herramienta analiza **todos los tipos de campaña**:
- Búsqueda (Search)
- Display
- Video (YouTube)
- Shopping
- Rendimiento máximo (Performance Max)
- Descubrimiento (Discovery)
- App campaigns

### 3.4 Frecuencia de Acceso

- **Sincronización automática:** Cada 60 minutos (configurable)
- **Queries manuales:** Bajo demanda del usuario
- **Rate limiting:** Respeta límites de API de Google
- **Caché:** 15 minutos para reducir llamadas

### 3.5 Ejemplo de Query GAQL

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.cost_micros,
  metrics.ctr,
  metrics.average_cpc
FROM campaign
WHERE campaign.status != 'REMOVED'
  AND segments.date BETWEEN '2025-10-01' AND '2025-10-20'
ORDER BY metrics.impressions DESC
```

---

## 4. FUNCIONALIDADES PRINCIPALES

### 4.1 Dashboard de Métricas
- **Vista general:** KPIs principales (gasto, conversiones, ROI)
- **Gráficos de tendencia:** Evolución temporal de métricas
- **Comparación:** Período actual vs. anterior
- **Filtros:** Por campaña, fecha, tipo

### 4.2 Reporting Automatizado
- **Reportes diarios:** Resumen de rendimiento del día anterior
- **Reportes semanales:** Análisis semanal con tendencias
- **Reportes mensuales:** Overview mensual con comparativa
- **Exportación:** PDF, Excel, CSV

### 4.3 Análisis con IA (OpenAI GPT-4)
- **Detección de anomalías:** Identificar cambios significativos (>20%)
- **Insights automáticos:** Análisis de rendimiento por campaña
- **Recomendaciones priorizadas:** Sugerencias accionables con impacto estimado
- **Predicciones:** Tendencias futuras basadas en datos históricos

### 4.4 Sistema de Recomendaciones
- **Categorías:**
  - Optimización de presupuesto
  - Ajuste de keywords
  - Mejora de anuncios
  - Refinamiento de targeting
  - Estrategia de puja
  - Optimización de horarios

- **Priorización:**
  - CRITICAL: Acción inmediata requerida
  - HIGH: Implementar en 7 días
  - MEDIUM: Implementar en 14 días
  - LOW: Mejora opcional

---

## 5. ALMACENAMIENTO DE DATOS

### 5.1 Base de Datos PostgreSQL

**Modelos principales:**
- `Campaign` - Campañas sincronizadas
- `CampaignMetric` - Métricas diarias por campaña
- `Recommendation` - Recomendaciones generadas por IA
- `MarketingAIAnalysis` - Análisis históricos de IA

### 5.2 Retención de Datos
- **Métricas diarias:** 90 días (configurable)
- **Análisis de IA:** Permanente
- **Recomendaciones:** 90 días desde creación
- **Logs de auditoría:** 180 días

---

## 6. SEGURIDAD Y PRIVACIDAD

### 6.1 Seguridad de Credenciales
- ✅ Variables de entorno (`.env`) - no versionadas
- ✅ Refresh tokens encriptados en base de datos
- ✅ Acceso mediante HTTPS exclusivamente
- ✅ Validación de permisos por usuario

### 6.2 Acceso a Datos
- **Solo lectura:** No se modifican campañas ni configuraciones
- **Datos propios:** Solo accede a cuentas del MCC 725-201-2286
- **Sin terceros:** Datos no se comparten con entidades externas
- **Cumplimiento:** Siguiendo políticas de Google Ads API

### 6.3 Usuarios Autorizados
- Equipo de marketing interno (3-5 personas)
- Autenticación con JWT
- Roles: Admin, Marketing Manager, Analyst

---

## 7. FLUJO DE TRABAJO TÍPICO

### Caso de Uso: Análisis Semanal Automatizado

```
1. CRON JOB SE EJECUTA
   ↓
2. SINCRONIZAR MÉTRICAS
   - Conectar a Google Ads API
   - Obtener métricas de últimos 7 días
   - Guardar en base de datos
   ↓
3. ANALIZAR CON IA
   - OpenAI GPT-4 analiza métricas
   - Detecta anomalías y patrones
   - Genera insights y recomendaciones
   ↓
4. ALMACENAR RESULTADOS
   - Guardar análisis en BD
   - Crear recomendaciones priorizadas
   ↓
5. NOTIFICAR USUARIOS
   - Email con resumen ejecutivo
   - Dashboard actualizado
   - Alertas para items críticos
```

---

## 8. LIMITACIONES Y ALCANCE

### Operaciones NO Realizadas
- ❌ Creación de cuentas de Google Ads
- ❌ Creación de campañas
- ❌ Modificación de campañas existentes
- ❌ Gestión de presupuestos
- ❌ Cambio de pujas o keywords
- ❌ Aprobación/rechazo de anuncios

### Operaciones Realizadas
- ✅ Lectura de métricas de campañas
- ✅ Análisis de rendimiento
- ✅ Generación de reportes
- ✅ Recomendaciones de optimización
- ✅ Visualización de datos
- ✅ Detección de anomalías

---

## 9. MÉTRICAS DE RENDIMIENTO

### 9.1 Performance Esperado
- **Tiempo de sincronización:** < 30 segundos por campaña
- **Generación de reporte:** < 10 segundos
- **Análisis de IA:** < 60 segundos
- **Latencia de dashboard:** < 2 segundos

### 9.2 Volumen de Datos
- **Campañas monitoreadas:** 1-20
- **Métricas por día:** ~500 registros
- **Análisis de IA por mes:** ~8 (diario + semanal)
- **API calls por día:** ~100-200

---

## 10. ROADMAP Y FUTURAS MEJORAS

### Fase 1 (Actual)
- ✅ Integración con Google Ads API
- ✅ Dashboard básico de métricas
- ✅ Análisis con IA (OpenAI)
- ✅ Sistema de recomendaciones

### Fase 2 (Q1 2026)
- 🔄 Integración con Google Analytics 4
- 🔄 Integración con Google Search Console
- 🔄 Reportes personalizados por usuario
- 🔄 Alertas en tiempo real

### Fase 3 (Q2 2026)
- ⏳ Predicciones de conversión con ML
- ⏳ A/B testing de recomendaciones
- ⏳ Integración con CRM
- ⏳ API pública para extensiones

---

## 11. SOPORTE Y MANTENIMIENTO

### Equipo Responsable
- **Desarrollador principal:** Eduardo Colón (ecolonco@gmail.com)
- **Empresa:** EUNACOMTEST
- **Tipo:** Desarrollo interno (no outsourcing)

### Actualizaciones
- **Código:** Versionado con Git/GitHub
- **Dependencias:** Actualización mensual de seguridad
- **API clients:** Actualización trimestral

---

## 12. CUMPLIMIENTO Y POLÍTICAS

### Google Ads API Policies
- ✅ Solo lectura de datos propios
- ✅ No modificación de campañas sin intervención humana
- ✅ Almacenamiento seguro de credenciales
- ✅ Respeto a rate limits
- ✅ Uso interno exclusivo (no reventa de datos)

### GDPR / Privacidad
- ✅ Datos almacenados en servidores seguros
- ✅ Acceso restringido a usuarios autorizados
- ✅ No se comparten datos con terceros
- ✅ Política de retención de datos definida

---

## 13. CONTACTO

**Nombre de Contacto:** Eduardo Colón
**Email:** ecolonco@gmail.com
**Empresa:** EUNACOMTEST
**Sitio Web:** https://eunacomtest.cl
**Ubicación:** Chile

**Google Ads MCC Account:** 725-201-2286
**Google Cloud Project:** EUNACOM Platform

---

## ANEXOS

### A. Diagrama de Flujo de Datos

```
Usuario
  │
  ▼
┌─────────────────┐
│ Frontend React  │
│   Dashboard     │
└────────┬────────┘
         │
         │ HTTPS/REST
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (Node.js)      │
└────┬───────┬────┘
     │       │
     │       └──────────┐
     │                  │
     ▼                  ▼
┌─────────────┐   ┌──────────────┐
│  Google     │   │   OpenAI     │
│  Ads API    │   │   GPT-4      │
│             │   │              │
│ • Campaigns │   │ • Analysis   │
│ • Metrics   │   │ • Insights   │
│ • Keywords  │   │ • Predictions│
└─────────────┘   └──────────────┘
```

### B. Ejemplo de Recomendación Generada

```json
{
  "priority": "high",
  "category": "keywords",
  "title": "Optimizar palabras clave de bajo rendimiento",
  "description": "3 keywords tienen CTR <1% pero consumen 15% del presupuesto",
  "action": "Pausar o ajustar puja de: 'preparacion eunacom', 'curso medicina', 'examen medico'",
  "estimatedImpact": "+12% ROI, -$50,000 CLP/mes en gasto desperdiciado",
  "confidence": 0.87
}
```

---

**Última actualización:** Octubre 2025
**Documento preparado para:** Google Ads API Standard Access Application
