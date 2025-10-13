#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const backupDir = path.join(__dirname, '../backups');
const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

// Crear directorio de backups si no existe
if (!fs.existsSync(backupDir)) {
  console.log(`📁 Creando directorio de backups...`);
  fs.mkdirSync(backupDir, { recursive: true });
}

// Validar DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL no está configurada');
  console.error('💡 Asegúrate de tener la variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log(`🔒 ==========================================`);
console.log(`   BACKUP DE BASE DE DATOS - EUNACOM`);
console.log(`==========================================`);
console.log(``);
console.log(`🕐 Fecha: ${new Date().toLocaleString('es-CL')}`);
console.log(`📁 Archivo: ${path.basename(backupFile)}`);
console.log(``);
console.log(`🔄 Iniciando backup de PostgreSQL...`);

// Comando pg_dump
const command = `pg_dump "${databaseUrl}" > "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ ERROR durante el backup:`);
    console.error(error.message);
    process.exit(1);
  }
  
  if (stderr) {
    console.warn(`⚠️  Advertencias durante el backup:`);
    console.warn(stderr);
  }
  
  // Verificar que el archivo se creó
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ ERROR: El archivo de backup no se creó`);
    process.exit(1);
  }
  
  // Obtener información del archivo
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const fileSizeKB = (stats.size / 1024).toFixed(2);
  
  console.log(``);
  console.log(`✅ ¡BACKUP COMPLETADO EXITOSAMENTE!`);
  console.log(``);
  console.log(`📊 Información del backup:`);
  console.log(`   • Tamaño: ${fileSizeMB} MB (${fileSizeKB} KB)`);
  console.log(`   • Ubicación: ${backupFile}`);
  console.log(``);
  console.log(`💡 Próximos pasos:`);
  console.log(`   1. Descarga el archivo desde el servidor`);
  console.log(`   2. Guárdalo en un lugar seguro (Dropbox, Drive, S3)`);
  console.log(`   3. Elimina backups antiguos (>30 días)`);
  console.log(``);
  console.log(`🔄 Para restaurar este backup:`);
  console.log(`   psql $DATABASE_URL < ${path.basename(backupFile)}`);
  console.log(``);
});

