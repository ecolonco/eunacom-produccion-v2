/**
 * Google Search Console Service
 *
 * Servicio para interactuar con Google Search Console API
 * y obtener datos de búsqueda orgánica.
 *
 * @see https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

import { google } from 'googleapis';
import { getMarketingConfig } from '../utils/config';
import { GoogleAdsDateRange, SearchConsoleMetrics, SearchConsoleQuery } from '../types';
import * as fs from 'fs';

const searchconsole = google.searchconsole('v1');

export class SearchConsoleService {
  private siteUrl: string;
  private auth: any;

  constructor() {
    const config = getMarketingConfig();
    this.siteUrl = config.searchConsole.siteUrl;
    this.auth = this.createAuthClient();
  }

  /**
   * Crea cliente de autenticación con Service Account
   */
  private createAuthClient() {
    const config = getMarketingConfig();

    // Cargar credenciales del service account
    let credentials;
    if (config.googleAnalytics.serviceAccountKeyPath) {
      const keyPath = config.googleAnalytics.serviceAccountKeyPath;
      if (fs.existsSync(keyPath)) {
        credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      }
    } else if (config.googleAnalytics.serviceAccountJson) {
      credentials = JSON.parse(config.googleAnalytics.serviceAccountJson);
    }

    if (!credentials) {
      throw new Error(
        'Search Console service account credentials not found'
      );
    }

    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }

  /**
   * Obtiene métricas generales de Search Console
   *
   * @param dateRange - Rango de fechas
   * @returns Métricas agregadas de búsqueda orgánica
   */
  async getMetrics(dateRange: GoogleAdsDateRange): Promise<SearchConsoleMetrics> {
    try {
      const authClient = await this.auth.getClient();

      const response = await searchconsole.searchanalytics.query({
        auth: authClient,
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: [],
          aggregationType: 'auto',
        },
      });

      const data = response.data.rows?.[0];
      if (!data) {
        return this.getEmptyMetrics();
      }

      return {
        clicks: data.clicks || 0,
        impressions: data.impressions || 0,
        ctr: data.ctr || 0,
        position: data.position || 0,
      };
    } catch (error) {
      console.error('Error fetching Search Console metrics:', error);
      throw new Error(`Failed to fetch Search Console metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene las queries de búsqueda con mejor rendimiento
   *
   * @param dateRange - Rango de fechas
   * @param limit - Número máximo de queries
   */
  async getTopQueries(
    dateRange: GoogleAdsDateRange,
    limit: number = 10
  ): Promise<SearchConsoleQuery[]> {
    try {
      const authClient = await this.auth.getClient();

      const response = await searchconsole.searchanalytics.query({
        auth: authClient,
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: ['query'],
          rowLimit: limit,
          dimensionFilterGroups: [
            {
              filters: [
                {
                  dimension: 'query',
                  operator: 'notContains',
                  expression: 'porn', // Filtrar queries no deseadas
                },
              ],
            },
          ],
        },
      });

      if (!response.data.rows) {
        return [];
      }

      return response.data.rows.map((row: any) => ({
        query: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error) {
      console.error('Error fetching top queries:', error);
      throw new Error(`Failed to fetch top queries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene las páginas con mejor rendimiento en búsqueda
   *
   * @param dateRange - Rango de fechas
   * @param limit - Número máximo de páginas
   */
  async getTopPages(
    dateRange: GoogleAdsDateRange,
    limit: number = 10
  ): Promise<
    Array<{
      page: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    try {
      const authClient = await this.auth.getClient();

      const response = await searchconsole.searchanalytics.query({
        auth: authClient,
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: ['page'],
          rowLimit: limit,
        },
      });

      if (!response.data.rows) {
        return [];
      }

      return response.data.rows.map((row: any) => ({
        page: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error) {
      console.error('Error fetching top pages from Search Console:', error);
      throw new Error(`Failed to fetch top pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas por dispositivo (desktop, mobile, tablet)
   *
   * @param dateRange - Rango de fechas
   */
  async getMetricsByDevice(
    dateRange: GoogleAdsDateRange
  ): Promise<
    Array<{
      device: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    try {
      const authClient = await this.auth.getClient();

      const response = await searchconsole.searchanalytics.query({
        auth: authClient,
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: ['device'],
        },
      });

      if (!response.data.rows) {
        return [];
      }

      return response.data.rows.map((row: any) => ({
        device: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error) {
      console.error('Error fetching metrics by device:', error);
      throw new Error(`Failed to fetch metrics by device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas por país
   *
   * @param dateRange - Rango de fechas
   * @param limit - Número máximo de países
   */
  async getMetricsByCountry(
    dateRange: GoogleAdsDateRange,
    limit: number = 10
  ): Promise<
    Array<{
      country: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    try {
      const authClient = await this.auth.getClient();

      const response = await searchconsole.searchanalytics.query({
        auth: authClient,
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: ['country'],
          rowLimit: limit,
        },
      });

      if (!response.data.rows) {
        return [];
      }

      return response.data.rows.map((row: any) => ({
        country: row.keys?.[0] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (error) {
      console.error('Error fetching metrics by country:', error);
      throw new Error(`Failed to fetch metrics by country: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene métricas diarias para un rango de fechas
   *
   * @param dateRange - Rango de fechas
   */
  async getDailyMetrics(
    dateRange: GoogleAdsDateRange
  ): Promise<Map<string, SearchConsoleMetrics>> {
    try {
      const authClient = await this.auth.getClient();

      const response = await searchconsole.searchanalytics.query({
        auth: authClient,
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: ['date'],
        },
      });

      const metricsMap = new Map<string, SearchConsoleMetrics>();

      if (!response.data.rows) {
        return metricsMap;
      }

      for (const row of response.data.rows) {
        const date = row.keys?.[0] || '';
        metricsMap.set(date, {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        });
      }

      return metricsMap;
    } catch (error) {
      console.error('Error fetching daily Search Console metrics:', error);
      throw new Error(`Failed to fetch daily metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encuentra queries con bajo CTR pero alta posición (oportunidades)
   *
   * @param dateRange - Rango de fechas
   * @param minPosition - Posición mínima (más alta = número menor)
   * @param maxCTR - CTR máximo
   */
  async findLowCTROpportunities(
    dateRange: GoogleAdsDateRange,
    minPosition: number = 5,
    maxCTR: number = 0.02 // 2%
  ): Promise<SearchConsoleQuery[]> {
    try {
      const queries = await this.getTopQueries(dateRange, 100);

      return queries.filter(
        (query) => query.position <= minPosition && query.ctr < maxCTR
      );
    } catch (error) {
      console.error('Error finding low CTR opportunities:', error);
      return [];
    }
  }

  /**
   * Retorna objeto de métricas vacías
   */
  private getEmptyMetrics(): SearchConsoleMetrics {
    return {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };
  }
}

export default SearchConsoleService;
