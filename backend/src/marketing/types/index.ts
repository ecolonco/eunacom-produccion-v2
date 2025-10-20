/**
 * Marketing Intelligence System - Type Definitions
 *
 * Este archivo contiene todas las definiciones de tipos TypeScript
 * para el sistema de inteligencia de marketing.
 */

// ==============================================================================
// GOOGLE ADS TYPES
// ==============================================================================

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  averageCpc: number;
  costPerConversion: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  budget?: number;
  biddingStrategy?: string;
  metrics?: GoogleAdsMetrics;
}

export interface GoogleAdsDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ==============================================================================
// GOOGLE ANALYTICS TYPES
// ==============================================================================

export interface GA4Metrics {
  sessions: number;
  users: number;
  newUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversions: number;
  conversionRate: number;
  pagesPerSession: number;
  revenue: number;
}

export interface GA4Dimension {
  name: string;
  value: string;
}

export interface GA4Report {
  dimensions: GA4Dimension[];
  metrics: GA4Metrics;
}

// ==============================================================================
// AI ANALYSIS TYPES
// ==============================================================================

export interface MarketingAIAnalysisRequest {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  period: string;
  campaignData: CampaignAnalysisData[];
  historicalData?: HistoricalMetrics;
}

export interface CampaignAnalysisData {
  campaignId: string;
  campaignName: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    roi: number;
    ctr: number;
    conversionRate: number;
  };
  changes?: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
  };
}

export interface HistoricalMetrics {
  avgROI: number;
  avgCTR: number;
  avgConversionRate: number;
  avgCost: number;
  avgRevenue: number;
}

export interface MarketingAIAnalysisResponse {
  summary: string;
  keyInsights: string[];
  concerns: string[];
  opportunities: string[];
  recommendations: AIRecommendation[];
  metadata: {
    model: string;
    tokensUsed: number;
    latencyMs: number;
  };
}

export interface AIRecommendation {
  type: RecommendationType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact?: string;
  estimatedROI?: number;
}

export type RecommendationType =
  | 'BUDGET_OPTIMIZATION'
  | 'KEYWORD_ADJUSTMENT'
  | 'AD_COPY_IMPROVEMENT'
  | 'TARGETING_REFINEMENT'
  | 'BIDDING_STRATEGY'
  | 'SCHEDULE_OPTIMIZATION'
  | 'CREATIVE_REFRESH'
  | 'LANDING_PAGE'
  | 'OTHER';

// ==============================================================================
// ALERT TYPES
// ==============================================================================

export interface Alert {
  type: AlertType;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  campaignId?: string;
  metric?: string;
  threshold?: number;
  actualValue?: number;
}

export type AlertType =
  | 'BUDGET_OVERRUN'
  | 'LOW_PERFORMANCE'
  | 'HIGH_CPA'
  | 'LOW_CONVERSION_RATE'
  | 'TRAFFIC_DROP'
  | 'COST_SPIKE'
  | 'ANOMALY_DETECTED'
  | 'OPPORTUNITY';

// ==============================================================================
// CHAT TYPES
// ==============================================================================

export interface ChatMessage {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  context?: {
    campaigns?: string[];
    dateRange?: GoogleAdsDateRange;
  };
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  data?: any;
  metadata: {
    model: string;
    tokensUsed: number;
  };
}

// ==============================================================================
// METRICS COLLECTION TYPES
// ==============================================================================

export interface MetricsCollectionJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  results?: {
    campaignsProcessed: number;
    metricsCollected: number;
  };
}

export interface DailyMetrics {
  date: Date;
  campaignMetrics: CampaignDailyMetrics[];
  gaMetrics?: GA4Metrics;
  searchConsoleMetrics?: SearchConsoleMetrics;
}

export interface CampaignDailyMetrics {
  campaignId: string;
  date: Date;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  conversionRate: number;
  conversionValue: number;
  cost: number;
  cpc: number;
  cpa: number;
  revenue: number;
  roi: number;
  roas: number;
  avgTimeOnSite?: number;
  bounceRate?: number;
  pagesPerSession?: number;
}

// ==============================================================================
// SEARCH CONSOLE TYPES
// ==============================================================================

export interface SearchConsoleMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ==============================================================================
// A/B TEST TYPES
// ==============================================================================

export interface ABTestConfig {
  name: string;
  description?: string;
  variantA: Record<string, any>;
  variantB: Record<string, any>;
  trafficSplit: number; // 0.0 - 1.0
  successMetric: 'conversions' | 'ctr' | 'revenue' | 'roi';
}

export interface ABTestResults {
  variantA: {
    impressions: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  };
  variantB: {
    impressions: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  };
  winner?: 'A' | 'B' | 'TIE';
  confidence?: number;
  statisticalSignificance: boolean;
}

// ==============================================================================
// API RESPONSE TYPES
// ==============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==============================================================================
// CONFIGURATION TYPES
// ==============================================================================

export interface MarketingConfig {
  googleAds: {
    developerToken: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    customerId: string;
    loginCustomerId?: string;
  };
  googleAnalytics: {
    propertyId: string;
    serviceAccountKeyPath?: string;
    serviceAccountJson?: string;
  };
  searchConsole: {
    siteUrl: string;
  };
  ai: {
    provider: 'openai' | 'anthropic';
    model: string;
    apiKey: string;
  };
  features: {
    enabled: boolean;
    autoSync: boolean;
    syncIntervalMinutes: number;
    dataRetentionDays: number;
    aiChatMaxMessagesPerDay: number;
  };
}
