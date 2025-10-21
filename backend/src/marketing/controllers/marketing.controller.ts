/**
 * Marketing Intelligence Controller
 *
 * Controlador principal para endpoints de marketing intelligence,
 * análisis de IA, recomendaciones y chat.
 */

import { Request, Response } from 'express';
import AIAnalysisService from '../services/ai-analysis.service';
import RecommendationEngineService from '../services/recommendation-engine.service';
import AIChatService from '../services/ai-chat.service';
import MetricsCollectorService from '../services/metrics-collector.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MarketingController {
  private aiAnalysis: AIAnalysisService;
  private recommendationEngine: RecommendationEngineService;
  private aiChat: AIChatService;
  private metricsCollector: MetricsCollectorService;

  constructor() {
    this.aiAnalysis = new AIAnalysisService();
    this.recommendationEngine = new RecommendationEngineService();
    this.aiChat = new AIChatService();
    this.metricsCollector = new MetricsCollectorService();
  }

  // ============================================================================
  // DASHBOARD & METRICS
  // ============================================================================

  /**
   * GET /api/marketing/dashboard
   * Obtiene datos del dashboard principal
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const { days = 7 } = req.query;
      const daysNum = parseInt(days as string, 10);

      const since = new Date();
      since.setDate(since.getDate() - daysNum);

      // Métricas agregadas
      const metrics = await prisma.campaignMetric.findMany({
        where: {
          date: { gte: since },
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      // Calcular totales
      const totals = metrics.reduce(
        (acc, m) => ({
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          conversions: acc.conversions + m.conversions,
          cost: acc.cost + m.cost,
          revenue: acc.revenue + (m.revenue || 0),
        }),
        { impressions: 0, clicks: 0, conversions: 0, cost: 0, revenue: 0 }
      );

      const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const avgCPC = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
      const avgCPA = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
      const roi = totals.cost > 0 ? ((totals.revenue - totals.cost) / totals.cost) * 100 : 0;

      res.json({
        success: true,
        data: {
          summary: {
            ...totals,
            ctr: avgCTR,
            cpc: avgCPC,
            cpa: avgCPA,
            roi,
          },
          dailyMetrics: metrics,
          period: {
            days: daysNum,
            start: since.toISOString(),
            end: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Error en getDashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo datos del dashboard',
      });
    }
  }

  // ============================================================================
  // AI ANALYSIS
  // ============================================================================

  /**
   * POST /api/marketing/analyze
   * Ejecuta análisis de IA manual
   */
  async runAnalysis(req: Request, res: Response) {
    try {
      const { campaignIds, dateRange, context } = req.body;

      // Generar análisis y recomendaciones
      const result = await this.recommendationEngine.generateRecommendationsFromAnalysis(
        campaignIds,
        dateRange
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error en runAnalysis:', error);
      res.status(500).json({
        success: false,
        error: 'Error ejecutando análisis',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * GET /api/marketing/analysis/latest
   * Obtiene el último análisis guardado
   */
  async getLatestAnalysis(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const analysis = await this.aiAnalysis.getLatestAnalysis(type as any);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró análisis',
        });
      }

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error en getLatestAnalysis:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo análisis',
      });
    }
  }

  /**
   * GET /api/marketing/analysis/history
   * Obtiene historial de análisis
   */
  async getAnalysisHistory(req: Request, res: Response) {
    try {
      const { days = 30, type } = req.query;
      const history = await this.aiAnalysis.getAnalysisHistory(
        parseInt(days as string, 10),
        type as any
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error en getAnalysisHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo historial',
      });
    }
  }

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  /**
   * GET /api/marketing/recommendations
   * Obtiene recomendaciones pendientes
   */
  async getRecommendations(req: Request, res: Response) {
    try {
      const { status = 'pending', priority, category, campaignId, limit } = req.query;

      const recommendations = await this.recommendationEngine.getPendingRecommendations({
        priority: priority as any,
        category: category as string,
        campaignId: campaignId as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      console.error('Error en getRecommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo recomendaciones',
      });
    }
  }

  /**
   * GET /api/marketing/recommendations/:id
   * Obtiene una recomendación específica
   */
  async getRecommendationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const recommendation = await this.recommendationEngine.getRecommendationById(id);

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      console.error('Error en getRecommendationById:', error);
      res.status(404).json({
        success: false,
        error: 'Recomendación no encontrada',
      });
    }
  }

  /**
   * POST /api/marketing/recommendations/:id/apply
   * Marca una recomendación como aplicada
   */
  async applyRecommendation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      // TODO: Obtener userId del token de autenticación
      const appliedBy = 'system'; // Temporal

      const recommendation = await this.recommendationEngine.applyRecommendation(
        id,
        appliedBy,
        notes
      );

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      console.error('Error en applyRecommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Error aplicando recomendación',
      });
    }
  }

  /**
   * POST /api/marketing/recommendations/:id/dismiss
   * Marca una recomendación como descartada
   */
  async dismissRecommendation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const dismissedBy = 'system'; // Temporal

      const recommendation = await this.recommendationEngine.dismissRecommendation(
        id,
        dismissedBy,
        reason
      );

      res.json({
        success: true,
        data: recommendation,
      });
    } catch (error) {
      console.error('Error en dismissRecommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Error descartando recomendación',
      });
    }
  }

  /**
   * GET /api/marketing/recommendations/stats
   * Obtiene estadísticas de recomendaciones
   */
  async getRecommendationStats(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;
      const stats = await this.recommendationEngine.getRecommendationStats(
        parseInt(days as string, 10)
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error en getRecommendationStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas',
      });
    }
  }

  // ============================================================================
  // AI CHAT
  // ============================================================================

  /**
   * POST /api/marketing/chat
   * Envía mensaje al chat de IA
   */
  async chat(req: Request, res: Response) {
    try {
      const { message, sessionId } = req.body;

      if (!message || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere message y sessionId',
        });
      }

      const response = await this.aiChat.chat(message, sessionId);

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error en chat:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error en chat',
      });
    }
  }

  /**
   * GET /api/marketing/chat/history/:sessionId
   * Obtiene historial de conversación
   */
  async getChatHistory(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { limit = 50 } = req.query;

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: parseInt(limit as string, 10),
      });

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      console.error('Error en getChatHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo historial',
      });
    }
  }

  /**
   * GET /api/marketing/chat/stats
   * Obtiene estadísticas de uso del chat
   */
  async getChatStats(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;
      const stats = await this.aiChat.getChatStats(parseInt(days as string, 10));

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error en getChatStats:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas',
      });
    }
  }

  // ============================================================================
  // DATA COLLECTION
  // ============================================================================

  /**
   * POST /api/marketing/sync/campaigns
   * Sincroniza campañas desde Google Ads
   */
  async syncCampaigns(req: Request, res: Response) {
    try {
      const result = await this.metricsCollector.syncCampaigns();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error en syncCampaigns:', error);
      res.status(500).json({
        success: false,
        error: 'Error sincronizando campañas',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * POST /api/marketing/collect/metrics
   * Recopila métricas manualmente
   */
  async collectMetrics(req: Request, res: Response) {
    try {
      const { date } = req.body;
      const result = await this.metricsCollector.collectDailyMetrics(date);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error en collectMetrics:', error);
      res.status(500).json({
        success: false,
        error: 'Error recopilando métricas',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  /**
   * GET /api/marketing/campaigns
   * Obtiene lista de campañas
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      const { status, platform, limit = 50 } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (platform) where.platform = platform;

      const campaigns = await prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        include: {
          _count: {
            select: {
              metrics: true,
              recommendations: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      console.error('Error en getCampaigns:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo campañas',
      });
    }
  }

  /**
   * GET /api/marketing/campaigns/:id
   * Obtiene detalles de una campaña
   */
  async getCampaignById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;

      const campaign = await prisma.campaign.findUnique({
        where: { id },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: 'Campaña no encontrada',
        });
      }

      // Obtener métricas
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days as string, 10));

      const metrics = await prisma.campaignMetric.findMany({
        where: {
          campaignId: id,
          date: { gte: since },
        },
        orderBy: { date: 'desc' },
      });

      // Obtener recomendaciones
      const recommendations = await prisma.recommendation.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      res.json({
        success: true,
        data: {
          campaign,
          metrics,
          recommendations,
        },
      });
    } catch (error) {
      console.error('Error en getCampaignById:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo campaña',
      });
    }
  }
}

export default MarketingController;
