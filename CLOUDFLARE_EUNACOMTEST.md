# 🌐 Configuración de Cloudflare para eunacomtest.cl

Guía paso a paso para configurar tu dominio `eunacomtest.cl` con Cloudflare, Vercel (frontend) y Render (backend).

---

## 📋 Información de tu Setup

```
Dominio:    eunacomtest.cl
Frontend:   Vercel → https://eunacom-produccion-v2.vercel.app
Backend:    Render → https://eunacom-backend-v3.onrender.com
Objetivo:   
  - https://eunacomtest.cl (frontend)
  - https://www.eunacomtest.cl (redirige a eunacomtest.cl)
  - https://api.eunacomtest.cl (backend)
```

---

## 🚀 PASO 1: Agregar Sitio a Cloudflare

### 1.1 Crear cuenta o iniciar sesión
1. Ve a https://dash.cloudflare.com
2. Inicia sesión o crea cuenta gratuita

### 1.2 Agregar dominio
1. Clic en **"+ Add a Site"**
2. Ingresa: `eunacomtest.cl` (sin www)
3. Clic en **"Add site"**

### 1.3 Seleccionar plan FREE
1. Selecciona el plan **Free - $0/month**
2. Clic en **"Continue"**

### 1.4 Revisar registros DNS detectados
1. Cloudflare escaneará tus registros DNS actuales
2. Revísalos (probablemente verás algunos existentes)
3. Clic en **"Continue"**

---

## 🔧 PASO 2: Configurar Registros DNS en Cloudflare

Ve a **DNS > Records** y configura estos registros:

### 📍 Registros Requeridos:

#### 1️⃣ Frontend - Dominio Principal (eunacomtest.cl)
```
Tipo:       A
Nombre:     @
Contenido:  76.76.21.21
TTL:        Auto
Proxy:      ✅ Proxied (nube naranja)
```

#### 2️⃣ Frontend - WWW (www.eunacomtest.cl)
```
Tipo:       CNAME
Nombre:     www
Contenido:  cname.vercel-dns.com
TTL:        Auto
Proxy:      ✅ Proxied (nube naranja)
```

#### 3️⃣ Backend - API (api.eunacomtest.cl)
```
Tipo:       CNAME
Nombre:     api
Contenido:  eunacom-backend-v3.onrender.com
TTL:        Auto
Proxy:      ✅ Proxied (nube naranja)
```

### 🗑️ Eliminar registros antiguos
Si hay registros DNS que apuntan a otros lugares (hosting anterior), elimínalos para evitar conflictos.

---

## 🔐 PASO 3: Cambiar Nameservers en tu Registrador

Cloudflare te mostrará 2 nameservers únicos, ejemplo:
```
alice.ns.cloudflare.com
bob.ns.cloudflare.com
```

### ¿Dónde compraste eunacomtest.cl?

#### Si compraste en **NIC Chile** (lo más probable para .cl):

1. Ve a https://www.nic.cl/
2. Inicia sesión con tu cuenta
3. Clic en **"Mis Dominios"**
4. Selecciona `eunacomtest.cl`
5. Busca **"Servidores de Nombres"** o **"Nameservers"**
6. Reemplaza los nameservers actuales con los de Cloudflare:
   ```
   NS 1: [tu-nameserver-1].ns.cloudflare.com
   NS 2: [tu-nameserver-2].ns.cloudflare.com
   ```
7. Guarda los cambios
8. **Importante**: La propagación puede tardar 2-24 horas

#### Si compraste en otro registrador:
- Busca la sección **"DNS Management"** o **"Nameservers"**
- Cambia a **"Custom Nameservers"**
- Ingresa los 2 nameservers de Cloudflare
- Guarda

### Verificar en Cloudflare
1. Regresa a Cloudflare
2. Clic en **"Done, check nameservers"**
3. Espera confirmación (puede tardar hasta 24h, usualmente 1-2h)

---

## ⚙️ PASO 4: Configurar SSL/TLS en Cloudflare

### 4.1 Configurar modo SSL
1. En Cloudflare, ve a **SSL/TLS**
2. En **Overview**, selecciona:
   ```
   🔒 Full (strict)
   ```
   *(Usa "Full" si tienes problemas con certificados)*

### 4.2 Activar configuraciones de seguridad
1. Ve a **SSL/TLS > Edge Certificates**
2. Activa estas opciones:
   ```
   ✅ Always Use HTTPS
   ✅ Automatic HTTPS Rewrites
   ✅ Opportunistic Encryption
   ✅ TLS 1.3
   ```

### 4.3 Verificar certificado Universal SSL
- Debe decir **"Active Certificate"**
- Si dice "Initializing", espera 10-15 minutos

---

## 🌍 PASO 5: Configurar Vercel (Frontend)

### 5.1 Agregar dominio custom en Vercel
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto: **eunacom-produccion-v2**
3. Ve a **Settings > Domains**
4. Clic en **"Add"**

#### Agregar dominio principal:
```
Domain: eunacomtest.cl
```
Clic en **"Add"**

#### Agregar WWW:
```
Domain: www.eunacomtest.cl
```
Clic en **"Add"**

### 5.2 Configurar dominio principal
1. En la lista de dominios, busca `eunacomtest.cl`
2. Clic en el menú `⋯` (tres puntos)
3. Selecciona **"Set as Primary Domain"**

### 5.3 Verificación
- Vercel verificará automáticamente los registros DNS
- Debe mostrar ✅ cuando esté correcto
- Si muestra error, espera 30 minutos a que propaguen los DNS

---

## 🔧 PASO 6: Actualizar Variables de Entorno

### 6.1 Frontend (Vercel)

1. Ve a **Settings > Environment Variables**
2. Busca `VITE_API_BASE_URL` y actualiza:

```
Variable:  VITE_API_BASE_URL

Production:   https://api.eunacomtest.cl
Preview:      https://api.eunacomtest.cl
Development:  http://localhost:3000
```

3. **Guarda** y luego clic en **"Redeploy"** en la pestaña **Deployments**

### 6.2 Backend (Render)

1. Ve a https://dashboard.render.com/
2. Selecciona tu servicio: **eunacom-backend-v3**
3. Ve a **Environment**
4. Actualiza estas variables:

```
FRONTEND_URL=https://eunacomtest.cl
CORS_ORIGIN=https://eunacomtest.cl,https://www.eunacomtest.cl,https://api.eunacomtest.cl
```

5. Guarda (Render redeployará automáticamente)

---

## 📊 PASO 7: Configurar Redirección WWW → Dominio Principal

En Cloudflare, para redirigir `www.eunacomtest.cl` a `eunacomtest.cl`:

### Opción A: Redirect Rule (Recomendado - Gratis)
1. Ve a **Rules > Redirect Rules**
2. Clic en **"Create rule"**
3. Configura:
   ```
   Rule name: Redirect WWW to root
   
   When incoming requests match:
     - Field: Hostname
     - Operator: equals
     - Value: www.eunacomtest.cl
   
   Then:
     - Type: Dynamic
     - Expression: concat("https://eunacomtest.cl", http.request.uri.path)
     - Status code: 301
     - Preserve query string: ✅ Yes
   ```
4. Clic en **"Deploy"**

### Opción B: Page Rule (Alternativa)
1. Ve a **Rules > Page Rules**
2. Clic en **"Create Page Rule"**
3. Configura:
   ```
   URL: www.eunacomtest.cl/*
   
   Settings:
     - Forwarding URL
     - Status: 301 - Permanent Redirect
     - Destination: https://eunacomtest.cl/$1
   ```
4. Clic en **"Save and Deploy"**

---

## ✅ PASO 8: Verificación y Testing

### 8.1 Esperar propagación DNS
**Tiempo estimado: 1-2 horas (máximo 24h)**

Puedes verificar el estado con:
```bash
# Verificar NS (nameservers)
dig eunacomtest.cl NS

# Verificar registro A
dig eunacomtest.cl A

# Verificar WWW
dig www.eunacomtest.cl

# Verificar API
dig api.eunacomtest.cl
```

### 8.2 Testing en Navegador

#### ✅ Checklist:
1. **https://eunacomtest.cl**
   - ✅ Debe cargar el frontend de EUNACOM
   - ✅ Debe mostrar certificado SSL válido (candado verde)

2. **https://www.eunacomtest.cl**
   - ✅ Debe redirigir a https://eunacomtest.cl
   - ✅ La URL debe cambiar a eunacomtest.cl (sin www)

3. **https://api.eunacomtest.cl**
   - ✅ Debe responder (puede ser 404 si no hay ruta raíz)
   - ✅ Certificado SSL válido

4. **Probar Login/Register**
   - ✅ Formularios deben funcionar
   - ✅ Las llamadas API deben funcionar
   - ✅ No debe haber errores CORS en consola

### 8.3 Verificar SSL
1. Ve a https://www.ssllabs.com/ssltest/
2. Ingresa: `eunacomtest.cl`
3. Clic en **"Submit"**
4. Debe mostrar calificación **A** o **A+**

### 8.4 Limpiar caché del navegador
Si ves contenido antiguo:
```
Chrome/Edge: Ctrl+Shift+R (Cmd+Shift+R en Mac)
Firefox:     Ctrl+F5
Safari:      Cmd+Option+R
```

---

## 🎨 PASO 9: Optimizaciones de Cloudflare (Opcional)

### 9.1 Speed (Rendimiento)
Ve a **Speed > Optimization**:
```
✅ Auto Minify: JavaScript, CSS, HTML
✅ Brotli
✅ Early Hints
⛔ Rocket Loader: OFF (puede causar problemas con React)
```

### 9.2 Caching
Ve a **Caching > Configuration**:
```
- Caching Level: Standard
- Browser Cache TTL: 4 hours
✅ Always Online: ON
```

### 9.3 Security
Ve a **Security > Settings**:
```
- Security Level: Medium
- Challenge Passage: 30 minutes
✅ Bot Fight Mode: ON
```

### 9.4 Network
Ve a **Network**:
```
✅ HTTP/2: ON
✅ HTTP/3 (with QUIC): ON
✅ 0-RTT Connection Resumption: ON
✅ WebSockets: ON
✅ gRPC: ON
```

---

## 🐛 Troubleshooting

### ❌ Problema: "DNS_PROBE_FINISHED_NXDOMAIN"
**Causa:** Nameservers no actualizados o DNS no propagado

**Solución:**
1. Verifica que cambiaste los nameservers en NIC Chile
2. Espera 2-4 horas más
3. Limpia caché DNS:
   ```bash
   # macOS:
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Windows:
   ipconfig /flushdns
   
   # Linux:
   sudo systemd-resolve --flush-caches
   ```

### ❌ Problema: "ERR_TOO_MANY_REDIRECTS"
**Causa:** Configuración SSL incorrecta

**Solución:**
1. Cloudflare > SSL/TLS > Overview
2. Cambia de "Full (strict)" a **"Full"**
3. Espera 5 minutos
4. Prueba de nuevo

### ❌ Problema: Certificado SSL no válido
**Causa:** Certificado aún no emitido

**Solución:**
1. Cloudflare > SSL/TLS > Edge Certificates
2. Verifica que "Universal SSL" esté **Active**
3. Si dice "Initializing", espera 15-30 minutos
4. Si persiste, desactiva Proxy temporalmente:
   - DNS > Records
   - Cambia nube naranja a gris (⛔ DNS only)
   - Espera 5 minutos
   - Vuelve a activar Proxy (✅ Proxied)

### ❌ Problema: Backend no responde (CORS error)
**Causa:** CORS no configurado correctamente

**Solución:**
1. Render > Environment Variables
2. Verifica que `CORS_ORIGIN` incluya:
   ```
   https://eunacomtest.cl,https://www.eunacomtest.cl
   ```
3. Verifica que `FRONTEND_URL` sea:
   ```
   https://eunacomtest.cl
   ```
4. Guarda y espera redeploy (2-3 minutos)

### ❌ Problema: "This site can't provide a secure connection"
**Causa:** SSL Mode incorrecto o certificado no emitido

**Solución:**
1. Espera 24 horas para propagación completa
2. Cloudflare > SSL/TLS > Overview
3. Usa **"Full"** en lugar de "Full (strict)"
4. Vercel debe tener el dominio agregado correctamente

---

## 📊 Resumen de URLs Finales

Después de completar la configuración:

```
🌐 Frontend (Producción):
   https://eunacomtest.cl
   ↳ Vercel + Cloudflare CDN

🌐 Frontend WWW:
   https://www.eunacomtest.cl
   ↳ Redirige a https://eunacomtest.cl

🔌 Backend API:
   https://api.eunacomtest.cl
   ↳ Render + Cloudflare Proxy

📊 Analytics:
   Cloudflare Dashboard > Analytics

🔒 SSL:
   Cloudflare Universal SSL (gratis)
   ↳ Certificado válido para:
      - eunacomtest.cl
      - *.eunacomtest.cl (wildcard)
```

---

## 📝 Checklist Final

Antes de considerar la configuración completa:

```
✅ Dominio agregado a Cloudflare
✅ Registros DNS configurados:
   ✅ @ (A) → 76.76.21.21
   ✅ www (CNAME) → cname.vercel-dns.com
   ✅ api (CNAME) → eunacom-backend-v3.onrender.com
✅ Nameservers cambiados en NIC Chile
✅ Cloudflare confirma que nameservers están activos
✅ SSL/TLS configurado en modo "Full" o "Full (strict)"
✅ Universal SSL activo (certificado emitido)
✅ Dominios agregados en Vercel (eunacomtest.cl y www)
✅ Variables de entorno actualizadas en Vercel
✅ Variables de entorno actualizadas en Render
✅ Redirección WWW → root configurada
✅ https://eunacomtest.cl carga correctamente
✅ https://www.eunacomtest.cl redirige a eunacomtest.cl
✅ Login/Register funcionan correctamente
✅ No hay errores CORS en consola del navegador
✅ Certificado SSL válido (A+ en SSL Labs)
```

---

## 🎯 Próximos Pasos Recomendados

### 1. **Configurar Analytics**
```
Cloudflare > Analytics > Web Analytics
- Activar para ver estadísticas sin cookies
```

### 2. **Configurar Alertas**
```
UptimeRobot (gratis):
- Monitor para https://eunacomtest.cl
- Monitor para https://api.eunacomtest.cl
- Email alert si el sitio cae
```

### 3. **Backup de Configuración**
```
- Exporta registros DNS de Cloudflare
- Guarda nameservers de Cloudflare
- Documenta variables de entorno
```

### 4. **Email Corporativo (Opcional)**
```
Opciones:
a) Cloudflare Email Routing (gratis)
   - Redirige contacto@eunacomtest.cl a tu email
   
b) Google Workspace ($6/mes)
   - Email profesional completo
   
c) Zoho Mail (gratis hasta 5 usuarios)
   - Alternativa económica
```

---

## 📞 Soporte

Si tienes problemas durante la configuración:

1. **Cloudflare Status**: https://www.cloudflarestatus.com/
2. **Vercel Status**: https://www.vercel-status.com/
3. **Render Status**: https://status.render.com/
4. **Documentación Cloudflare**: https://developers.cloudflare.com/
5. **Comunidad Cloudflare**: https://community.cloudflare.com/

---

## 🕐 Timeline Esperado

```
Hora 0:   Agregar dominio a Cloudflare
Hora 0:   Configurar registros DNS
Hora 0:   Cambiar nameservers en NIC Chile
Hora 1-2: Nameservers propagados (Cloudflare activo)
Hora 2:   Agregar dominios en Vercel
Hora 2:   Actualizar variables de entorno
Hora 3:   Certificado SSL emitido
Hora 3:   Sitio completamente funcional
Hora 24:  Propagación DNS global completa
```

---

**¡Listo!** Tu aplicación EUNACOM estará corriendo en `https://eunacomtest.cl` con:
- ⚡ CDN global de Cloudflare
- 🔒 SSL/TLS automático
- 🛡️ Protección DDoS
- 📊 Analytics incluido
- 🚀 Optimización de rendimiento

**¡Mucho éxito con el despliegue!** 🎉

