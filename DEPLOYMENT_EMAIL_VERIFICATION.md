# Despliegue a Producción – Registro con Verificación de Email y Bono de 10 Créditos

Este documento resume cambios, configuración, pasos de despliegue y checklist operativa para habilitar el registro con verificación de correo y la asignación de 10 créditos al confirmar.

## Cambios principales
- Modelo Prisma: nueva tabla `email_verifications` para tokens de verificación (hash SHA-256, expiración, single-use).
- Backend:
  - `POST /api/auth/register`: registra usuario con 0 créditos, envía email de verificación y no inicia sesión.
  - `POST /api/auth/login`: bloquea si `isVerified=false`.
  - `GET /api/auth/verify?token=...`: consume token, marca `isVerified=true` y añade 10 créditos como `BONUS` con descripción `SIGNUP_BONUS` (idempotente).
  - `POST /api/auth/resend-verification`: reenvía enlace con rate-limit (Redis por email/IP).
  - Servicios: `verification.service.ts` (tokens) y `email.service.ts` (SMTP + plantilla).
- Frontend:
  - `RegisterForm`: muestra mensaje de “Revisa tu correo para confirmar tu cuenta”.
  - `VerifyEmail`: página en `/verify` que valida el token y muestra resultado.
  - Enrutado simple en `main.tsx` para `/verify`.

## Variables de entorno (Producción)
- Backend
  - `PORT`: p.ej. `3000`
  - `NODE_ENV`: `production`
  - `DATABASE_URL`: cadena PostgreSQL
  - `JWT_SECRET`, `JWT_EXPIRES_IN`: p.ej. `15m`
  - `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`: p.ej. `7d`
  - `CORS_ORIGIN`: dominio(s) del frontend, separados por coma
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (si aplica)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
  - `APP_URL`: URL pública del frontend, p.ej. `https://app.eunacom.cl`
  - `EMAIL_TOKEN_TTL_HOURS`: p.ej. `24`
  - `RESEND_VERIFY_LIMIT`: p.ej. `3`
  - `RESEND_VERIFY_WINDOW_SEC`: p.ej. `3600`
- Frontend
  - `VITE_API_URL`: URL pública del backend

## Migraciones de base de datos
1) Generar y aplicar migraciones en producción:
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## Proceso de despliegue
1) Configurar variables de entorno en el proveedor (backend y frontend).
2) Ejecutar migraciones en backend.
3) Instalar dependencias si es necesario (backend incluye `nodemailer`).
4) Deploy backend y validar healthcheck `/health`.
5) Deploy frontend con `VITE_API_URL` apuntando al backend productivo.
6) Probar flujo end-to-end en producción:
   - Registro de nuevo email.
   - Recepción de email (SMTP proveedor real) y apertura del enlace.
   - Verificación exitosa y login permitido.
   - Verificar en DB: `users.isVerified=true` y transacción `credit_transactions` con `type=BONUS` y `description=SIGNUP_BONUS`.

## Checklist de seguridad y conformidad
- Hash del token en DB (`tokenHash`), no guardar tokens en claro.
- Tokens expiran (`EMAIL_TOKEN_TTL_HOURS`) y son de un solo uso (`consumedAt`).
- Respuestas neutras en `register`/`resend-verification` para evitar enumeración de usuarios.
- Rate limit configurado en Redis; monitorear métricas de uso.
- `CORS_ORIGIN` restringido a dominios válidos.
- `EMAIL_FROM` con dominio autenticado (SPF/DKIM) en el proveedor SMTP.

## Observabilidad
- Logs: envío de emails, generación/consumo de tokens, errores.
- Métricas sugeridas: tasa de registros, confirmaciones, reenvíos, errores SMTP.
- Alertas por fallos de SMTP/Redis/DB.

## Rollback
- Si hay problemas, se puede revertir a la versión anterior del backend y frontend.
- La tabla `email_verifications` es independiente y backward-compatible con el modelo `users`.

## Puntos de contacto
- App: `backend/src/routes/auth.routes.ts`, `backend/src/services/*`, `frontend/src/components/*`.
- Infra: variables de entorno, Redis y SMTP del entorno productivo.
