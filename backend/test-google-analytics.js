/**
 * Script de prueba para Google Analytics 4 API
 * Verifica que las credenciales y permisos funcionen correctamente
 */

require('dotenv').config();
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const fs = require('fs');

async function testGoogleAnalytics() {
  console.log('\n🔍 PROBANDO CONEXIÓN A GOOGLE ANALYTICS 4 API\n');
  console.log('═'.repeat(70));

  try {
    // 1. Validar variables de entorno
    console.log('\n📋 Paso 1: Validando configuración...\n');

    const propertyId = process.env.GA4_PROPERTY_ID;
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

    if (!propertyId) {
      throw new Error('GA4_PROPERTY_ID no está configurado en .env');
    }

    if (!keyPath) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH no está configurado en .env');
    }

    console.log(`✅ GA4_PROPERTY_ID: ${propertyId}`);
    console.log(`✅ Archivo de credenciales: ${keyPath}`);

    // 2. Verificar archivo de credenciales
    console.log('\n📄 Paso 2: Verificando archivo de credenciales...\n');

    if (!fs.existsSync(keyPath)) {
      throw new Error(`Archivo de credenciales no encontrado: ${keyPath}`);
    }

    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    console.log(`✅ Archivo JSON válido`);
    console.log(`✅ Service Account: ${credentials.client_email}`);
    console.log(`✅ Project ID: ${credentials.project_id}`);

    // 3. Inicializar cliente
    console.log('\n📡 Paso 3: Inicializando cliente de Google Analytics 4...\n');

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    });

    console.log('✅ Cliente inicializado correctamente');

    // 4. Obtener información de la propiedad
    console.log('\n📊 Paso 4: Obteniendo métricas de la propiedad...\n');

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'date',
        },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
      ],
      limit: 7,
    });

    console.log('✅ Datos obtenidos correctamente\n');

    // 5. Mostrar resultados
    console.log('📈 Métricas de los últimos 7 días:\n');

    if (response.rows && response.rows.length > 0) {
      console.log('   Fecha       | Sesiones | Usuarios | Vistas');
      console.log('   ' + '-'.repeat(50));

      response.rows.forEach((row) => {
        const date = row.dimensionValues[0].value;
        const sessions = row.metricValues[0].value;
        const users = row.metricValues[1].value;
        const pageViews = row.metricValues[2].value;

        // Formatear fecha YYYYMMDD a YYYY-MM-DD
        const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

        console.log(
          `   ${formattedDate} | ${sessions.padStart(8)} | ${users.padStart(8)} | ${pageViews.padStart(6)}`
        );
      });

      // Calcular totales
      const totalSessions = response.rows.reduce(
        (sum, row) => sum + parseInt(row.metricValues[0].value),
        0
      );
      const totalUsers = response.rows.reduce(
        (sum, row) => sum + parseInt(row.metricValues[1].value),
        0
      );
      const totalPageViews = response.rows.reduce(
        (sum, row) => sum + parseInt(row.metricValues[2].value),
        0
      );

      console.log('   ' + '-'.repeat(50));
      console.log(
        `   TOTAL       | ${String(totalSessions).padStart(8)} | ${String(totalUsers).padStart(8)} | ${String(totalPageViews).padStart(6)}`
      );
    } else {
      console.log('   ⚠️  No hay datos disponibles para este período');
      console.log('   Esto es normal si la propiedad GA4 es nueva o no tiene tráfico aún');
    }

    // 6. Probar query por fuente de tráfico
    console.log('\n🌐 Paso 5: Obteniendo datos por fuente de tráfico...\n');

    const [trafficResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' },
      ],
      metrics: [{ name: 'sessions' }],
      orderBys: [
        {
          metric: { metricName: 'sessions' },
          desc: true,
        },
      ],
      limit: 5,
    });

    if (trafficResponse.rows && trafficResponse.rows.length > 0) {
      console.log('✅ Top 5 fuentes de tráfico:\n');
      trafficResponse.rows.forEach((row, idx) => {
        const source = row.dimensionValues[0].value;
        const medium = row.dimensionValues[1].value;
        const sessions = row.metricValues[0].value;
        console.log(`   ${idx + 1}. ${source} / ${medium} - ${sessions} sesiones`);
      });
    } else {
      console.log('   ℹ️  No hay datos de fuentes de tráfico disponibles');
    }

    // 7. Éxito
    console.log('\n═'.repeat(70));
    console.log('\n🎉 ¡CONEXIÓN EXITOSA!\n');
    console.log('✅ Las credenciales de Google Analytics 4 funcionan correctamente');
    console.log('✅ El Service Account tiene acceso a la propiedad');
    console.log('✅ Puedes obtener métricas del sitio web');
    console.log('\n💡 El sistema de Google Analytics 4 está completamente funcional\n');
    console.log('═'.repeat(70));
  } catch (error) {
    console.log('\n═'.repeat(70));
    console.log('\n❌ ERROR EN LA CONEXIÓN\n');
    console.log('═'.repeat(70));
    console.error('\nDetalles del error:');
    console.error('Mensaje:', error.message || 'Sin mensaje de error');
    console.error('Tipo:', error.constructor.name);

    if (error.code) {
      console.error('Código:', error.code);
    }

    if (error.details) {
      console.error('Detalles:', error.details);
    }

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.log('\n💡 Posibles soluciones:\n');

    if (error.message?.includes('PERMISSION_DENIED') || error.code === 7) {
      console.log('❌ Permiso denegado - El Service Account no tiene acceso:');
      console.log('1. Ve a Google Analytics → Administración → Acceso a la propiedad');
      console.log('2. Agrega el Service Account como usuario con rol "Lector"');
      console.log('3. Email del Service Account:');
      console.log('   eunacom-analytics@aremko-e51ae.iam.gserviceaccount.com');
    } else if (error.message?.includes('NOT_FOUND') || error.code === 5) {
      console.log('❌ Propiedad no encontrada:');
      console.log('1. Verifica que el GA4_PROPERTY_ID sea correcto en .env');
      console.log('2. Formato correcto: solo números (ej: 12324017395)');
      console.log('3. Verifica en Google Analytics → Administración → Detalles de propiedad');
    } else if (error.message?.includes('credentials')) {
      console.log('❌ Problema con credenciales:');
      console.log('1. Verifica que el archivo JSON esté en credentials/google-service-account.json');
      console.log('2. Asegúrate de que el archivo no esté corrupto');
      console.log('3. Descarga nuevamente las credenciales desde Google Cloud Console');
    } else {
      console.log('1. Verifica tu conexión a internet');
      console.log('2. Revisa el archivo .env');
      console.log('3. Asegúrate de que la propiedad GA4 existe');
      console.log('4. Confirma que el Service Account tiene acceso en Google Analytics');
    }

    console.log('\n');
    process.exit(1);
  }
}

// Ejecutar prueba
testGoogleAnalytics();
