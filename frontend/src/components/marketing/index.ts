/**
 * Marketing Intelligence Components
 *
 * Entry point para todos los componentes de marketing intelligence
 */

export { default as MarketingIntelligence } from './MarketingIntelligence';
export { default as MarketingDashboard } from './MarketingDashboard';
export { default as RecommendationsPanel } from './RecommendationsPanel';
export { default as AIChat } from './AIChat';
export { default as AnalysisHistory } from './AnalysisHistory';

// Re-export API service
export { default as marketingAPI } from '../../services/marketing-api.service';
export type {
  DashboardData,
  Recommendation,
  Analysis,
  ChatMessage,
} from '../../services/marketing-api.service';
