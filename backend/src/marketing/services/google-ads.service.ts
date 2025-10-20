/**
 * Google Ads Service
 *
 * Servicio para interactuar con Google Ads API y obtener métricas
 * de campañas publicitarias.
 *
 * @see https://developers.google.com/google-ads/api/docs/start
 */

import { GoogleAdsApi, Customer, enums } from 'google-ads-api';
import { getMarketingConfig, formatCustomerId } from '../utils/config';
import {
  GoogleAdsCampaign,
  GoogleAdsMetrics,
  GoogleAdsDateRange,
} from '../types';

export class GoogleAdsService {
  private client: GoogleAdsApi;
  private customerId: string;

  constructor() {
    const config = getMarketingConfig();

    // Inicializar cliente de Google Ads
    this.client = new GoogleAdsApi({
      client_id: config.googleAds.clientId,
      client_secret: config.googleAds.clientSecret,
      developer_token: config.googleAds.developerToken,
    });

    // Formatear customer ID (remover guiones)
    this.customerId = formatCustomerId(config.googleAds.customerId);
  }

  /**
   * Obtiene una instancia del cliente de Google Ads autenticado
   */
  private async getCustomer(): Promise<Customer> {
    const config = getMarketingConfig();

    return this.client.Customer({
      customer_id: this.customerId,
      refresh_token: config.googleAds.refreshToken,
      login_customer_id: config.googleAds.loginCustomerId
        ? formatCustomerId(config.googleAds.loginCustomerId)
        : undefined,
    });
  }

  /**
   * Obtiene todas las campañas activas
   *
   * @returns Lista de campañas con información básica
   */
  async getCampaigns(): Promise<GoogleAdsCampaign[]> {
    try {
      const customer = await this.getCustomer();

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        ORDER BY campaign.name
      `;

      const campaigns = await customer.query(query);

      return campaigns.map((row: any) => ({
        id: row.campaign.id.toString(),
        name: row.campaign.name,
        status: this.mapCampaignStatus(row.campaign.status),
        budget: row.campaign_budget
          ? row.campaign_budget.amount_micros / 1000000
          : undefined,
        biddingStrategy: String(row.campaign.advertising_channel_type || 'UNKNOWN'),
      }));
    } catch (error) {
      console.error('Error fetching campaigns from Google Ads:', error);
      throw new Error(`Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene una campaña específica por ID
   *
   * @param campaignId - ID de la campaña en Google Ads
   */
  async getCampaignById(campaignId: string): Promise<GoogleAdsCampaign | null> {
    try {
      const customer = await this.getCustomer();

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `;

      const campaigns = await customer.query(query);

      if (campaigns.length === 0) {
        return null;
      }

      const row = campaigns[0];
      return {
        id: row.campaign.id.toString(),
        name: row.campaign.name,
        status: this.mapCampaignStatus(String(row.campaign.status)),
        budget: row.campaign_budget
          ? row.campaign_budget.amount_micros / 1000000
          : undefined,
        biddingStrategy: String(row.campaign.advertising_channel_type || 'UNKNOWN'),
      };
    } catch (error) {
      console.error(`Error fetching campaign ${campaignId}:`, error);
      throw new Error(`Failed to fetch campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas de una campaña para un rango de fechas
   *
   * @param campaignId - ID de la campaña
   * @param dateRange - Rango de fechas (YYYY-MM-DD)
   * @returns Métricas agregadas de la campaña
   */
  async getCampaignMetrics(
    campaignId: string,
    dateRange: GoogleAdsDateRange
  ): Promise<GoogleAdsMetrics> {
    try {
      const customer = await this.getCustomer();

      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion
        FROM campaign
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
      `;

      const results = await customer.query(query);

      // Agregar métricas (sumar todos los días)
      const aggregated = results.reduce(
        (acc: any, row: any) => ({
          impressions: acc.impressions + (row.metrics.impressions || 0),
          clicks: acc.clicks + (row.metrics.clicks || 0),
          cost: acc.cost + (row.metrics.cost_micros || 0),
          conversions: acc.conversions + (row.metrics.conversions || 0),
          conversionValue:
            acc.conversionValue + (row.metrics.conversions_value || 0),
        }),
        {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionValue: 0,
        }
      );

      // Convertir micros a valores reales
      const cost = aggregated.cost / 1000000;

      // Calcular métricas derivadas
      const ctr = aggregated.impressions > 0
        ? (aggregated.clicks / aggregated.impressions) * 100
        : 0;

      const averageCpc = aggregated.clicks > 0
        ? cost / aggregated.clicks
        : 0;

      const costPerConversion = aggregated.conversions > 0
        ? cost / aggregated.conversions
        : 0;

      return {
        impressions: aggregated.impressions,
        clicks: aggregated.clicks,
        cost,
        conversions: aggregated.conversions,
        conversionValue: aggregated.conversionValue,
        ctr,
        averageCpc,
        costPerConversion,
      };
    } catch (error) {
      console.error(`Error fetching metrics for campaign ${campaignId}:`, error);
      throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas diarias para múltiples campañas
   *
   * @param campaignIds - Array de IDs de campañas
   * @param dateRange - Rango de fechas
   * @returns Métricas diarias por campaña
   */
  async getDailyMetricsForCampaigns(
    campaignIds: string[],
    dateRange: GoogleAdsDateRange
  ): Promise<Map<string, Map<string, GoogleAdsMetrics>>> {
    try {
      const customer = await this.getCustomer();

      const campaignFilter =
        campaignIds.length > 0
          ? `AND campaign.id IN (${campaignIds.join(',')})`
          : '';

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion
        FROM campaign
        WHERE campaign.status != 'REMOVED'
          AND segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
          ${campaignFilter}
        ORDER BY campaign.id, segments.date
      `;

      const results = await customer.query(query);

      // Organizar resultados por campaignId y fecha
      const metricsMap = new Map<string, Map<string, GoogleAdsMetrics>>();

      for (const row of results) {
        const campaignId = row.campaign.id.toString();
        const date = row.segments.date;
        const cost = (row.metrics.cost_micros || 0) / 1000000;

        if (!metricsMap.has(campaignId)) {
          metricsMap.set(campaignId, new Map());
        }

        const campaignMetrics = metricsMap.get(campaignId)!;
        campaignMetrics.set(date, {
          impressions: row.metrics.impressions || 0,
          clicks: row.metrics.clicks || 0,
          cost,
          conversions: row.metrics.conversions || 0,
          conversionValue: row.metrics.conversions_value || 0,
          ctr: row.metrics.ctr || 0,
          averageCpc: (row.metrics.average_cpc || 0) / 1000000,
          costPerConversion: row.metrics.cost_per_conversion
            ? row.metrics.cost_per_conversion / 1000000
            : 0,
        });
      }

      return metricsMap;
    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      throw new Error(`Failed to fetch daily metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene keywords de búsqueda con mejor rendimiento
   *
   * @param campaignId - ID de la campaña
   * @param dateRange - Rango de fechas
   * @param limit - Número máximo de keywords a retornar
   */
  async getTopKeywords(
    campaignId: string,
    dateRange: GoogleAdsDateRange,
    limit: number = 10
  ): Promise<
    Array<{
      keyword: string;
      impressions: number;
      clicks: number;
      conversions: number;
      cost: number;
    }>
  > {
    try {
      const customer = await this.getCustomer();

      const query = `
        SELECT
          ad_group_criterion.keyword.text,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros
        FROM keyword_view
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
          AND ad_group_criterion.status = 'ENABLED'
        ORDER BY metrics.conversions DESC
        LIMIT ${limit}
      `;

      const results = await customer.query(query);

      return results.map((row: any) => ({
        keyword: row.ad_group_criterion.keyword.text,
        impressions: row.metrics.impressions || 0,
        clicks: row.metrics.clicks || 0,
        conversions: row.metrics.conversions || 0,
        cost: (row.metrics.cost_micros || 0) / 1000000,
      }));
    } catch (error) {
      console.error('Error fetching top keywords:', error);
      // No lanzar error si no hay keywords (puede ser campaña de display)
      return [];
    }
  }

  /**
   * Mapea el estado de campaña de Google Ads a nuestro enum
   */
  private mapCampaignStatus(
    status: string
  ): 'ACTIVE' | 'PAUSED' | 'ENDED' {
    switch (status) {
      case 'ENABLED':
        return 'ACTIVE';
      case 'PAUSED':
        return 'PAUSED';
      case 'REMOVED':
        return 'ENDED';
      default:
        return 'PAUSED';
    }
  }

  /**
   * Obtiene el rango de fechas para "últimos N días"
   */
  static getDateRangeForLastDays(days: number): GoogleAdsDateRange {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  /**
   * Formatea fecha a formato requerido por Google Ads (YYYY-MM-DD)
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export default GoogleAdsService;
