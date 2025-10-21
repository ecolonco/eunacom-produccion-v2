/**
 * Script de prueba para Google Ads API
 * Verifica que las credenciales funcionen correctamente
 */

require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

async function testGoogleAdsConnection() {
  console.log('\n🔍 PROBANDO CONEXIÓN A GOOGLE ADS API\n');
  console.log('═'.repeat(70));

  try {
    // 1. Validar que las credenciales estén en .env
    console.log('\n📋 Paso 1: Validando variables de entorno...\n');

    const requiredVars = {
      'GOOGLE_ADS_DEVELOPER_TOKEN': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      'GOOGLE_ADS_CLIENT_ID': process.env.GOOGLE_ADS_CLIENT_ID,
      'GOOGLE_ADS_CLIENT_SECRET': process.env.GOOGLE_ADS_CLIENT_SECRET,
      'GOOGLE_ADS_REFRESH_TOKEN': process.env.GOOGLE_ADS_REFRESH_TOKEN,
      'GOOGLE_ADS_CUSTOMER_ID': process.env.GOOGLE_ADS_CUSTOMER_ID,
    };

    let allPresent = true;
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value || value.includes('your-')) {
        console.log(`❌ ${key}: NO CONFIGURADA`);
        allPresent = false;
      } else {
        console.log(`✅ ${key}: Configurada`);
      }
    }

    if (!allPresent) {
      throw new Error('Faltan variables de entorno. Revisa tu archivo .env');
    }

    // 2. Inicializar cliente de Google Ads
    console.log('\n📡 Paso 2: Inicializando cliente de Google Ads...\n');

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    console.log('✅ Cliente inicializado correctamente');

    // 3. Obtener customer
    console.log('\n🔐 Paso 3: Autenticando con cuenta de Google Ads...\n');

    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, '');

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
        ? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, '')
        : undefined,
    });

    console.log(`✅ Autenticado con cuenta: ${process.env.GOOGLE_ADS_CUSTOMER_ID}`);

    // 4. Obtener información de la cuenta
    console.log('\n📊 Paso 4: Obteniendo información de la cuenta...\n');

    const accountQuery = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.status
      FROM customer
      WHERE customer.id = ${customerId}
    `;

    const accountInfo = await customer.query(accountQuery);

    if (accountInfo.length > 0) {
      const account = accountInfo[0].customer;
      console.log('✅ Información de la cuenta obtenida:\n');
      console.log(`   Nombre: ${account.descriptive_name}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Moneda: ${account.currency_code}`);
      console.log(`   Zona horaria: ${account.time_zone}`);
      console.log(`   Estado: ${account.status}`);
    }

    // 5. Obtener campañas
    console.log('\n📢 Paso 5: Obteniendo campañas activas...\n');

    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
      LIMIT 10
    `;

    const campaigns = await customer.query(campaignQuery);

    console.log(`✅ Se encontraron ${campaigns.length} campañas:\n`);

    if (campaigns.length > 0) {
      campaigns.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.campaign.name}`);
        console.log(`      - ID: ${row.campaign.id}`);
        console.log(`      - Estado: ${row.campaign.status}`);
        console.log(`      - Tipo: ${row.campaign.advertising_channel_type}\n`);
      });
    } else {
      console.log('   ⚠️  No se encontraron campañas activas en esta cuenta.');
    }

    // 6. Éxito
    console.log('═'.repeat(70));
    console.log('\n🎉 ¡CONEXIÓN EXITOSA!\n');
    console.log('✅ Todas las credenciales funcionan correctamente');
    console.log('✅ Puedes acceder a la API de Google Ads');
    console.log('✅ El Marketing Intelligence System está listo para usar\n');
    console.log('═'.repeat(70));

  } catch (error) {
    console.log('\n═'.repeat(70));
    console.log('\n❌ ERROR EN LA CONEXIÓN\n');
    console.log('═'.repeat(70));
    console.error('\nDetalles del error:');
    console.error('Mensaje:', error.message || 'Sin mensaje de error');
    console.error('Tipo:', error.constructor.name);

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    if (error.response) {
      console.error('\nRespuesta de la API:');
      console.error(JSON.stringify(error.response, null, 2));
    }

    if (error.errors) {
      console.error('\nErrores adicionales:');
      console.error(JSON.stringify(error.errors, null, 2));
    }

    console.log('\n💡 Posibles soluciones:\n');
    console.log('1. Verifica que el Developer Token esté aprobado');
    console.log('2. Confirma que el Refresh Token no haya expirado');
    console.log('3. Revisa que el Customer ID sea correcto');
    console.log('4. Si es cuenta MCC, necesitas especificar LOGIN_CUSTOMER_ID');
    console.log('5. Asegúrate de que la cuenta tenga campañas activas\n');

    process.exit(1);
  }
}

// Ejecutar prueba
testGoogleAdsConnection();
