/**
 * Recommendation Engine Service
 *
 * Motor de recomendaciones que procesa las sugerencias generadas por IA,
 * las guarda en base de datos, y permite gestionarlas (aplicar, descartar, etc.)
 */

import { PrismaClient } from '@prisma/client';
import AIAnalysisService, { AIRecommendation } from './ai-analysis.service';

const prisma = new PrismaClient();

export interface CreateRecommendationInput {
  campaignId?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'budget' | 'targeting' | 'creative' | 'bidding' | 'keywords' | 'schedule' | 'general';
  title: string;
  description: string;
  action: string;
  estimatedImpact?: string;
  aiReasoning?: string;
  aiConfidence?: number;
  expiresInDays?: number;
}

export class RecommendationEngineService {
  private aiAnalysis: AIAnalysisService;

  constructor() {
    this.aiAnalysis = new AIAnalysisService();
  }

  /**
   * Procesa recomendaciones de IA y las guarda en base de datos
   */
  async processAIRecommendations(
    recommendations: AIRecommendation[],
    campaignIds?: string[]
  ): Promise<{ created: number; errors: string[] }> {
    console.log(`📝 Procesando ${recommendations.length} recomendaciones...`);

    let created = 0;
    const errors: string[] = [];

    for (const rec of recommendations) {
      try {
        // Mapear tipo de recomendación
        const type = this.mapPriorityToType(rec.priority);

        // Determinar campaignId si es posible
        let campaignId: string | undefined;
        if (campaignIds && campaignIds.length === 1) {
          campaignId = campaignIds[0];
        }

        await this.createRecommendation({
          campaignId,
          priority: rec.priority,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          action: rec.action,
          estimatedImpact: rec.estimatedImpact,
          aiReasoning: rec.aiReasoning || rec.description,
          aiConfidence: rec.confidence,
          expiresInDays: this.getExpirationDays(rec.priority),
        });

        created++;
      } catch (error) {
        errors.push(`Error creando recomendación "${rec.title}": ${error}`);
        console.error('❌ Error:', error);
      }
    }

    console.log(`✅ ${created} recomendaciones creadas`);
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} errores`);
    }

    return { created, errors };
  }

  /**
   * Crea una nueva recomendación
   */
  async createRecommendation(input: CreateRecommendationInput) {
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const recommendation = await prisma.recommendation.create({
      data: {
        campaignId: input.campaignId,
        type: this.mapPriorityToType(input.priority),
        priority: input.priority,
        category: input.category,
        title: input.title,
        description: input.description,
        action: input.action,
        estimatedImpact: input.estimatedImpact,
        aiReasoning: input.aiReasoning,
        aiConfidence: input.aiConfidence,
        status: 'pending',
        expiresAt,
      },
    });

    console.log(`✅ Recomendación creada: ${recommendation.id}`);
    return recommendation;
  }

  /**
   * Obtiene recomendaciones pendientes
   */
  async getPendingRecommendations(filters?: {
    priority?: 'critical' | 'high' | 'medium' | 'low';
    category?: string;
    campaignId?: string;
    limit?: number;
  }) {
    const where: any = {
      status: 'pending',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (filters?.priority) where.priority = filters.priority;
    if (filters?.category) where.category = filters.category;
    if (filters?.campaignId) where.campaignId = filters.campaignId;

    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // critical primero
        { aiConfidence: 'desc' },
        { createdAt: 'desc' },
      ],
      take: filters?.limit || 50,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return recommendations;
  }

  /**
   * Obtiene una recomendación por ID
   */
  async getRecommendationById(id: string) {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!recommendation) {
      throw new Error(`Recomendación ${id} no encontrada`);
    }

    return recommendation;
  }

  /**
   * Marca una recomendación como aplicada
   */
  async applyRecommendation(
    id: string,
    appliedBy?: string,
    notes?: string
  ) {
    const recommendation = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'applied',
        appliedAt: new Date(),
      },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        action: 'recommendation_applied',
        entity: 'recommendation',
        entityId: id,
        userId: appliedBy,
        details: {
          title: recommendation.title,
          category: recommendation.category,
          priority: recommendation.priority,
          notes,
        },
      },
    });

    console.log(`✅ Recomendación ${id} aplicada`);
    return recommendation;
  }

  /**
   * Marca una recomendación como descartada
   */
  async dismissRecommendation(
    id: string,
    dismissedBy?: string,
    reason?: string
  ) {
    const recommendation = await prisma.recommendation.update({
      where: { id },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
      },
    });

    // Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        action: 'recommendation_dismissed',
        entity: 'recommendation',
        entityId: id,
        userId: dismissedBy,
        details: {
          title: recommendation.title,
          reason,
        },
      },
    });

    console.log(`✅ Recomendación ${id} descartada`);
    return recommendation;
  }

  /**
   * Obtiene estadísticas de recomendaciones
   */
  async getRecommendationStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, pending, applied, dismissed, expired] = await Promise.all([
      prisma.recommendation.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.recommendation.count({
        where: {
          status: 'pending',
          createdAt: { gte: since },
        },
      }),
      prisma.recommendation.count({
        where: {
          status: 'applied',
          appliedAt: { gte: since },
        },
      }),
      prisma.recommendation.count({
        where: {
          status: 'dismissed',
          dismissedAt: { gte: since },
        },
      }),
      prisma.recommendation.count({
        where: {
          status: 'expired',
          createdAt: { gte: since },
        },
      }),
    ]);

    // Por categoría
    const byCategory = await prisma.recommendation.groupBy({
      by: ['category'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    // Por prioridad
    const byPriority = await prisma.recommendation.groupBy({
      by: ['priority'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    // Tasa de aplicación
    const applicationRate = total > 0 ? (applied / total) * 100 : 0;

    return {
      total,
      pending,
      applied,
      dismissed,
      expired,
      applicationRate: applicationRate.toFixed(1),
      byCategory: byCategory.map(c => ({
        category: c.category,
        count: c._count,
      })),
      byPriority: byPriority.map(p => ({
        priority: p.priority,
        count: p._count,
      })),
    };
  }

  /**
   * Genera análisis completo y crea recomendaciones automáticamente
   */
  async generateRecommendationsFromAnalysis(
    campaignIds?: string[],
    dateRange?: { startDate: string; endDate: string }
  ) {
    console.log('🤖 Generando análisis y recomendaciones...');

    // Obtener métricas de campañas
    const campaigns = await this.getCampaignMetrics(campaignIds, dateRange);

    if (campaigns.length === 0) {
      console.log('⚠️ No hay campañas para analizar');
      return { analysis: null, recommendations: [] };
    }

    // Ejecutar análisis de IA
    const analysis = await this.aiAnalysis.analyzeMetrics({
      campaigns,
      dateRange: dateRange || this.getDefaultDateRange(),
    });

    // Procesar y guardar recomendaciones
    const result = await this.processAIRecommendations(
      analysis.recommendations,
      campaignIds
    );

    return {
      analysis,
      recommendations: result,
    };
  }

  /**
   * Limpia recomendaciones expiradas
   */
  async cleanupExpiredRecommendations() {
    console.log('🧹 Limpiando recomendaciones expiradas...');

    const result = await prisma.recommendation.updateMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'expired',
      },
    });

    console.log(`✅ ${result.count} recomendaciones marcadas como expiradas`);
    return result.count;
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Mapea prioridad a tipo de recomendación
   */
  private mapPriorityToType(priority: string): string {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'opportunity';
      case 'medium':
        return 'optimization';
      default:
        return 'alert';
    }
  }

  /**
   * Determina días de expiración según prioridad
   */
  private getExpirationDays(priority: string): number {
    switch (priority) {
      case 'critical':
        return 3;
      case 'high':
        return 7;
      case 'medium':
        return 14;
      case 'low':
        return 30;
      default:
        return 7;
    }
  }

  /**
   * Obtiene métricas de campañas para análisis
   */
  private async getCampaignMetrics(
    campaignIds?: string[],
    dateRange?: { startDate: string; endDate: string }
  ) {
    const range = dateRange || this.getDefaultDateRange();
    const startDate = new Date(range.startDate);
    const endDate = new Date(range.endDate);

    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (campaignIds && campaignIds.length > 0) {
      where.campaignId = { in: campaignIds };
    }

    const metrics = await prisma.campaignMetric.findMany({
      where,
      include: {
        campaign: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Agrupar por campaña
    const campaignMap = new Map<string, any>();

    for (const metric of metrics) {
      const id = metric.campaign.id;
      if (!campaignMap.has(id)) {
        campaignMap.set(id, {
          id,
          name: metric.campaign.name,
          status: metric.campaign.status,
          metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            cost: 0,
            revenue: 0,
            ctr: 0,
            cpc: 0,
            roi: 0,
          },
          count: 0,
        });
      }

      const campaign = campaignMap.get(id);
      campaign.metrics.impressions += metric.impressions;
      campaign.metrics.clicks += metric.clicks;
      campaign.metrics.conversions += metric.conversions;
      campaign.metrics.cost += metric.cost;
      campaign.metrics.revenue += metric.revenue || 0;
      campaign.count++;
    }

    // Calcular promedios y métricas derivadas
    const campaigns = Array.from(campaignMap.values()).map(c => {
      const m = c.metrics;
      m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      m.cpc = m.clicks > 0 ? m.cost / m.clicks : 0;
      m.roi = m.cost > 0 ? ((m.revenue - m.cost) / m.cost) * 100 : 0;
      delete c.count;
      return c;
    });

    return campaigns;
  }

  /**
   * Obtiene rango de fechas por defecto (últimos 7 días)
   */
  private getDefaultDateRange(): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }
}

export default RecommendationEngineService;
