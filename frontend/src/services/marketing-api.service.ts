/**
 * Marketing Intelligence API Service
 *
 * Cliente HTTP para comunicarse con el backend de marketing intelligence
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DashboardData {
  summary: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roi: number;
  };
  dailyMetrics: Array<{
    date: string;
    campaignId: string;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    ctr: number;
    roi: number;
  }>;
  period: {
    days: number;
    start: string;
    end: string;
  };
}

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
  estimatedImpact?: string;
  aiConfidence?: number;
  status: string;
  createdAt: string;
  campaign?: {
    id: string;
    name: string;
    status: string;
  };
}

export interface Analysis {
  id: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  summary: string;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>;
  recommendations: Recommendation[];
  predictions?: {
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
  };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

class MarketingAPIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/marketing`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token de autenticación
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboard(days: number = 7): Promise<DashboardData> {
    const response = await this.api.get('/dashboard', {
      params: { days },
    });
    return response.data.data;
  }

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  async getRecommendations(params?: {
    priority?: string;
    category?: string;
    limit?: number;
  }): Promise<Recommendation[]> {
    const response = await this.api.get('/recommendations', { params });
    return response.data.data;
  }

  async getRecommendationById(id: string): Promise<Recommendation> {
    const response = await this.api.get(`/recommendations/${id}`);
    return response.data.data;
  }

  async applyRecommendation(id: string, notes?: string): Promise<Recommendation> {
    const response = await this.api.post(`/recommendations/${id}/apply`, { notes });
    return response.data.data;
  }

  async dismissRecommendation(id: string, reason?: string): Promise<Recommendation> {
    const response = await this.api.post(`/recommendations/${id}/dismiss`, { reason });
    return response.data.data;
  }

  async getRecommendationStats(days: number = 30) {
    const response = await this.api.get('/recommendations/stats', {
      params: { days },
    });
    return response.data.data;
  }

  // ============================================================================
  // ANALYSIS
  // ============================================================================

  async runAnalysis(data?: {
    campaignIds?: string[];
    dateRange?: { startDate: string; endDate: string };
    context?: string;
  }): Promise<Analysis> {
    const response = await this.api.post('/analyze', data || {});
    return response.data.data;
  }

  async getLatestAnalysis(type?: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<Analysis> {
    const response = await this.api.get('/analysis/latest', {
      params: { type },
    });
    return response.data.data;
  }

  async getAnalysisHistory(days: number = 30, type?: string): Promise<Analysis[]> {
    const response = await this.api.get('/analysis/history', {
      params: { days, type },
    });
    return response.data.data;
  }

  // ============================================================================
  // CHAT
  // ============================================================================

  async sendChatMessage(message: string, sessionId: string): Promise<{
    message: string;
    sessionId: string;
    tokensUsed?: number;
  }> {
    const response = await this.api.post('/chat', {
      message,
      sessionId,
    });
    return response.data.data;
  }

  async getChatHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const response = await this.api.get(`/chat/history/${sessionId}`, {
      params: { limit },
    });
    return response.data.data;
  }

  async getChatStats(days: number = 30) {
    const response = await this.api.get('/chat/stats', {
      params: { days },
    });
    return response.data.data;
  }

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  async getCampaigns(params?: {
    status?: string;
    platform?: string;
    limit?: number;
  }) {
    const response = await this.api.get('/campaigns', { params });
    return response.data.data;
  }

  async getCampaignById(id: string, days: number = 30) {
    const response = await this.api.get(`/campaigns/${id}`, {
      params: { days },
    });
    return response.data.data;
  }

  // ============================================================================
  // DATA COLLECTION
  // ============================================================================

  async syncCampaigns() {
    const response = await this.api.post('/sync/campaigns');
    return response.data.data;
  }

  async collectMetrics(date?: string) {
    const response = await this.api.post('/collect/metrics', { date });
    return response.data.data;
  }

  // ============================================================================
  // HEALTH
  // ============================================================================

  async healthCheck() {
    const response = await this.api.get('/health');
    return response.data;
  }
}

// Singleton instance
const marketingAPI = new MarketingAPIService();

export default marketingAPI;
