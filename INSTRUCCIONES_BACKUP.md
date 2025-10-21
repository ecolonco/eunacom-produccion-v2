# 🔒 Instrucciones para Ejecutar Backup de Base de Datos

## ✅ Sistema de Respaldo Creado

### Respaldos Realizados:

1. **✅ Código de la Aplicación**
   - Tag Git: `v1.0.0-production`
   - Ubicación: GitHub
   - Comando para restaurar: `git checkout v1.0.0-production`

2. **⏳ Base de Datos PostgreSQL** (Pendiente - Ejecutar ahora)

---

## 📋 Cómo Ejecutar el Backup de Base de Datos

### Opción 1: Desde Render Shell (Recomendado)

#### Paso 1: Acceder al Shell de Render

1. Ve a: https://dashboard.render.com
2. Selecciona: **eunacom-backend-v3**
3. Click en: **"Shell"** (menú superior)

#### Paso 2: Ejecutar Script de Backup

```bash
cd backend
node scripts/backup-database.js
```

**Salida esperada:**
```
🔒 ==========================================
   BACKUP DE BASE DE DATOS - EUNACOM
==========================================

🕐 Fecha: 13/10/2025 15:30:45
📁 Archivo: backup_2025-10-13T15-30-45.sql

🔄 Iniciando backup de PostgreSQL...

✅ ¡BACKUP COMPLETADO EXITOSAMENTE!

📊 Información del backup:
   • Tamaño: 12.45 MB (12750.32 KB)
   • Ubicación: /opt/render/project/src/backend/backups/backup_2025-10-13T15-30-45.sql
```

#### Paso 3: Descargar el Backup (Opcional)

⚠️ **Problema**: El archivo está en el contenedor efímero de Render.

**Soluciones:**

**A. Usar backups automáticos de Render:**
1. Ve a tu servicio PostgreSQL en Render
2. Click en **"Backups"**
3. Descarga el backup más reciente

**B. Crear backup manual en Render PostgreSQL:**
1. Ve a tu servicio PostgreSQL en Render
2. Click en **"Backups"**
3. Click en **"Create Backup"**
4. Una vez creado, haz click en **"Download"**

---

### Opción 2: Desde tu Máquina Local (Si tienes pg_dump)

#### Requisitos:
- PostgreSQL instalado localmente
- DATABASE_URL del servicio Render

#### Paso 1: Obtener DATABASE_URL

1. Ve a Render Dashboard
2. Selecciona tu servicio PostgreSQL
3. Click en **"Connect"** → **"External Connection"**
4. Copia la **"External Database URL"**

#### Paso 2: Ejecutar Backup Local

```bash
# Desde la raíz del proyecto
cd backend

# Ejecutar script con DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:port/database" node scripts/backup-database.js
```

O directamente con pg_dump:

```bash
pg_dump "postgresql://user:pass@host:port/database" > backup_manual_$(date +%Y%m%d_%H%M%S).sql
```

---

### Opción 3: Backup Automático de Render (Más Fácil)

Render hace backups automáticos de PostgreSQL:

1. Ve a: https://dashboard.render.com
2. Selecciona tu servicio: **eunacom-produccion-v2-db** (o similar)
3. Click en: **"Backups"**
4. Verás lista de backups automáticos
5. Para crear uno manual: **"Create Backup"**
6. Para descargar: Click en el backup → **"Download"**

**✅ RECOMENDACIÓN**: Usa esta opción, es la más confiable.

---

## 📦 Almacenar el Backup

Una vez descargado el backup:

### 1. Local
```bash
# Crear carpeta de respaldos
mkdir -p ~/Backups/EUNACOM/

# Mover backup
mv backup_*.sql ~/Backups/EUNACOM/

# O comprimir
gzip backup_*.sql
mv backup_*.sql.gz ~/Backups/EUNACOM/
```

### 2. Cloud (Recomendado)
- Subir a **Google Drive** (carpeta privada)
- Subir a **Dropbox**
- Subir a **AWS S3** (si tienes cuenta)

### 3. Multiple Locations (Más Seguro)
- Local + Cloud
- 2-3 copias en diferentes lugares

---

## 🔄 Restaurar Base de Datos

Si necesitas restaurar:

```bash
# Desde backup local
psql "postgresql://user:pass@host:port/database" < backup_2025-10-13.sql

# O desde backup comprimido
gunzip -c backup_2025-10-13.sql.gz | psql "postgresql://user:pass@host:port/database"
```

⚠️ **ADVERTENCIA**: Esto **SOBREESCRIBIRÁ** todos los datos actuales.

---

## 📅 Calendario de Respaldos Sugerido

| Frecuencia | Método | Responsable |
|------------|--------|-------------|
| **Diario** | Automático Render | Render |
| **Semanal** | Manual Download | Tú |
| **Antes de cambios grandes** | Manual Script | Tú |
| **Mensual** | Full backup + código | Tú |

---

## ✅ Checklist de Respaldo Completo

- [x] Código respaldado en Git tag `v1.0.0-production`
- [ ] Backup de base de datos descargado
- [ ] Backup almacenado en lugar seguro
- [ ] Backup verificado (tamaño > 0, no corrupto)
- [ ] Documentación de respaldo actualizada

---

## 🆘 Contacto de Emergencia

Si necesitas ayuda para restaurar:

1. **Código**: `git checkout v1.0.0-production`
2. **Base de datos**: Contacta a soporte de Render o usa backup local
3. **Documentación**: Revisa `BACKUP_DATABASE.md`

---

## 📊 Estado Actual del Respaldo

**Fecha**: 13 de Octubre, 2025  
**Versión**: v1.0.0-production  
**Commit**: 09571dd  

**Respaldos:**
- ✅ Código: GitHub tag `v1.0.0-production`
- ⏳ Base de datos: **PENDIENTE** (ejecutar pasos arriba)

---

**IMPORTANTE**: Ejecuta el backup de la base de datos HOY para completar el respaldo completo. 🔒

