/**
 * Marketing Intelligence System - Entry Point
 *
 * Punto de entrada principal del módulo de marketing intelligence.
 * Exporta todos los servicios, controladores, rutas y utilidades.
 */

// ============================================================================
// SERVICES
// ============================================================================

export { default as AIAnalysisService } from './services/ai-analysis.service';
export { default as RecommendationEngineService } from './services/recommendation-engine.service';
export { default as AIChatService } from './services/ai-chat.service';
export { default as MetricsCollectorService } from './services/metrics-collector.service';
export { default as GoogleAdsService } from './services/google-ads.service';
export { default as GoogleAnalyticsService } from './services/google-analytics.service';
export { default as SearchConsoleService } from './services/search-console.service';

// ============================================================================
// CONTROLLERS
// ============================================================================

export { default as MarketingController } from './controllers/marketing.controller';

// ============================================================================
// ROUTES
// ============================================================================

export { default as marketingRoutes } from './routes/marketing.routes';

// ============================================================================
// JOBS
// ============================================================================

export {
  startMarketingJobs,
  runJobManually,
  stopMarketingJobs,
} from './jobs/marketing-jobs';

// ============================================================================
// UTILS & CONFIG
// ============================================================================

export {
  getMarketingConfig,
  validateMarketingConfig,
  getCronConfig,
  isFeatureEnabled,
} from './utils/config';

// ============================================================================
// TYPES
// ============================================================================

export type {
  GoogleAdsMetrics,
  GoogleAdsCampaign,
  GoogleAdsDateRange,
  GA4Metrics,
  MarketingAIAnalysisRequest,
  CampaignAnalysisData,
  MarketingConfig,
} from './types';

// ============================================================================
// RE-EXPORTS FROM SERVICES
// ============================================================================

export type {
  AIAnalysisInput,
  AIInsight,
  AIRecommendation,
  AIAnalysisResult,
} from './services/ai-analysis.service';

export type {
  CreateRecommendationInput,
} from './services/recommendation-engine.service';

export type {
  ChatMessage,
  ChatContext,
  ChatResponse,
} from './services/ai-chat.service';
