/**
 * Google Analytics 4 Service
 *
 * Servicio para interactuar con Google Analytics 4 Data API
 * y obtener métricas de comportamiento del usuario.
 *
 * @see https://developers.google.com/analytics/devguides/reporting/data/v1
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import { getMarketingConfig } from '../utils/config';
import { GA4Metrics, GoogleAdsDateRange } from '../types';
import * as fs from 'fs';

export class GoogleAnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor() {
    const config = getMarketingConfig();
    this.propertyId = config.googleAnalytics.propertyId;

    // Configurar autenticación con Service Account
    const credentials = this.loadServiceAccountCredentials();

    this.analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    });
  }

  /**
   * Carga las credenciales del service account
   */
  private loadServiceAccountCredentials(): any {
    const config = getMarketingConfig();

    // Opción 1: Desde archivo JSON
    if (config.googleAnalytics.serviceAccountKeyPath) {
      const keyPath = config.googleAnalytics.serviceAccountKeyPath;
      if (fs.existsSync(keyPath)) {
        return JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      }
    }

    // Opción 2: Desde variable de entorno JSON
    if (config.googleAnalytics.serviceAccountJson) {
      return JSON.parse(config.googleAnalytics.serviceAccountJson);
    }

    throw new Error(
      'Google Analytics service account credentials not found. ' +
        'Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_JSON'
    );
  }

  /**
   * Obtiene métricas generales de GA4 para un rango de fechas
   *
   * @param dateRange - Rango de fechas
   * @returns Métricas agregadas de comportamiento del usuario
   */
  async getMetrics(dateRange: GoogleAdsDateRange): Promise<GA4Metrics> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'userEngagementDuration' },
          { name: 'bounceRate' },
          { name: 'conversions' },
          { name: 'screenPageViewsPerSession' },
          { name: 'totalRevenue' },
        ],
      });

      const row = response.rows?.[0];
      if (!row || !row.metricValues) {
        return this.getEmptyMetrics();
      }

      const sessions = parseInt(row.metricValues[0].value || '0');
      const totalEngagementDuration = parseFloat(row.metricValues[3].value || '0');

      return {
        sessions,
        users: parseInt(row.metricValues[1].value || '0'),
        newUsers: parseInt(row.metricValues[2].value || '0'),
        averageSessionDuration:
          sessions > 0 ? totalEngagementDuration / sessions : 0,
        bounceRate: parseFloat(row.metricValues[4].value || '0'),
        conversions: parseFloat(row.metricValues[5].value || '0'),
        conversionRate:
          sessions > 0
            ? (parseFloat(row.metricValues[5].value || '0') / sessions) * 100
            : 0,
        pagesPerSession: parseFloat(row.metricValues[6].value || '0'),
        revenue: parseFloat(row.metricValues[7].value || '0'),
      };
    } catch (error) {
      console.error('Error fetching GA4 metrics:', error);
      throw new Error(`Failed to fetch GA4 metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas por fuente de tráfico (campaña, medium, source)
   *
   * @param dateRange - Rango de fechas
   * @returns Métricas segmentadas por fuente
   */
  async getMetricsBySource(
    dateRange: GoogleAdsDateRange
  ): Promise<
    Array<{
      source: string;
      medium: string;
      campaign: string;
      sessions: number;
      conversions: number;
      revenue: number;
    }>
  > {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        ],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'sessionCampaignName' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'conversions' },
          { name: 'totalRevenue' },
        ],
        orderBys: [
          {
            metric: { metricName: 'sessions' },
            desc: true,
          },
        ],
        limit: 100,
      });

      if (!response.rows) {
        return [];
      }

      return response.rows.map((row) => ({
        source: row.dimensionValues?.[0].value || 'unknown',
        medium: row.dimensionValues?.[1].value || 'unknown',
        campaign: row.dimensionValues?.[2].value || 'unknown',
        sessions: parseInt(row.metricValues?.[0].value || '0'),
        conversions: parseFloat(row.metricValues?.[1].value || '0'),
        revenue: parseFloat(row.metricValues?.[2].value || '0'),
      }));
    } catch (error) {
      console.error('Error fetching GA4 metrics by source:', error);
      throw new Error(`Failed to fetch metrics by source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene las páginas más visitadas
   *
   * @param dateRange - Rango de fechas
   * @param limit - Número máximo de páginas
   */
  async getTopPages(
    dateRange: GoogleAdsDateRange,
    limit: number = 10
  ): Promise<
    Array<{
      pagePath: string;
      pageViews: number;
      avgTimeOnPage: number;
      bounceRate: number;
    }>
  > {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        ],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'userEngagementDuration' },
          { name: 'bounceRate' },
        ],
        orderBys: [
          {
            metric: { metricName: 'screenPageViews' },
            desc: true,
          },
        ],
        limit,
      });

      if (!response.rows) {
        return [];
      }

      return response.rows.map((row) => {
        const pageViews = parseInt(row.metricValues?.[0].value || '0');
        const totalEngagement = parseFloat(row.metricValues?.[1].value || '0');

        return {
          pagePath: row.dimensionValues?.[0].value || 'unknown',
          pageViews,
          avgTimeOnPage: pageViews > 0 ? totalEngagement / pageViews : 0,
          bounceRate: parseFloat(row.metricValues?.[2].value || '0'),
        };
      });
    } catch (error) {
      console.error('Error fetching top pages:', error);
      throw new Error(`Failed to fetch top pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene datos de conversiones por evento
   *
   * @param dateRange - Rango de fechas
   */
  async getConversionsByEvent(
    dateRange: GoogleAdsDateRange
  ): Promise<
    Array<{
      eventName: string;
      count: number;
      value: number;
    }>
  > {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        ],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'conversions' }, { name: 'totalRevenue' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'CONTAINS',
              value: 'conversion',
              caseSensitive: false,
            },
          },
        },
        orderBys: [
          {
            metric: { metricName: 'conversions' },
            desc: true,
          },
        ],
      });

      if (!response.rows) {
        return [];
      }

      return response.rows.map((row) => ({
        eventName: row.dimensionValues?.[0].value || 'unknown',
        count: parseFloat(row.metricValues?.[0].value || '0'),
        value: parseFloat(row.metricValues?.[1].value || '0'),
      }));
    } catch (error) {
      console.error('Error fetching conversions by event:', error);
      // No lanzar error si no hay eventos de conversión configurados
      return [];
    }
  }

  /**
   * Obtiene métricas de dispositivos (desktop, mobile, tablet)
   *
   * @param dateRange - Rango de fechas
   */
  async getMetricsByDevice(
    dateRange: GoogleAdsDateRange
  ): Promise<
    Array<{
      deviceCategory: string;
      sessions: number;
      conversions: number;
      conversionRate: number;
    }>
  > {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        ],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        orderBys: [
          {
            metric: { metricName: 'sessions' },
            desc: true,
          },
        ],
      });

      if (!response.rows) {
        return [];
      }

      return response.rows.map((row) => {
        const sessions = parseInt(row.metricValues?.[0].value || '0');
        const conversions = parseFloat(row.metricValues?.[1].value || '0');

        return {
          deviceCategory: row.dimensionValues?.[0].value || 'unknown',
          sessions,
          conversions,
          conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
        };
      });
    } catch (error) {
      console.error('Error fetching metrics by device:', error);
      throw new Error(`Failed to fetch metrics by device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas diarias para un rango de fechas
   *
   * @param dateRange - Rango de fechas
   */
  async getDailyMetrics(
    dateRange: GoogleAdsDateRange
  ): Promise<Map<string, GA4Metrics>> {
    try {
      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
        ],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'userEngagementDuration' },
          { name: 'bounceRate' },
          { name: 'conversions' },
          { name: 'screenPageViewsPerSession' },
          { name: 'totalRevenue' },
        ],
        orderBys: [
          {
            dimension: { dimensionName: 'date' },
            desc: false,
          },
        ],
      });

      const metricsMap = new Map<string, GA4Metrics>();

      if (!response.rows) {
        return metricsMap;
      }

      for (const row of response.rows) {
        const date = row.dimensionValues?.[0].value || '';
        const sessions = parseInt(row.metricValues?.[0].value || '0');
        const totalEngagementDuration = parseFloat(
          row.metricValues?.[3].value || '0'
        );

        // Formatear fecha de YYYYMMDD a YYYY-MM-DD
        const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;

        metricsMap.set(formattedDate, {
          sessions,
          users: parseInt(row.metricValues?.[1].value || '0'),
          newUsers: parseInt(row.metricValues?.[2].value || '0'),
          averageSessionDuration:
            sessions > 0 ? totalEngagementDuration / sessions : 0,
          bounceRate: parseFloat(row.metricValues?.[4].value || '0'),
          conversions: parseFloat(row.metricValues?.[5].value || '0'),
          conversionRate:
            sessions > 0
              ? (parseFloat(row.metricValues?.[5].value || '0') / sessions) *
                100
              : 0,
          pagesPerSession: parseFloat(row.metricValues?.[6].value || '0'),
          revenue: parseFloat(row.metricValues?.[7].value || '0'),
        });
      }

      return metricsMap;
    } catch (error) {
      console.error('Error fetching daily GA4 metrics:', error);
      throw new Error(`Failed to fetch daily metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retorna objeto de métricas vacías
   */
  private getEmptyMetrics(): GA4Metrics {
    return {
      sessions: 0,
      users: 0,
      newUsers: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      conversions: 0,
      conversionRate: 0,
      pagesPerSession: 0,
      revenue: 0,
    };
  }
}

export default GoogleAnalyticsService;
