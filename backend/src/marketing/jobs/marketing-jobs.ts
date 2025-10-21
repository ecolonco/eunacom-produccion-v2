/**
 * Marketing Intelligence Cron Jobs
 *
 * Jobs automáticos para recopilación de métricas y análisis de IA
 */

import cron from 'node-cron';
import MetricsCollectorService from '../services/metrics-collector.service';
import RecommendationEngineService from '../services/recommendation-engine.service';
import AIChatService from '../services/ai-chat.service';
import { getCronConfig, isFeatureEnabled } from '../utils/config';

const metricsCollector = new MetricsCollectorService();
const recommendationEngine = new RecommendationEngineService();
const aiChat = new AIChatService();

/**
 * Configura y ejecuta todos los cron jobs de marketing
 */
export function startMarketingJobs() {
  const config = getCronConfig();

  if (!isFeatureEnabled('marketing')) {
    console.log('⏸️  Marketing Intelligence deshabilitado');
    return;
  }

  if (!config.enabled) {
    console.log('⏸️  Cron jobs deshabilitados');
    return;
  }

  console.log('🚀 Iniciando Marketing Intelligence Cron Jobs...');

  // ============================================================================
  // JOB 1: SINCRONIZAR CAMPAÑAS (Cada hora)
  // ============================================================================

  cron.schedule(config.collectMetrics, async () => {
    console.log('\n⏰ [CRON] Sincronización de campañas iniciada');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      const result = await metricsCollector.syncCampaigns();
      console.log(`✅ Sincronizadas ${result.synced} campañas`);

      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.errors.length} errores durante sincronización`);
        result.errors.forEach(err => console.error('  -', err));
      }
    } catch (error) {
      console.error('❌ Error en sincronización de campañas:', error);
    }
  });

  console.log(`✅ Job 1: Sincronización de campañas (${config.collectMetrics})`);

  // ============================================================================
  // JOB 2: RECOPILAR MÉTRICAS DIARIAS (8 AM diario)
  // ============================================================================

  cron.schedule(config.dailyAnalysis, async () => {
    console.log('\n⏰ [CRON] Recopilación de métricas diarias iniciada');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      // Recopilar métricas del día anterior
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = await metricsCollector.collectDailyMetrics(yesterday);
      const metricsCount = Array.isArray(result) ? result.length : 0;
      console.log(`✅ Recopiladas ${metricsCount} métricas`);
    } catch (error) {
      console.error('❌ Error en recopilación de métricas:', error);
    }
  });

  console.log(`✅ Job 2: Recopilación de métricas (${config.dailyAnalysis})`);

  // ============================================================================
  // JOB 3: ANÁLISIS DIARIO DE IA (9 AM diario)
  // ============================================================================

  cron.schedule('0 9 * * *', async () => {
    console.log('\n⏰ [CRON] Análisis diario de IA iniciado');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      // Generar análisis y recomendaciones de los últimos 7 días
      const result = await recommendationEngine.generateRecommendationsFromAnalysis();

      console.log('✅ Análisis completado');
      console.log(`📊 Insights generados: ${result.analysis?.insights?.length || 0}`);
      const recsCreated = Array.isArray(result.recommendations) ? result.recommendations.length : 0;
      console.log(`💡 Recomendaciones creadas: ${recsCreated}`);
    } catch (error) {
      console.error('❌ Error en análisis de IA:', error);
    }
  });

  console.log('✅ Job 3: Análisis diario de IA (9:00 AM)');

  // ============================================================================
  // JOB 4: ANÁLISIS SEMANAL (Lunes 10 AM)
  // ============================================================================

  cron.schedule(config.weeklyAnalysis, async () => {
    console.log('\n⏰ [CRON] Análisis semanal de IA iniciado');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      // Análisis de los últimos 30 días
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await recommendationEngine.generateRecommendationsFromAnalysis(
        undefined,
        {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }
      );

      console.log('✅ Análisis semanal completado');
      console.log(`📊 Insights generados: ${result.analysis?.insights.length || 0}`);
      console.log(`💡 Recomendaciones creadas: ${result.recommendations.created}`);
    } catch (error) {
      console.error('❌ Error en análisis semanal:', error);
    }
  });

  console.log(`✅ Job 4: Análisis semanal (${config.weeklyAnalysis})`);

  // ============================================================================
  // JOB 5: LIMPIEZA DE RECOMENDACIONES EXPIRADAS (Diario a las 2 AM)
  // ============================================================================

  cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ [CRON] Limpieza de recomendaciones expiradas');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      const count = await recommendationEngine.cleanupExpiredRecommendations();
      console.log(`🧹 ${count} recomendaciones marcadas como expiradas`);
    } catch (error) {
      console.error('❌ Error en limpieza de recomendaciones:', error);
    }
  });

  console.log('✅ Job 5: Limpieza de recomendaciones (2:00 AM)');

  // ============================================================================
  // JOB 6: LIMPIEZA DE CONVERSACIONES ANTIGUAS (Semanal - Domingo 3 AM)
  // ============================================================================

  cron.schedule('0 3 * * 0', async () => {
    console.log('\n⏰ [CRON] Limpieza de conversaciones antiguas');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      const count = await aiChat.cleanupOldConversations(30);
      console.log(`🧹 ${count} mensajes antiguos eliminados`);
    } catch (error) {
      console.error('❌ Error en limpieza de conversaciones:', error);
    }
  });

  console.log('✅ Job 6: Limpieza de conversaciones (Domingos 3:00 AM)');

  // ============================================================================
  // JOB 7: LIMPIEZA DE DATOS ANTIGUOS (Semanal - Domingo 4 AM)
  // ============================================================================

  cron.schedule('0 4 * * 0', async () => {
    console.log('\n⏰ [CRON] Limpieza de datos antiguos');
    console.log(`📅 ${new Date().toISOString()}`);

    try {
      const count = await metricsCollector.cleanupOldData();
      console.log(`🧹 Datos antiguos eliminados`);
    } catch (error) {
      console.error('❌ Error en limpieza de datos:', error);
    }
  });

  console.log('✅ Job 7: Limpieza de datos antiguos (Domingos 4:00 AM)');

  console.log('\n🎯 Todos los jobs configurados correctamente');
  console.log('📝 Resumen de horarios:');
  console.log(`   - Sincronización campañas: ${config.collectMetrics}`);
  console.log(`   - Recopilación métricas: ${config.dailyAnalysis}`);
  console.log('   - Análisis diario IA: 9:00 AM');
  console.log(`   - Análisis semanal: ${config.weeklyAnalysis}`);
  console.log('   - Limpieza recomendaciones: Diario 2:00 AM');
  console.log('   - Limpieza conversaciones: Domingos 3:00 AM');
  console.log('   - Limpieza datos antiguos: Domingos 4:00 AM\n');
}

/**
 * Ejecuta un job específico manualmente (útil para testing)
 */
export async function runJobManually(jobName: string): Promise<void> {
  console.log(`🔧 Ejecutando job manualmente: ${jobName}`);

  switch (jobName) {
    case 'syncCampaigns':
      await metricsCollector.syncCampaigns();
      break;

    case 'collectMetrics':
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await metricsCollector.collectDailyMetrics(yesterday);
      break;

    case 'dailyAnalysis':
      await recommendationEngine.generateRecommendationsFromAnalysis();
      break;

    case 'weeklyAnalysis':
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      await recommendationEngine.generateRecommendationsFromAnalysis(undefined, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      break;

    case 'cleanupRecommendations':
      await recommendationEngine.cleanupExpiredRecommendations();
      break;

    case 'cleanupConversations':
      await aiChat.cleanupOldConversations(30);
      break;

    case 'cleanupData':
      await metricsCollector.cleanupOldData();
      break;

    default:
      throw new Error(`Job desconocido: ${jobName}`);
  }

  console.log(`✅ Job ${jobName} completado`);
}

/**
 * Detiene todos los cron jobs
 */
export function stopMarketingJobs() {
  // node-cron maneja automáticamente la limpieza
  console.log('⏹️  Marketing Intelligence Jobs detenidos');
}

export default {
  startMarketingJobs,
  runJobManually,
  stopMarketingJobs,
};
