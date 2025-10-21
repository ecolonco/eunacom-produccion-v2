/**
 * Metrics Collector Service
 *
 * Servicio orquestador que recopila métricas de todas las fuentes
 * (Google Ads, Analytics, Search Console), las combina y almacena
 * en la base de datos.
 */

import { PrismaClient } from '@prisma/client';
import GoogleAdsService from './google-ads.service';
import GoogleAnalyticsService from './google-analytics.service';
import SearchConsoleService from './search-console.service';
import { GoogleAdsDateRange, CampaignDailyMetrics } from '../types';
import { isFeatureEnabled } from '../utils/config';

const prisma = new PrismaClient();

export class MetricsCollectorService {
  private googleAdsService: GoogleAdsService;
  private googleAnalyticsService: GoogleAnalyticsService;
  private searchConsoleService: SearchConsoleService;

  constructor() {
    this.googleAdsService = new GoogleAdsService();
    this.googleAnalyticsService = new GoogleAnalyticsService();
    this.searchConsoleService = new SearchConsoleService();
  }

  /**
   * Sincroniza campañas desde Google Ads a la base de datos
   */
  async syncCampaigns(): Promise<{
    synced: number;
    errors: string[];
  }> {
    if (!isFeatureEnabled('marketing')) {
      throw new Error('Marketing Intelligence está deshabilitado');
    }

    const errors: string[] = [];
    let synced = 0;

    try {
      console.log('[MetricsCollector] Sincronizando campañas desde Google Ads...');
      const adsCampaigns = await this.googleAdsService.getCampaigns();

      for (const campaign of adsCampaigns) {
        try {
          // Crear o actualizar campaña en BD
          await prisma.campaign.upsert({
            where: { externalId: campaign.id },
            update: {
              name: campaign.name,
              status: campaign.status,
              budget: campaign.budget,
            },
            create: {
              externalId: campaign.id,
              name: campaign.name,
              platform: 'GOOGLE_ADS',
              status: campaign.status,
              budget: campaign.budget,
              currency: 'CLP',
            },
          });

          synced++;
        } catch (error) {
          const errorMsg = `Error syncing campaign ${campaign.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`[MetricsCollector] Sincronizadas ${synced} campañas`);
      return { synced, errors };
    } catch (error) {
      console.error('[MetricsCollector] Error en syncCampaigns:', error);
      throw error;
    }
  }

  /**
   * Recopila métricas diarias para todas las campañas
   *
   * @param date - Fecha para la cual recopilar métricas (default: ayer)
   */
  async collectDailyMetrics(date?: Date): Promise<{
    collected: number;
    errors: string[];
  }> {
    if (!isFeatureEnabled('marketing')) {
      throw new Error('Marketing Intelligence está deshabilitado');
    }

    const targetDate = date || this.getYesterday();
    const dateStr = GoogleAdsService.formatDate(targetDate);

    console.log(`[MetricsCollector] Recopilando métricas para ${dateStr}...`);

    const errors: string[] = [];
    let collected = 0;

    try {
      // 1. Obtener todas las campañas activas de la BD
      const campaigns = await prisma.campaign.findMany({
        where: {
          isActive: true,
          platform: 'GOOGLE_ADS',
        },
      });

      if (campaigns.length === 0) {
        console.log('[MetricsCollector] No hay campañas para sincronizar');
        return { collected: 0, errors: [] };
      }

      const campaignIds = campaigns.map((c) => c.externalId);

      // 2. Obtener métricas de Google Ads
      console.log(`[MetricsCollector] Obteniendo métricas de Google Ads...`);
      const adsMetrics = await this.googleAdsService.getDailyMetricsForCampaigns(
        campaignIds,
        { startDate: dateStr, endDate: dateStr }
      );

      // 3. Obtener métricas de Google Analytics
      console.log(`[MetricsCollector] Obteniendo métricas de Google Analytics...`);
      let gaMetrics;
      try {
        const gaDailyMetrics = await this.googleAnalyticsService.getDailyMetrics({
          startDate: dateStr,
          endDate: dateStr,
        });
        gaMetrics = gaDailyMetrics.get(dateStr);
      } catch (error) {
        console.warn('[MetricsCollector] Error obteniendo métricas de GA4:', error);
        errors.push(`GA4: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 4. Procesar y guardar métricas por campaña
      for (const campaign of campaigns) {
        try {
          const campaignAdsMetrics = adsMetrics.get(campaign.externalId);
          const dailyMetrics = campaignAdsMetrics?.get(dateStr);

          if (!dailyMetrics) {
            console.log(`[MetricsCollector] Sin métricas para campaña ${campaign.name} en ${dateStr}`);
            continue;
          }

          // Calcular ROI y ROAS
          const revenue = gaMetrics?.revenue || 0;
          const roi = dailyMetrics.cost > 0
            ? ((revenue - dailyMetrics.cost) / dailyMetrics.cost) * 100
            : 0;
          const roas = dailyMetrics.cost > 0
            ? revenue / dailyMetrics.cost
            : 0;

          // Guardar métricas en BD
          await prisma.campaignMetric.upsert({
            where: {
              campaignId_date: {
                campaignId: campaign.id,
                date: targetDate,
              },
            },
            update: {
              impressions: dailyMetrics.impressions,
              clicks: dailyMetrics.clicks,
              ctr: dailyMetrics.ctr,
              conversions: dailyMetrics.conversions,
              conversionRate: dailyMetrics.conversions / dailyMetrics.clicks * 100,
              conversionValue: dailyMetrics.conversionValue,
              cost: dailyMetrics.cost,
              cpc: dailyMetrics.averageCpc,
              cpa: dailyMetrics.costPerConversion,
              revenue,
              roi,
              roas,
              avgTimeOnSite: gaMetrics?.averageSessionDuration,
              bounceRate: gaMetrics?.bounceRate,
              pagesPerSession: gaMetrics?.pagesPerSession,
            },
            create: {
              campaignId: campaign.id,
              date: targetDate,
              impressions: dailyMetrics.impressions,
              clicks: dailyMetrics.clicks,
              ctr: dailyMetrics.ctr,
              conversions: dailyMetrics.conversions,
              conversionRate: dailyMetrics.conversions / dailyMetrics.clicks * 100,
              conversionValue: dailyMetrics.conversionValue,
              cost: dailyMetrics.cost,
              cpc: dailyMetrics.averageCpc,
              cpa: dailyMetrics.costPerConversion,
              revenue,
              roi,
              roas,
              avgTimeOnSite: gaMetrics?.averageSessionDuration,
              bounceRate: gaMetrics?.bounceRate,
              pagesPerSession: gaMetrics?.pagesPerSession,
            },
          });

          collected++;

          // Detectar anomalías
          await this.detectAnomalies(campaign.id, targetDate);
        } catch (error) {
          const errorMsg = `Error procesando campaña ${campaign.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`[MetricsCollector] Recopiladas ${collected} métricas de campaña`);
      return { collected, errors };
    } catch (error) {
      console.error('[MetricsCollector] Error en collectDailyMetrics:', error);
      throw error;
    }
  }

  /**
   * Detecta anomalías en métricas y genera alertas
   *
   * @param campaignId - ID de la campaña
   * @param date - Fecha de las métricas
   */
  private async detectAnomalies(
    campaignId: string,
    date: Date
  ): Promise<void> {
    try {
      // Obtener métricas del día
      const todayMetrics = await prisma.campaignMetric.findUnique({
        where: {
          campaignId_date: {
            campaignId,
            date,
          },
        },
      });

      if (!todayMetrics) return;

      // Obtener promedio de los últimos 7 días (excluyendo hoy)
      const sevenDaysAgo = new Date(date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const historicalMetrics = await prisma.campaignMetric.aggregate({
        where: {
          campaignId,
          date: {
            gte: sevenDaysAgo,
            lt: date,
          },
        },
        _avg: {
          cost: true,
          conversions: true,
          conversionRate: true,
          cpa: true,
          roi: true,
          ctr: true,
        },
      });

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign || !historicalMetrics._avg) return;

      // Detectar CPA alto (> 150% del promedio)
      if (
        historicalMetrics._avg.cpa &&
        todayMetrics.cpa > historicalMetrics._avg.cpa * 1.5
      ) {
        await this.createAlert({
          campaignId,
          type: 'HIGH_CPA',
          severity: 'WARNING',
          title: `CPA elevado en ${campaign.name}`,
          message: `El CPA de hoy ($${todayMetrics.cpa.toFixed(0)}) es 50% mayor al promedio ($${historicalMetrics._avg.cpa.toFixed(0)})`,
          metric: 'cpa',
          threshold: historicalMetrics._avg.cpa,
          actualValue: todayMetrics.cpa,
        });
      }

      // Detectar baja tasa de conversión (< 50% del promedio)
      if (
        historicalMetrics._avg.conversionRate &&
        historicalMetrics._avg.conversionRate > 0 &&
        todayMetrics.conversionRate < historicalMetrics._avg.conversionRate * 0.5
      ) {
        await this.createAlert({
          campaignId,
          type: 'LOW_CONVERSION_RATE',
          severity: 'WARNING',
          title: `Baja conversión en ${campaign.name}`,
          message: `La tasa de conversión de hoy (${todayMetrics.conversionRate.toFixed(2)}%) es 50% menor al promedio (${historicalMetrics._avg.conversionRate.toFixed(2)}%)`,
          metric: 'conversionRate',
          threshold: historicalMetrics._avg.conversionRate,
          actualValue: todayMetrics.conversionRate,
        });
      }

      // Detectar pico de costo (> 200% del promedio)
      if (
        historicalMetrics._avg.cost &&
        todayMetrics.cost > historicalMetrics._avg.cost * 2
      ) {
        await this.createAlert({
          campaignId,
          type: 'COST_SPIKE',
          severity: 'ERROR',
          title: `Pico de costo en ${campaign.name}`,
          message: `El costo de hoy ($${todayMetrics.cost.toFixed(0)}) duplica el promedio ($${historicalMetrics._avg.cost.toFixed(0)})`,
          metric: 'cost',
          threshold: historicalMetrics._avg.cost,
          actualValue: todayMetrics.cost,
        });
      }

      // Detectar oportunidad de ROI alto
      if (todayMetrics.roi > 200) {
        await this.createAlert({
          campaignId,
          type: 'OPPORTUNITY',
          severity: 'INFO',
          title: `ROI excepcional en ${campaign.name}`,
          message: `El ROI de hoy (${todayMetrics.roi.toFixed(0)}%) es excepcional. Considera aumentar el presupuesto.`,
          metric: 'roi',
          actualValue: todayMetrics.roi,
        });
      }
    } catch (error) {
      console.error('[MetricsCollector] Error detectando anomalías:', error);
    }
  }

  /**
   * Crea una alerta si no existe una similar reciente
   */
  private async createAlert(alert: {
    campaignId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    metric?: string;
    threshold?: number | null;
    actualValue?: number;
  }): Promise<void> {
    // Verificar si ya existe una alerta similar en las últimas 24 horas
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const existing = await prisma.alert.findFirst({
      where: {
        campaignId: alert.campaignId,
        type: alert.type as any,
        createdAt: {
          gte: yesterday,
        },
      },
    });

    if (existing) {
      console.log(`[MetricsCollector] Alerta ya existe: ${alert.title}`);
      return;
    }

    await prisma.alert.create({
      data: {
        campaignId: alert.campaignId,
        type: alert.type as any,
        severity: alert.severity as any,
        title: alert.title,
        message: alert.message,
        metric: alert.metric,
        threshold: alert.threshold,
        actualValue: alert.actualValue,
      },
    });

    console.log(`[MetricsCollector] ⚠️  Alerta creada: ${alert.title}`);
  }

  /**
   * Obtiene la fecha de ayer
   */
  private getYesterday(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  /**
   * Limpia datos antiguos según política de retención
   */
  async cleanupOldData(): Promise<{
    deletedMetrics: number;
    deletedAlerts: number;
  }> {
    const config = await import('../utils/config');
    const retentionDays = config.getMarketingConfig().features.dataRetentionDays;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`[MetricsCollector] Limpiando datos anteriores a ${cutoffDate.toISOString()}`);

    const deletedMetrics = await prisma.campaignMetric.deleteMany({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    });

    const deletedAlerts = await prisma.alert.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isResolved: true,
      },
    });

    console.log(`[MetricsCollector] Eliminadas ${deletedMetrics.count} métricas y ${deletedAlerts.count} alertas`);

    return {
      deletedMetrics: deletedMetrics.count,
      deletedAlerts: deletedAlerts.count,
    };
  }
}

export default MetricsCollectorService;
