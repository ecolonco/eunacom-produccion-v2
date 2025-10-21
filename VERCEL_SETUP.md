# Configuración de Vercel para EUNACOM Frontend

## 🚨 IMPORTANTE: Configuración Manual Requerida

Debido a que este es un monorepo, necesitas configurar manualmente el proyecto en Vercel:

## 📝 Pasos para Configurar en Vercel Dashboard:

### 1. Ve a tu proyecto en Vercel
- https://vercel.com/dashboard
- Selecciona tu proyecto EUNACOM

### 2. Ve a Settings → General

### 3. Configura **Root Directory**:
```
frontend
```
- Haz clic en "Edit" junto a "Root Directory"
- Escribe: `frontend`
- Marca la casilla "Include source files outside of the Root Directory in the Build Step"
- Click "Save"

### 4. Configura **Build & Development Settings**:

**Framework Preset:**
```
Vite
```

**Build Command:** (Dejar en blanco o usar)
```
npm run build:prod
```

**Output Directory:**
```
dist
```

**Install Command:**
```
npm install
```

### 5. Configura **Environment Variables** (si es necesario):
```
VITE_API_URL=https://eunacom-backend-v3.onrender.com
```

### 6. Re-desplegar
- Ve a la pestaña "Deployments"
- Click en los 3 puntos del último deployment
- Click "Redeploy"

## ✅ Verificación

Una vez configurado, el build debería funcionar así:

```bash
# Vercel ejecutará desde frontend/:
npm install
npm run build:prod

# Output: frontend/dist/
```

## 🔗 Configuración de API Proxy

El archivo `vercel.json` en la raíz ya está configurado para hacer proxy de:
- `/api/*` → `https://eunacom-backend-v3.onrender.com/api/*`

## 📚 Alternativa: Deployar Solo el Frontend

Si prefieres, puedes:

1. Ir a Vercel Dashboard
2. Click "Add New..." → "Project"
3. Import SOLO el directorio `frontend/` como un proyecto independiente
4. Vercel detectará automáticamente que es un proyecto Vite
5. Listo!

---

**Nota:** Los archivos `vercel.json` están configurados, pero la configuración del "Root Directory" DEBE hacerse desde el dashboard de Vercel.

