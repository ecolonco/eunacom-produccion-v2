# 🌐 Configuración de Cloudflare para EUNACOM

Esta guía te ayudará a configurar Cloudflare para tu dominio y conectarlo con Vercel (frontend) y Render (backend).

---

## 📋 Prerequisitos

- ✅ Dominio comprado (ej: `eunacom.cl`)
- ✅ Acceso al panel del registrador de dominios (donde compraste el dominio)
- ✅ Cuenta en Cloudflare (crear gratis en https://dash.cloudflare.com/sign-up)
- ✅ Frontend desplegado en Vercel
- ✅ Backend desplegado en Render

---

## 🚀 Paso 1: Agregar el Sitio a Cloudflare

### 1.1 Iniciar sesión en Cloudflare
1. Ve a https://dash.cloudflare.com
2. Inicia sesión o crea una cuenta gratuita

### 1.2 Agregar tu dominio
1. Clic en **"Add a Site"** (Agregar un sitio)
2. Ingresa tu dominio: `tudominio.cl`
3. Clic en **"Add site"**

### 1.3 Seleccionar plan
1. Selecciona el plan **Free** (gratuito)
2. Clic en **"Continue"**

### 1.4 Cloudflare escaneará tus registros DNS actuales
1. Cloudflare detectará automáticamente tus registros DNS existentes
2. Revisa que estén correctos
3. Clic en **"Continue"**

---

## 🔧 Paso 2: Configurar Registros DNS en Cloudflare

Una vez agregado el sitio, ve a **DNS > Records** y configura los siguientes registros:

### 2.1 Frontend (Vercel) - Dominio Principal

**Opción A: Usar IP de Vercel (Recomendado)**
```
Tipo:    A
Nombre:  @
Contenido: 76.76.21.21
TTL:     Auto
Proxy:   ✅ Proxied (nube naranja activa)
```

**Opción B: Usar CNAME de Vercel**
```
Tipo:    CNAME
Nombre:  @
Contenido: cname.vercel-dns.com
TTL:     Auto
Proxy:   ✅ Proxied
```

### 2.2 Frontend - Subdominio WWW
```
Tipo:    CNAME
Nombre:  www
Contenido: cname.vercel-dns.com
TTL:     Auto
Proxy:   ✅ Proxied
```

### 2.3 Backend (Render) - Subdominio API
```
Tipo:    CNAME
Nombre:  api
Contenido: eunacom-backend-v3.onrender.com
TTL:     Auto
Proxy:   ✅ Proxied (recomendado) o ⛔ DNS only
```

**IMPORTANTE**: Si usas Proxy (nube naranja), debes:
- Ir a **SSL/TLS > Overview** en Cloudflare
- Configurar modo: **Full (strict)** o **Full**

### 2.4 (Opcional) Backend - Subdominio BACKEND
```
Tipo:    CNAME
Nombre:  backend
Contenido: eunacom-backend-v3.onrender.com
TTL:     Auto
Proxy:   ✅ Proxied
```

---

## 🔐 Paso 3: Cambiar Nameservers en tu Registrador

Cloudflare te proporcionará 2 nameservers únicos, algo como:
```
alice.ns.cloudflare.com
bob.ns.cloudflare.com
```

### 3.1 Donde compraste el dominio:

#### **Si compraste en NIC Chile (para .cl)**
1. Ingresa a https://www.nic.cl
2. Inicia sesión con tu cuenta
3. Ve a **"Mis Dominios"**
4. Selecciona tu dominio
5. Busca la sección **"Nameservers"** o **"Servidores DNS"**
6. Reemplaza los nameservers actuales con los de Cloudflare:
   - Nameserver 1: `alice.ns.cloudflare.com` (ejemplo)
   - Nameserver 2: `bob.ns.cloudflare.com` (ejemplo)
7. Guarda los cambios

#### **Si compraste en GoDaddy**
1. Ingresa a https://dcc.godaddy.com/control/portfolio
2. Ve a **"My Products"** > **"Domains"**
3. Clic en tu dominio
4. Scroll hasta **"Nameservers"**
5. Clic en **"Change"**
6. Selecciona **"Custom nameservers"**
7. Ingresa los nameservers de Cloudflare
8. Guarda

#### **Si compraste en Namecheap**
1. Ingresa a https://ap.www.namecheap.com
2. Ve a **"Domain List"**
3. Clic en **"Manage"** junto a tu dominio
4. Busca **"Nameservers"**
5. Selecciona **"Custom DNS"**
6. Ingresa los nameservers de Cloudflare
7. Clic en el ícono de ✅ para guardar

#### **Otros Registradores**
- Busca la sección de **"DNS"**, **"Nameservers"** o **"Servidores de Nombres"**
- Reemplaza con los nameservers de Cloudflare
- Guarda los cambios

### 3.2 Verificar en Cloudflare
1. Regresa a Cloudflare
2. Clic en **"Done, check nameservers"**
3. Cloudflare verificará el cambio (puede tardar hasta 24 horas, usualmente 1-2 horas)

---

## ⚙️ Paso 4: Configurar SSL/TLS en Cloudflare

1. Ve a **SSL/TLS** en el menú lateral
2. En **"Overview"**, selecciona el modo:
   - **Full (strict)** - Recomendado si Vercel/Render tienen certificados válidos
   - **Full** - Si hay problemas con certificados
3. Ve a **SSL/TLS > Edge Certificates**
4. Activa:
   - ✅ **Always Use HTTPS**
   - ✅ **Automatic HTTPS Rewrites**
   - ✅ **Opportunistic Encryption**

---

## 🌍 Paso 5: Configurar Vercel para tu Dominio Custom

### 5.1 En Vercel Dashboard
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto (frontend)
3. Ve a **Settings > Domains**
4. Clic en **"Add"**
5. Ingresa tu dominio: `tudominio.cl`
6. Clic en **"Add"**
7. También agrega: `www.tudominio.cl`

### 5.2 Vercel verificará los registros DNS
- Si los registros están correctos, Vercel mostrará ✅
- Si hay errores, Vercel te dirá qué falta

### 5.3 Configurar dominio principal
1. En la lista de dominios, busca tu dominio principal
2. Clic en el menú `⋯` (tres puntos)
3. Selecciona **"Set as Primary Domain"**

---

## 🔧 Paso 6: Configurar Variables de Entorno

### 6.1 En Frontend (Vercel)
1. Ve a **Settings > Environment Variables**
2. Actualiza `VITE_API_BASE_URL`:
   ```
   Production:  https://api.tudominio.cl
   Preview:     https://eunacom-backend-v3.onrender.com
   Development: http://localhost:3000
   ```
3. Guarda y redeploy

### 6.2 En Backend (Render)
1. Ve a tu servicio en Render
2. **Environment > Environment Variables**
3. Actualiza:
   ```
   FRONTEND_URL=https://tudominio.cl
   CORS_ORIGIN=https://tudominio.cl,https://www.tudominio.cl
   ```
4. Guarda (Render redeployará automáticamente)

---

## ✅ Paso 7: Verificación y Testing

### 7.1 Verificar DNS
Espera 1-2 horas para propagación DNS, luego verifica:

```bash
# Verificar que apunta a Cloudflare
dig tudominio.cl

# Verificar subdominio API
dig api.tudominio.cl

# Verificar WWW
dig www.tudominio.cl
```

### 7.2 Verificar en Navegador
1. Abre https://tudominio.cl - Debe cargar el frontend
2. Abre https://www.tudominio.cl - Debe redirigir a tudominio.cl
3. Abre https://api.tudominio.cl - Debe mostrar API (o 404 si es la raíz)
4. Verifica que el frontend pueda hacer llamadas al backend

### 7.3 Verificar SSL
1. Ve a https://www.ssllabs.com/ssltest/
2. Ingresa tu dominio
3. Debe mostrar calificación **A** o **A+**

---

## 🎨 Paso 8: Configuraciones Adicionales de Cloudflare (Opcional)

### 8.1 Page Rules (Redirecciones)
Ve a **Rules > Page Rules** y crea:

**Redirigir WWW a dominio principal:**
```
URL: www.tudominio.cl/*
Settings:
  - Forwarding URL: 301 - Permanent Redirect
  - Destination: https://tudominio.cl/$1
```

### 8.2 Caché (Performance)
Ve a **Caching > Configuration**:
```
- Caching Level: Standard
- Browser Cache TTL: 4 hours
- Always Online: ON
```

### 8.3 Security
Ve a **Security > Settings**:
```
- Security Level: Medium
- Bot Fight Mode: ON
- Challenge Passage: 30 minutes
```

### 8.4 Speed (Optimization)
Ve a **Speed > Optimization**:
```
- Auto Minify: ✅ JavaScript, ✅ CSS, ✅ HTML
- Brotli: ON
- Early Hints: ON
- Rocket Loader: OFF (puede causar problemas con React)
```

---

## 🐛 Troubleshooting

### Problema: DNS no resuelve
**Solución:**
```bash
# Limpiar caché DNS local
# macOS/Linux:
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Windows:
ipconfig /flushdns
```

### Problema: "Too many redirects" (ERR_TOO_MANY_REDIRECTS)
**Solución:**
1. Ve a Cloudflare > SSL/TLS > Overview
2. Cambia a **Full** (no Full Strict)
3. Espera 5 minutos

### Problema: Mixed Content (HTTP/HTTPS)
**Solución:**
1. Cloudflare > SSL/TLS > Edge Certificates
2. Activa **Automatic HTTPS Rewrites**
3. En tu código, usa URLs relativas o `//` en lugar de `http://`

### Problema: Backend no responde desde frontend
**Solución:**
1. Verifica CORS en backend (`CORS_ORIGIN` incluye tu dominio)
2. Verifica que `VITE_API_BASE_URL` en Vercel sea correcto
3. Verifica registros DNS de `api.tudominio.cl`

### Problema: Certificado SSL no válido
**Solución:**
1. Espera 24 horas para propagación
2. Ve a Cloudflare > SSL/TLS > Edge Certificates
3. Verifica que **Universal SSL** esté activo
4. Si falla, desactiva **Proxied** temporalmente (⛔ DNS only)

---

## 📊 Resumen Final

Después de completar todos los pasos:

```
✅ Dominio agregado a Cloudflare
✅ Registros DNS configurados
✅ Nameservers cambiados en registrador
✅ SSL/TLS configurado (Full o Full Strict)
✅ Dominio custom agregado en Vercel
✅ Variables de entorno actualizadas
✅ Frontend accesible en https://tudominio.cl
✅ Backend accesible en https://api.tudominio.cl
✅ WWW redirige a dominio principal
✅ SSL calificación A+
```

---

## 📞 Soporte Adicional

Si tienes problemas:
1. Verifica el estado de Cloudflare: https://www.cloudflarestatus.com/
2. Verifica el estado de Vercel: https://www.vercel-status.com/
3. Verifica el estado de Render: https://status.render.com/
4. Consulta la documentación de Cloudflare: https://developers.cloudflare.com/

---

## 🎯 Próximos Pasos Recomendados

1. **Configurar Email** (si necesitas `contacto@tudominio.cl`):
   - Usa Cloudflare Email Routing (gratis)
   - O configura Google Workspace / Microsoft 365

2. **Analytics**:
   - Activa Cloudflare Web Analytics (gratis, sin cookies)
   - O agrega Google Analytics a tu frontend

3. **Backups**:
   - Configura backups automáticos en Render
   - Considera un plan de backup de base de datos

4. **Monitoring**:
   - Configura UptimeRobot (gratis) para monitorear uptime
   - Configura alertas en Render

---

**¡Listo!** Tu aplicación EUNACOM estará accesible en tu dominio personalizado con Cloudflare proporcionando CDN, seguridad y optimización. 🚀

