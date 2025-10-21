import { apiRequest } from './api';
import {
  UserMetrics,
  SpecialtyProgress,
  StudyRecommendation,
  ProgressTrends,
  PlatformMetrics,
  ContentAnalytics,
  UserManagementData,
  SystemHealth,
  GetProgressTrendsParams,
  GetSpecialtiesParams,
  GetContentAnalyticsParams,
  GetPlatformMetricsParams,
  GetUserManagementParams,
} from '../types/dashboard';

// Student Dashboard API Service
export class StudentDashboardService {

  /**
   * Get student metrics
   */
  static async getStudentMetrics(userId?: string): Promise<UserMetrics> {
    const url = userId
      ? `/api/dashboard/student/metrics?userId=${userId}`
      : '/api/dashboard/student/metrics';

    return apiRequest<UserMetrics>('GET', url);
  }

  /**
   * Get student specialty progress
   */
  static async getSpecialtyProgress(params?: GetSpecialtiesParams): Promise<SpecialtyProgress[]> {
    return apiRequest<SpecialtyProgress[]>('GET', '/api/dashboard/student/specialties', null, params);
  }

  /**
   * Get study recommendations
   */
  static async getStudyRecommendations(): Promise<StudyRecommendation[]> {
    return apiRequest<StudyRecommendation[]>('GET', '/api/dashboard/student/recommendations');
  }

  /**
   * Get progress trends
   */
  static async getProgressTrends(params?: GetProgressTrendsParams): Promise<ProgressTrends> {
    return apiRequest<ProgressTrends>('GET', '/api/dashboard/student/progress-trends', null, params);
  }

  /**
   * Generate new recommendations
   */
  static async generateRecommendations(): Promise<StudyRecommendation[]> {
    return apiRequest<StudyRecommendation[]>('POST', '/api/dashboard/student/recommendations/generate');
  }

  /**
   * Complete a recommendation
   */
  static async completeRecommendation(recommendationId: string): Promise<void> {
    return apiRequest<void>('POST', `/api/dashboard/student/recommendations/${recommendationId}/complete`);
  }
}

// Admin Dashboard API Service
export class AdminDashboardService {

  /**
   * Get platform metrics
   */
  static async getPlatformMetrics(params?: GetPlatformMetricsParams): Promise<PlatformMetrics> {
    return apiRequest<PlatformMetrics>('GET', '/api/dashboard/admin/platform-metrics', null, params);
  }

  /**
   * Get content analytics
   */
  static async getContentAnalytics(params?: GetContentAnalyticsParams): Promise<ContentAnalytics> {
    return apiRequest<ContentAnalytics>('GET', '/api/dashboard/admin/content-analytics', null, params);
  }

  /**
   * Get user management data
   */
  static async getUserManagementData(params?: GetUserManagementParams): Promise<UserManagementData> {
    return apiRequest<UserManagementData>('GET', '/api/dashboard/admin/user-management', null, params);
  }

  /**
   * Get system health
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    return apiRequest<SystemHealth>('GET', '/api/dashboard/admin/system-health');
  }

  /**
   * Get a student's metrics (admin only)
   */
  static async getStudentMetrics(userId: string): Promise<UserMetrics> {
    return apiRequest<UserMetrics>('GET', `/api/dashboard/student/metrics?userId=${userId}`);
  }

  /**
   * Get student specialty progress (admin only)
   */
  static async getStudentSpecialtyProgress(userId: string, params?: GetSpecialtiesParams): Promise<SpecialtyProgress[]> {
    return apiRequest<SpecialtyProgress[]>('GET', `/api/dashboard/student/specialties?userId=${userId}`, null, params);
  }

  /**
   * Get student recommendations (admin only)
   */
  static async getStudentRecommendations(userId: string): Promise<StudyRecommendation[]> {
    return apiRequest<StudyRecommendation[]>('GET', `/api/dashboard/student/recommendations?userId=${userId}`);
  }

  /**
   * Generate recommendations for a student (admin only)
   */
  static async generateStudentRecommendations(userId: string): Promise<StudyRecommendation[]> {
    return apiRequest<StudyRecommendation[]>('POST', `/api/dashboard/student/recommendations/generate?userId=${userId}`);
  }
}

// Combined service class for convenience
export class DashboardService {
  static student = StudentDashboardService;
  static admin = AdminDashboardService;
}

export default DashboardService;