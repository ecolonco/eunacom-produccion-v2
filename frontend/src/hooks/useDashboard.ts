import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardService } from '../services/dashboardService';
import {
  GetProgressTrendsParams,
  GetSpecialtiesParams,
  GetContentAnalyticsParams,
  GetPlatformMetricsParams,
  GetUserManagementParams,
} from '../types/dashboard';

// Query Keys
export const DASHBOARD_QUERY_KEYS = {
  // Student queries
  studentMetrics: (userId?: string) => ['dashboard', 'student', 'metrics', userId].filter(Boolean),
  specialtyProgress: (userId?: string, params?: GetSpecialtiesParams) =>
    ['dashboard', 'student', 'specialties', userId, params].filter(Boolean),
  studyRecommendations: (userId?: string) =>
    ['dashboard', 'student', 'recommendations', userId].filter(Boolean),
  progressTrends: (userId?: string, params?: GetProgressTrendsParams) =>
    ['dashboard', 'student', 'progress-trends', userId, params].filter(Boolean),

  // Admin queries
  platformMetrics: (params?: GetPlatformMetricsParams) =>
    ['dashboard', 'admin', 'platform-metrics', params].filter(Boolean),
  contentAnalytics: (params?: GetContentAnalyticsParams) =>
    ['dashboard', 'admin', 'content-analytics', params].filter(Boolean),
  userManagement: (params?: GetUserManagementParams) =>
    ['dashboard', 'admin', 'user-management', params].filter(Boolean),
  systemHealth: () => ['dashboard', 'admin', 'system-health'],
} as const;

// Student Dashboard Hooks
export const useStudentMetrics = (userId?: string) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.studentMetrics(userId),
    queryFn: () => DashboardService.student.getStudentMetrics(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSpecialtyProgress = (userId?: string, params?: GetSpecialtiesParams) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.specialtyProgress(userId, params),
    queryFn: () => DashboardService.student.getSpecialtyProgress(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useStudyRecommendations = (userId?: string) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.studyRecommendations(userId),
    queryFn: () => DashboardService.student.getStudyRecommendations(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useProgressTrends = (userId?: string, params?: GetProgressTrendsParams) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.progressTrends(userId, params),
    queryFn: () => DashboardService.student.getProgressTrends(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Student Mutations
export const useGenerateRecommendations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DashboardService.student.generateRecommendations,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DASHBOARD_QUERY_KEYS.studyRecommendations(),
      });
    },
  });
};

export const useCompleteRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DashboardService.student.completeRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DASHBOARD_QUERY_KEYS.studyRecommendations(),
      });
    },
  });
};

// Admin Dashboard Hooks
export const usePlatformMetrics = (params?: GetPlatformMetricsParams) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.platformMetrics(params),
    queryFn: () => DashboardService.admin.getPlatformMetrics(params),
    staleTime: 2 * 60 * 1000, // 2 minutes for admin data
    gcTime: 5 * 60 * 1000,
  });
};

export const useContentAnalytics = (params?: GetContentAnalyticsParams) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.contentAnalytics(params),
    queryFn: () => DashboardService.admin.getContentAnalytics(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useUserManagement = (params?: GetUserManagementParams) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.userManagement(params),
    queryFn: () => DashboardService.admin.getUserManagementData(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useSystemHealth = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.systemHealth(),
    queryFn: DashboardService.admin.getSystemHealth,
    staleTime: 30 * 1000, // 30 seconds for system health
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
};

// Admin hooks for student data
export const useAdminStudentMetrics = (userId: string) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.studentMetrics(userId),
    queryFn: () => DashboardService.admin.getStudentMetrics(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAdminStudentSpecialtyProgress = (userId: string, params?: GetSpecialtiesParams) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.specialtyProgress(userId, params),
    queryFn: () => DashboardService.admin.getStudentSpecialtyProgress(userId, params),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useAdminStudentRecommendations = (userId: string) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.studyRecommendations(userId),
    queryFn: () => DashboardService.admin.getStudentRecommendations(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Admin mutations for student data
export const useAdminGenerateStudentRecommendations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: DashboardService.admin.generateStudentRecommendations,
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: DASHBOARD_QUERY_KEYS.studyRecommendations(userId),
      });
    },
  });
};