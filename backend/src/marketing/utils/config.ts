/**
 * Marketing Intelligence System - Configuration
 *
 * Este archivo centraliza toda la configuración del sistema de marketing,
 * leyendo variables de entorno y proporcionando valores por defecto.
 */

import { MarketingConfig } from '../types';

/**
 * Obtiene la configuración del sistema de marketing desde variables de entorno
 */
export function getMarketingConfig(): MarketingConfig {
  return {
    googleAds: {
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
      loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    },
    googleAnalytics: {
      propertyId: process.env.GA4_PROPERTY_ID || '',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    },
    searchConsole: {
      siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || '',
    },
    ai: {
      provider: (process.env.AI_ANALYSIS_PROVIDER as 'openai' | 'anthropic') || 'openai',
      model:
        process.env.AI_ANALYSIS_PROVIDER === 'anthropic'
          ? process.env.AI_ANALYSIS_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
          : process.env.AI_ANALYSIS_OPENAI_MODEL || 'gpt-4-turbo-preview',
      apiKey:
        process.env.AI_ANALYSIS_PROVIDER === 'anthropic'
          ? process.env.ANTHROPIC_API_KEY || ''
          : process.env.OPENAI_API_KEY || '',
    },
    features: {
      enabled: process.env.MARKETING_INTELLIGENCE_ENABLED === 'true',
      autoSync: process.env.ENABLE_CRON_JOBS === 'true',
      syncIntervalMinutes: parseInt(
        process.env.MARKETING_DATA_SYNC_INTERVAL_MINUTES || '60',
        10
      ),
      dataRetentionDays: parseInt(process.env.MARKETING_DATA_RETENTION_DAYS || '90', 10),
      aiChatMaxMessagesPerDay: parseInt(
        process.env.AI_CHAT_MAX_MESSAGES_PER_DAY || '50',
        10
      ),
    },
  };
}

/**
 * Valida que todas las configuraciones requeridas estén presentes
 */
export function validateMarketingConfig(): {
  valid: boolean;
  errors: string[];
} {
  const config = getMarketingConfig();
  const errors: string[] = [];

  // Validar si el sistema está habilitado
  if (!config.features.enabled) {
    return {
      valid: true,
      errors: ['Marketing Intelligence está deshabilitado. Configura MARKETING_INTELLIGENCE_ENABLED=true para habilitarlo.'],
    };
  }

  // Validar Google Ads
  if (!config.googleAds.developerToken) {
    errors.push('GOOGLE_ADS_DEVELOPER_TOKEN no está configurado');
  }
  if (!config.googleAds.clientId) {
    errors.push('GOOGLE_ADS_CLIENT_ID no está configurado');
  }
  if (!config.googleAds.clientSecret) {
    errors.push('GOOGLE_ADS_CLIENT_SECRET no está configurado');
  }
  if (!config.googleAds.refreshToken) {
    errors.push('GOOGLE_ADS_REFRESH_TOKEN no está configurado');
  }
  if (!config.googleAds.customerId) {
    errors.push('GOOGLE_ADS_CUSTOMER_ID no está configurado');
  }

  // Validar Google Analytics
  if (!config.googleAnalytics.propertyId) {
    errors.push('GA4_PROPERTY_ID no está configurado');
  }
  if (!config.googleAnalytics.serviceAccountKeyPath && !config.googleAnalytics.serviceAccountJson) {
    errors.push(
      'Se requiere GOOGLE_SERVICE_ACCOUNT_KEY_PATH o GOOGLE_SERVICE_ACCOUNT_JSON'
    );
  }

  // Validar AI
  if (!config.ai.apiKey) {
    if (config.ai.provider === 'anthropic') {
      errors.push('ANTHROPIC_API_KEY no está configurado');
    } else {
      errors.push('OPENAI_API_KEY no está configurado');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Obtiene la configuración de cron jobs
 */
export function getCronConfig() {
  return {
    enabled: process.env.ENABLE_CRON_JOBS === 'true',
    collectMetrics: process.env.CRON_COLLECT_METRICS || '0 * * * *', // Cada hora
    dailyAnalysis: process.env.CRON_DAILY_AI_ANALYSIS || '0 8 * * *', // 8 AM diario
    weeklyAnalysis: process.env.CRON_WEEKLY_AI_ANALYSIS || '0 9 * * 1', // Lunes 9 AM
  };
}

/**
 * Formatea el Customer ID de Google Ads (remueve guiones)
 */
export function formatCustomerId(customerId: string): string {
  return customerId.replace(/-/g, '');
}

/**
 * Verifica si una feature específica está habilitada
 */
export function isFeatureEnabled(feature: 'marketing' | 'cron' | 'aiChat'): boolean {
  const config = getMarketingConfig();

  switch (feature) {
    case 'marketing':
      return config.features.enabled;
    case 'cron':
      return config.features.autoSync;
    case 'aiChat':
      return config.features.enabled && !!config.ai.apiKey;
    default:
      return false;
  }
}

export default {
  getMarketingConfig,
  validateMarketingConfig,
  getCronConfig,
  formatCustomerId,
  isFeatureEnabled,
};
