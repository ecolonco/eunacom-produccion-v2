/**
 * Script de prueba para OpenAI API
 * Verifica que la API Key funcione correctamente
 */

require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIConnection() {
  console.log('\n🔍 PROBANDO CONEXIÓN A OPENAI API\n');
  console.log('═'.repeat(70));

  try {
    // 1. Validar que la API Key esté configurada
    console.log('\n📋 Paso 1: Validando variables de entorno...\n');

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.AI_ANALYSIS_OPENAI_MODEL || 'gpt-4-turbo-preview';

    if (!apiKey || apiKey.includes('your-')) {
      throw new Error('OPENAI_API_KEY no está configurada correctamente en .env');
    }

    console.log(`✅ OPENAI_API_KEY: Configurada (${apiKey.substring(0, 10)}...)`);
    console.log(`✅ Modelo configurado: ${model}`);

    // 2. Inicializar cliente de OpenAI
    console.log('\n📡 Paso 2: Inicializando cliente de OpenAI...\n');

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log('✅ Cliente inicializado correctamente');

    // 3. Probar con una solicitud simple
    console.log('\n🤖 Paso 3: Probando generación de texto...\n');

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de prueba. Responde en español de forma concisa.',
        },
        {
          role: 'user',
          content: 'Di "Hola, la API de OpenAI está funcionando correctamente" en una sola línea.',
        },
      ],
      max_tokens: 50,
      temperature: 0.5,
    });

    const message = response.choices[0].message.content;
    console.log(`✅ Respuesta recibida: "${message}"`);

    // 4. Verificar metadata de la respuesta
    console.log('\n📊 Paso 4: Verificando metadata de la respuesta...\n');

    console.log(`   Modelo usado: ${response.model}`);
    console.log(`   Tokens usados: ${response.usage.total_tokens}`);
    console.log(`   - Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`   - Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`   ID de respuesta: ${response.id}`);

    // 5. Probar análisis de métricas simuladas
    console.log('\n🎯 Paso 5: Probando análisis de marketing (simulado)...\n');

    const analysisResponse = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Eres un experto analista de marketing digital.
Analiza las métricas y responde en formato JSON con la siguiente estructura:
{
  "summary": "Resumen breve",
  "insights": [{"title": "Insight 1", "type": "positive"}],
  "recommendations": [{"title": "Recomendación 1", "priority": "high"}]
}`,
        },
        {
          role: 'user',
          content: `Analiza estas métricas:
- Campaña: Test Campaign
- Impresiones: 10,000
- Clicks: 500
- CTR: 5%
- Conversiones: 25
- Costo: $5,000 CLP

Genera un análisis breve en formato JSON.`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.7,
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content);
    console.log('✅ Análisis generado correctamente:\n');
    console.log('   Summary:', analysis.summary);
    console.log('   Insights:', analysis.insights?.length || 0);
    console.log('   Recommendations:', analysis.recommendations?.length || 0);

    // 6. Verificar modelos disponibles
    console.log('\n🔍 Paso 6: Verificando modelos disponibles...\n');

    const models = await openai.models.list();
    const gpt4Models = models.data
      .filter((m) => m.id.includes('gpt-4'))
      .map((m) => m.id)
      .slice(0, 5);

    console.log('✅ Modelos GPT-4 disponibles:');
    gpt4Models.forEach((modelId) => {
      console.log(`   - ${modelId}`);
    });

    // 7. Éxito
    console.log('\n═'.repeat(70));
    console.log('\n🎉 ¡CONEXIÓN EXITOSA!\n');
    console.log('✅ La API de OpenAI funciona correctamente');
    console.log('✅ El modelo está configurado y responde');
    console.log('✅ El análisis de marketing está listo para usar');
    console.log('\n💡 El sistema de AI Analysis está completamente funcional\n');
    console.log('═'.repeat(70));

  } catch (error) {
    console.log('\n═'.repeat(70));
    console.log('\n❌ ERROR EN LA CONEXIÓN\n');
    console.log('═'.repeat(70));
    console.error('\nDetalles del error:');
    console.error('Mensaje:', error.message || 'Sin mensaje de error');
    console.error('Tipo:', error.constructor.name);

    if (error.status) {
      console.error('Status HTTP:', error.status);
    }

    if (error.code) {
      console.error('Código de error:', error.code);
    }

    if (error.type) {
      console.error('Tipo de error:', error.type);
    }

    console.log('\n💡 Posibles soluciones:\n');

    if (error.message?.includes('API key')) {
      console.log('❌ API Key inválida o no configurada:');
      console.log('1. Ve a https://platform.openai.com/api-keys');
      console.log('2. Crea una nueva API Key');
      console.log('3. Copia la key y agrégala al archivo .env');
      console.log('4. Formato: OPENAI_API_KEY="sk-..."');
    } else if (error.status === 429) {
      console.log('⚠️  Límite de rate alcanzado:');
      console.log('1. Espera unos minutos e intenta nuevamente');
      console.log('2. Verifica tu plan en https://platform.openai.com/usage');
      console.log('3. Considera actualizar a un plan de pago');
    } else if (error.status === 401) {
      console.log('❌ No autorizado:');
      console.log('1. Verifica que tu API Key sea válida');
      console.log('2. Asegúrate de tener saldo en tu cuenta OpenAI');
      console.log('3. Revisa que la key no haya expirado');
    } else if (error.message?.includes('model')) {
      console.log('⚠️  Modelo no disponible:');
      console.log('1. Verifica que tengas acceso a GPT-4');
      console.log('2. Prueba con "gpt-3.5-turbo" si no tienes acceso a GPT-4');
      console.log('3. Actualiza AI_ANALYSIS_OPENAI_MODEL en .env');
    } else {
      console.log('1. Verifica tu conexión a internet');
      console.log('2. Revisa el archivo .env');
      console.log('3. Asegúrate de tener saldo en OpenAI');
      console.log('4. Intenta con un modelo diferente (gpt-3.5-turbo)');
    }

    console.log('\n');
    process.exit(1);
  }
}

// Ejecutar prueba
testOpenAIConnection();
