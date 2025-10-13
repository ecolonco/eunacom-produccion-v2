# 🔒 Guía de Respaldo de Base de Datos PostgreSQL

## Respaldo desde Render (Recomendado)

### Opción 1: Backup Automático de Render

Render hace backups automáticos de PostgreSQL. Para acceder:

1. Ve a tu servicio de PostgreSQL en Render
2. Click en **"Backups"** en el menú lateral
3. Verás los backups automáticos disponibles
4. Para crear uno manual: **"Create Backup"**

### Opción 2: Backup Manual con pg_dump

#### Paso 1: Conectarse al Shell de Render Backend

1. Ve a: https://dashboard.render.com
2. Selecciona tu servicio: `eunacom-backend-v3`
3. Click en **"Shell"** en el menú superior

#### Paso 2: Crear el Backup

```bash
# En el shell de Render, ejecuta:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

⚠️ **Problema**: El archivo se crea en el contenedor efímero de Render.

#### Paso 3: Backup con Compresión (recomendado)

```bash
# Crear backup comprimido
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Opción 3: Backup desde Local (Requiere DATABASE_URL)

Si tienes acceso a la `DATABASE_URL` completa:

```bash
# Desde tu terminal local
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/DATABASE" > backup_local_$(date +%Y%m%d_%H%M%S).sql

# O con compresión
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/DATABASE" | gzip > backup_local_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Opción 4: Script de Backup Programable

Crear un script Node.js que se ejecute periódicamente:

**`backend/scripts/backup-database.js`**

```javascript
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

// Crear directorio si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

console.log(`🔄 Iniciando backup de base de datos...`);
console.log(`📁 Archivo: ${backupFile}`);

const command = `pg_dump "${databaseUrl}" > "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error en backup: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`⚠️ Advertencias: ${stderr}`);
  }
  
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Backup completado exitosamente`);
  console.log(`📊 Tamaño: ${fileSizeMB} MB`);
  console.log(`📍 Ubicación: ${backupFile}`);
});
```

**Ejecutar:**
```bash
# Desde el shell de Render o local
cd backend
node scripts/backup-database.js
```

---

## Restaurar Base de Datos

### Desde archivo SQL

```bash
# Restaurar desde backup
psql $DATABASE_URL < backup_20251013_120000.sql

# O desde backup comprimido
gunzip -c backup_20251013_120000.sql.gz | psql $DATABASE_URL
```

### Restaurar desde Backup de Render

1. Ve a **Backups** en el dashboard de PostgreSQL
2. Selecciona el backup deseado
3. Click en **"Restore"**
4. Confirma la operación

⚠️ **ADVERTENCIA**: Restaurar sobreescribirá todos los datos actuales.

---

## Recomendaciones

### Frecuencia de Backups

- **Desarrollo**: Semanal
- **Producción**: Diario (automático por Render)
- **Antes de cambios importantes**: Manual

### Almacenamiento

1. **GitHub** (para backups pequeños):
   ```bash
   # Crear branch de backup
   git checkout -b backup/db-20251013
   # Agregar backup (si es pequeño)
   git add backups/
   git commit -m "Database backup - October 13, 2025"
   git push origin backup/db-20251013
   ```

2. **AWS S3 / Google Cloud Storage** (para backups grandes)

3. **Dropbox / Google Drive** (para backups manuales)

### Seguridad

- ⚠️ **NUNCA** subas backups a repositorios públicos
- 🔒 Encripta backups si contienen datos sensibles
- 🗑️ Elimina backups antiguos (>30 días)

---

## Script de Backup Automatizado (Recomendado)

Agregar a `package.json`:

```json
{
  "scripts": {
    "backup:db": "node scripts/backup-database.js",
    "backup:full": "npm run backup:db && git tag backup/$(date +%Y%m%d_%H%M%S)"
  }
}
```

Ejecutar:
```bash
npm run backup:db
```

---

## Verificar Integridad del Backup

```bash
# Contar tablas en el backup
grep "CREATE TABLE" backup_20251013_120000.sql | wc -l

# Ver tamaño del archivo
ls -lh backup_20251013_120000.sql

# Verificar que no esté corrupto
gzip -t backup_20251013_120000.sql.gz
```

---

## Estado Actual

- ✅ **Código**: Respaldado en Git tag `v1.0.0-production`
- ⏳ **Base de datos**: Pendiente (seguir pasos arriba)

---

## 🆘 En caso de Emergencia

Si necesitas restaurar toda la aplicación:

1. **Código**:
   ```bash
   git checkout v1.0.0-production
   ```

2. **Base de datos**:
   ```bash
   psql $DATABASE_URL < backup_FECHA.sql
   ```

3. **Redeploy**:
   - Frontend: Vercel detecta el cambio automáticamente
   - Backend: Render detecta el cambio automáticamente

---

**Última actualización**: 13 de Octubre, 2025

