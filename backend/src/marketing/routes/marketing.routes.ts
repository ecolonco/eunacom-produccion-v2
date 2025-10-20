/**
 * Marketing Intelligence Routes
 *
 * Definición de rutas API para el sistema de inteligencia de marketing
 */

import { Router } from 'express';
import MarketingController from '../controllers/marketing.controller';

const router = Router();
const controller = new MarketingController();

// ============================================================================
// DASHBOARD & METRICS
// ============================================================================

/**
 * GET /api/marketing/dashboard
 * Obtiene datos del dashboard principal con métricas agregadas
 * Query params: days (default: 7)
 */
router.get('/dashboard', (req, res) => controller.getDashboard(req, res));

// ============================================================================
// AI ANALYSIS
// ============================================================================

/**
 * POST /api/marketing/analyze
 * Ejecuta análisis de IA y genera recomendaciones
 * Body: { campaignIds?: string[], dateRange?: { startDate, endDate }, context?: string }
 */
router.post('/analyze', (req, res) => controller.runAnalysis(req, res));

/**
 * GET /api/marketing/analysis/latest
 * Obtiene el último análisis guardado
 * Query params: type? (DAILY | WEEKLY | MONTHLY)
 */
router.get('/analysis/latest', (req, res) => controller.getLatestAnalysis(req, res));

/**
 * GET /api/marketing/analysis/history
 * Obtiene historial de análisis
 * Query params: days? (default: 30), type? (DAILY | WEEKLY | MONTHLY)
 */
router.get('/analysis/history', (req, res) => controller.getAnalysisHistory(req, res));

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * GET /api/marketing/recommendations
 * Obtiene lista de recomendaciones
 * Query params: status, priority, category, campaignId, limit
 */
router.get('/recommendations', (req, res) => controller.getRecommendations(req, res));

/**
 * GET /api/marketing/recommendations/stats
 * Obtiene estadísticas de recomendaciones
 * Query params: days (default: 30)
 */
router.get('/recommendations/stats', (req, res) => controller.getRecommendationStats(req, res));

/**
 * GET /api/marketing/recommendations/:id
 * Obtiene una recomendación específica
 */
router.get('/recommendations/:id', (req, res) => controller.getRecommendationById(req, res));

/**
 * POST /api/marketing/recommendations/:id/apply
 * Marca una recomendación como aplicada
 * Body: { notes?: string }
 */
router.post('/recommendations/:id/apply', (req, res) => controller.applyRecommendation(req, res));

/**
 * POST /api/marketing/recommendations/:id/dismiss
 * Marca una recomendación como descartada
 * Body: { reason?: string }
 */
router.post('/recommendations/:id/dismiss', (req, res) => controller.dismissRecommendation(req, res));

// ============================================================================
// AI CHAT
// ============================================================================

/**
 * POST /api/marketing/chat
 * Envía mensaje al chat de IA
 * Body: { message: string, sessionId: string }
 */
router.post('/chat', (req, res) => controller.chat(req, res));

/**
 * GET /api/marketing/chat/history/:sessionId
 * Obtiene historial de una conversación
 * Query params: limit (default: 50)
 */
router.get('/chat/history/:sessionId', (req, res) => controller.getChatHistory(req, res));

/**
 * GET /api/marketing/chat/stats
 * Obtiene estadísticas de uso del chat
 * Query params: days (default: 30)
 */
router.get('/chat/stats', (req, res) => controller.getChatStats(req, res));

// ============================================================================
// DATA COLLECTION
// ============================================================================

/**
 * POST /api/marketing/sync/campaigns
 * Sincroniza campañas desde Google Ads
 */
router.post('/sync/campaigns', (req, res) => controller.syncCampaigns(req, res));

/**
 * POST /api/marketing/collect/metrics
 * Recopila métricas manualmente
 * Body: { date?: string (YYYY-MM-DD) }
 */
router.post('/collect/metrics', (req, res) => controller.collectMetrics(req, res));

// ============================================================================
// CAMPAIGNS
// ============================================================================

/**
 * GET /api/marketing/campaigns
 * Obtiene lista de campañas
 * Query params: status, platform, limit (default: 50)
 */
router.get('/campaigns', (req, res) => controller.getCampaigns(req, res));

/**
 * GET /api/marketing/campaigns/:id
 * Obtiene detalles de una campaña con métricas y recomendaciones
 * Query params: days (default: 30)
 */
router.get('/campaigns/:id', (req, res) => controller.getCampaignById(req, res));

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/marketing/health
 * Health check del sistema de marketing
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Marketing Intelligence System',
    version: '2.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

export default router;
