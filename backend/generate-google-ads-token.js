/**
 * Script temporal para generar Google Ads Refresh Token
 * Versión actualizada para Desktop App OAuth
 */

const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

// Configuración OAuth2
const CLIENT_ID = '1034384990161-h74cr7tre01rkknhm9o5hmrh7ddbhj50.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:8080';
const PORT = 8080;

// Scopes necesarios para Google Ads API
const SCOPES = ['https://www.googleapis.com/auth/adwords'];

// Crear cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔐 GENERADOR DE REFRESH TOKEN - GOOGLE ADS API\n');
console.log('═'.repeat(70));
console.log('\n📋 INSTRUCCIONES:\n');
console.log(`1. Se abrirá un servidor temporal en http://localhost:${PORT}`);
console.log('2. Abre esta URL en tu navegador:\n');
console.log(`   ${authUrl}\n`);
console.log('3. Inicia sesión con tu cuenta de Google (ecolonco@gmail.com)');
console.log('4. Autoriza el acceso a Google Ads');
console.log('5. Serás redirigido automáticamente y el token se generará');
console.log('\n═'.repeat(70));
console.log('\n⏳ Esperando autorización...\n');
console.log('💡 Copia y pega esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\n');

// Crear servidor temporal
const server = http.createServer(async (req, res) => {
  try {
    // Manejar cualquier request con código de autorización
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');

    if (!code) {
      // Si no hay código, mostrar página de espera
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Esperando autorización...</title>
        </head>
        <body>
          <h1>Esperando autorización...</h1>
          <p>Por favor, autoriza el acceso en la ventana de Google.</p>
        </body>
        </html>
      `);
      return;
    }

    console.log('✅ Código de autorización recibido!');
    console.log('⏳ Intercambiando código por tokens...\n');

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Respuesta exitosa al navegador
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Autorización Exitosa</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .success {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #4CAF50; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅ ¡Autorización Exitosa!</h1>
          <p>El Refresh Token ha sido generado correctamente.</p>
          <p><strong>Vuelve a la terminal</strong> para ver las credenciales completas.</p>
          <p>Puedes cerrar esta ventana.</p>
        </div>
      </body>
      </html>
    `);

    // Mostrar tokens en consola
    console.log('✅ ¡Tokens obtenidos exitosamente!\n');
    console.log('═'.repeat(70));
    console.log('\n📝 COPIA ESTAS LÍNEAS A TU ARCHIVO .env:\n');
    console.log('═'.repeat(70));
    console.log('\n# Google Ads API Configuration');
    console.log(`GOOGLE_ADS_DEVELOPER_TOKEN="OYUXYk74OWntEGU0nA3Hcg"`);
    console.log(`GOOGLE_ADS_CLIENT_ID="${CLIENT_ID}"`);
    console.log(`GOOGLE_ADS_CLIENT_SECRET="${CLIENT_SECRET}"`);
    console.log(`GOOGLE_ADS_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log(`GOOGLE_ADS_CUSTOMER_ID="725-201-2286"`);
    console.log(`GOOGLE_ADS_LOGIN_CUSTOMER_ID=""`);
    console.log('\n═'.repeat(70));
    console.log('\n✅ ¡Configuración de Google Ads API completada!\n');

    // Cerrar servidor
    setTimeout(() => {
      server.close();
      console.log('🔒 Servidor cerrado. Puedes continuar con la configuración.\n');
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('\n❌ Error al procesar la autorización:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>Error al procesar la autorización</h1><p>' + error.message + '</p>');
    setTimeout(() => {
      server.close();
      process.exit(1);
    }, 1000);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}\n`);
});

// Manejar cierre
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Proceso cancelado por el usuario.\n');
  server.close();
  process.exit(0);
});
