# 🚀 **Guía de Deployment EUNACOM en Render**

## **📋 Resumen del Plan**

Esta guía te llevará paso a paso para desplegar la plataforma EUNACOM completa en Render con:
- ✅ Base de datos PostgreSQL
- ✅ Backend API (Node.js + Express + Prisma)
- ✅ Frontend React (Vite)
- ✅ Exercise Factory con DeepSeek AI

---

## **🗂️ Arquitectura del Deployment**

```
EUNACOM Production Stack
├── 🗄️  PostgreSQL Database (Render Managed)
│   └── eunacom-db.render.com
├── 🔧  Backend API (Node.js Service)
│   └── eunacom-backend.onrender.com
└── 🌐  Frontend (Static Site)
    └── eunacom-frontend.onrender.com
```

---

## **📝 PASO 1: Crear Cuenta en Render**

1. Ve a [render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub
3. Conecta tu repositorio `eunacom-nuevo`

---

## **📝 PASO 2: Crear Base de Datos PostgreSQL**

### **2.1 Crear el Servicio de Base de Datos**

1. En Render Dashboard, haz clic en **"New +"**
2. Selecciona **"PostgreSQL"**
3. Configuración:
   ```
   Name: eunacom-db
   Database: eunacom_production
   User: eunacom_user
   Region: Oregon (US West)
   Plan: Free
   ```
4. Haz clic en **"Create Database"**
5. **⚠️ IMPORTANTE:** Copia la **Connection String** (la necesitarás para el backend)

---

## **📝 PASO 3: Crear Servicio del Backend**

### **3.1 Crear el Web Service**

1. En Render Dashboard, haz clic en **"New +"**
2. Selecciona **"Web Service"**
3. Conecta tu repositorio `ecolonco/eunacom-nuevo`
4. Configuración básica:
   ```
   Name: eunacom-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm ci && npm run build
   Start Command: npm start
   Plan: Free
   ```

### **3.2 Configurar Variables de Entorno**

En la sección **Environment Variables**, agrega:

```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Database (usar la Connection String de tu PostgreSQL)
DATABASE_URL=postgresql://eunacom_user:PASSWORD@eunacom-db:5432/eunacom_production

# JWT Secrets (generar valores seguros)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_REFRESH_SECRET=tu_refresh_secret_super_seguro_aqui
SESSION_SECRET=tu_session_secret_super_seguro_aqui

# CORS
CORS_ORIGIN=https://eunacom-frontend.onrender.com

# AI Configuration
DEEPSEEK_API_KEY=sk-8d786ad20758485899b4d587b14b19f2
ENABLE_AI_GENERATION=true
AI_CONFIDENCE_THRESHOLD=0.90
MAX_QUESTION_VARIANTS=6
MEDICAL_REVIEW_REQUIRED=true

# App Configuration
LOG_LEVEL=warn
RATE_LIMIT_MAX=100
FREE_CREDITS_ON_SIGNUP=50
DAILY_FREE_QUESTIONS=3
CREDIT_COSTS_INDIVIDUAL=1
CREDIT_COSTS_SIMULATION=80
CREDIT_COSTS_REVIEW=15
```

### **3.3 Configurar Health Check**

- Health Check Path: `/health`

### **3.4 Deploy Backend**

1. Haz clic en **"Create Web Service"**
2. Espera a que complete el build (5-10 minutos)
3. Verifica que el servicio esté **"Live"**

---

## **📝 PASO 4: Ejecutar Migraciones de Base de Datos**

### **4.1 Conectar a la Base de Datos**

1. Ve a tu servicio `eunacom-backend` en Render
2. Ve a **"Shell"**
3. Ejecuta las migraciones:

```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Poblar datos iniciales (opcional)
npm run db:seed
```

### **4.2 Verificar Base de Datos**

```bash
# Verificar conexión
npx prisma db pull

# Ver tablas creadas
npx prisma studio --browser none --port 5555
```

---

## **📝 PASO 5: Crear Servicio del Frontend**

### **5.1 Crear Static Site**

1. En Render Dashboard, haz clic en **"New +"**
2. Selecciona **"Static Site"**
3. Conecta tu repositorio `ecolonco/eunacom-nuevo`
4. Configuración:
   ```
   Name: eunacom-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm ci && npm run build
   Publish Directory: dist
   ```

### **5.2 Configurar Variables de Entorno del Frontend**

```bash
# API URL (usar la URL de tu backend)
VITE_API_URL=https://eunacom-backend.onrender.com

# App Configuration
VITE_APP_NAME=EUNACOM Learning Platform
VITE_APP_VERSION=1.0.0
```

### **5.3 Configurar Redirects**

En **Redirects/Rewrites**:
```
/* /index.html 200
```

### **5.4 Deploy Frontend**

1. Haz clic en **"Create Static Site"**
2. Espera a que complete el build (3-5 minutos)
3. Verifica que el sitio esté accesible

---

## **📝 PASO 6: Configurar Dominios (Opcional)**

### **6.1 Configurar Dominio Personalizado**

Si tienes un dominio propio:

1. **Backend**:
   - Ve a `eunacom-backend` → Settings → Custom Domains
   - Agrega: `api.tudominio.com`

2. **Frontend**:
   - Ve a `eunacom-frontend` → Settings → Custom Domains
   - Agrega: `tudominio.com` y `www.tudominio.com`

3. **DNS Configuration**:
   ```
   A     @           76.76.19.61
   CNAME www         eunacom-frontend.onrender.com
   CNAME api         eunacom-backend.onrender.com
   ```

---

## **📝 PASO 7: Verificar Deployment Completo**

### **7.1 Test Backend API**

```bash
# Health check
curl https://eunacom-backend.onrender.com/health

# API test
curl https://eunacom-backend.onrender.com/api/auth/login
```

### **7.2 Test Frontend**

1. Abre `https://eunacom-frontend.onrender.com`
2. Verifica que cargue correctamente
3. Prueba login/registro
4. Verifica conexión con backend

### **7.3 Test Exercise Factory**

1. Login como admin
2. Ve a `/admin/exercise-factory`
3. Sube un CSV de prueba
4. Verifica que DeepSeek genere las variaciones

---

## **📝 PASO 8: Monitoreo y Logs**

### **8.1 Logs del Backend**

- Ve a `eunacom-backend` → Logs
- Busca errores o warnings
- Verifica que las migraciones se ejecutaron

### **8.2 Logs del Frontend**

- Ve a `eunacom-frontend` → Logs
- Verifica build exitoso
- Confirma que no hay errores de assets

### **8.3 Métricas de Base de Datos**

- Ve a `eunacom-db` → Metrics
- Verifica conexiones activas
- Monitorea uso de storage

---

## **🎯 URLs Finales de Producción**

```bash
# Base de Datos
DATABASE: eunacom-db.render.com

# Backend API
API: https://eunacom-backend.onrender.com
Health: https://eunacom-backend.onrender.com/health
Docs: https://eunacom-backend.onrender.com/api-docs

# Frontend
APP: https://eunacom-frontend.onrender.com
Admin: https://eunacom-frontend.onrender.com/admin
```

---

## **⚠️ Consideraciones Importantes**

### **Seguridad**
- ✅ Cambiar todos los secrets de JWT
- ✅ Configurar CORS correctamente
- ✅ Validar variables de entorno
- ✅ Usar HTTPS en producción

### **Performance**
- ✅ Plan Free tiene limitaciones (750 hrs/mes)
- ✅ Base de datos Free: 1GB storage
- ✅ Cold starts en servicios inactivos
- ✅ Considerar upgrade a planes pagos

### **Backup**
- ✅ Render hace backups automáticos de PostgreSQL
- ✅ Considera backups adicionales para datos críticos
- ✅ Documenta proceso de restore

---

## **🚀 ¡Listo!**

Tu plataforma EUNACOM está completamente desplegada y operacional en Render con:

- ✅ **Base de datos PostgreSQL** funcionando
- ✅ **Backend API** con Exercise Factory y DeepSeek AI
- ✅ **Frontend React** conectado y funcional
- ✅ **Migraciones** ejecutadas correctamente
- ✅ **Monitoreo** configurado

**¡La Fábrica de Ejercicios está lista para generar contenido médico de calidad en producción!** 🎉