import { PlatformMetricsModel, PlatformMetricsData, UserActivityData, UsersByRole, AccountStatuses } from '../models/platformMetrics';
import { ContentAnalyticsModel, ContentAnalyticsData } from '../models/contentAnalytics';
import { DashboardCache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { getWebSocketManager } from '../config/websocket';
import { logger } from '../utils/logger';

export interface UserManagementData {
  recentUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  userActivity: UserActivityData[];
  usersByRole: UsersByRole;
  accountStatuses: AccountStatuses;
}

export interface SystemHealthData {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
  };
  uptime: number;
  activeConnections: number;
  redisHealth: boolean;
  databaseHealth: boolean;
}

export class AdminAnalyticsService {
  /**
   * Get platform metrics with caching
   */
  static async getPlatformMetrics(
    period: 'week' | 'month' | 'year' = 'month',
    includeGrowthRate: boolean = true
  ): Promise<PlatformMetricsData> {
    try {
      const cacheKey = `${CACHE_KEYS.ADMIN_PLATFORM_METRICS}:${period}`;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.ADMIN_AGGREGATES,
        async () => {
          return await PlatformMetricsModel.getPlatformMetrics(period);
        }
      );
    } catch (error) {
      logger.error(`Error in getPlatformMetrics for period ${period}:`, error);
      throw error;
    }
  }

  /**
   * Get content analytics with caching
   */
  static async getContentAnalytics(
    specialtyId?: string,
    limit: number = 20,
    sortBy: 'attempts' | 'success_rate' | 'difficulty' | 'popularity' = 'attempts'
  ): Promise<ContentAnalyticsData> {
    try {
      const cacheKey = `${CACHE_KEYS.ADMIN_CONTENT_ANALYTICS}:${specialtyId || 'all'}:${sortBy}`;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.ADMIN_AGGREGATES,
        async () => {
          return await ContentAnalyticsModel.getContentAnalytics(specialtyId, limit, sortBy);
        }
      );
    } catch (error) {
      logger.error('Error in getContentAnalytics:', error);
      throw error;
    }
  }

  /**
   * Get user management data with caching
   */
  static async getUserManagementData(
    role?: 'STUDENT' | 'ADMIN' | 'CONTENT_MANAGER',
    status?: 'active' | 'inactive' | 'suspended',
    limit: number = 20,
    page: number = 1
  ): Promise<UserManagementData> {
    try {
      const cacheKey = `${CACHE_KEYS.ADMIN_USER_MANAGEMENT}:${role || 'all'}:${status || 'all'}:${page}`;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.ADMIN_AGGREGATES,
        async () => {
          return await PlatformMetricsModel.getUserManagementData(role, status, limit, page);
        }
      );
    } catch (error) {
      logger.error('Error in getUserManagementData:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(): Promise<SystemHealthData> {
    try {
      const cacheKey = CACHE_KEYS.ADMIN_SYSTEM_HEALTH;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.SYSTEM_HEALTH,
        async () => {
          const healthData = await PlatformMetricsModel.getSystemHealth();

          // Add WebSocket connection data if available
          const wsManager = getWebSocketManager();
          if (wsManager) {
            const connectedUsers = await wsManager.getConnectedUsersByRole();
            healthData.activeConnections = connectedUsers.total;
          }

          return healthData;
        }
      );
    } catch (error) {
      logger.error('Error in getSystemHealth:', error);
      throw error;
    }
  }

  /**
   * Get questions needing review
   */
  static async getQuestionsNeedingReview(): Promise<Array<{
    questionId: string;
    title: string;
    successRate: number;
    totalAttempts: number;
    feedbackScore?: number;
    issues: string[];
  }>> {
    try {
      const cacheKey = `${CACHE_KEYS.ADMIN_CONTENT_ANALYTICS}:needs-review`;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.ADMIN_AGGREGATES,
        async () => {
          return await ContentAnalyticsModel.getQuestionsNeedingReview();
        }
      );
    } catch (error) {
      logger.error('Error in getQuestionsNeedingReview:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  static async getAnalyticsSummary(): Promise<{
    platform: {
      totalUsers: number;
      activeUsersToday: number;
      questionsAnsweredToday: number;
      avgResponseTime: number;
    };
    content: {
      totalQuestions: number;
      questionsWithAnalytics: number;
      averageSuccessRate: number;
      questionsNeedingReview: number;
    };
    system: {
      uptime: number;
      errorRate: number;
      cacheHitRate: number;
      activeConnections: number;
    };
  }> {
    try {
      const [platformMetrics, contentSummary, systemHealth] = await Promise.all([
        this.getPlatformMetrics('month'),
        ContentAnalyticsModel.getAnalyticsSummary(),
        this.getSystemHealth(),
      ]);

      return {
        platform: {
          totalUsers: platformMetrics.totalUsers,
          activeUsersToday: platformMetrics.activeUsers.daily,
          questionsAnsweredToday: 0, // Would need additional tracking
          avgResponseTime: systemHealth.responseTime.avg,
        },
        content: {
          totalQuestions: contentSummary.totalQuestions,
          questionsWithAnalytics: contentSummary.questionsWithAnalytics,
          averageSuccessRate: contentSummary.averageSuccessRate,
          questionsNeedingReview: contentSummary.questionsNeedingReview,
        },
        system: {
          uptime: systemHealth.uptime,
          errorRate: systemHealth.errorRate,
          cacheHitRate: 85, // Mock data - would come from Redis metrics
          activeConnections: systemHealth.activeConnections,
        },
      };
    } catch (error) {
      logger.error('Error in getAnalyticsSummary:', error);
      throw error;
    }
  }

  /**
   * Record a platform metric and broadcast to admins
   */
  static async recordPlatformMetric(
    metricType: string,
    metricValue: number,
    metadata?: Record<string, any>,
    period?: 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    try {
      await PlatformMetricsModel.recordMetric(metricType, metricValue, metadata, period);

      // Invalidate relevant caches
      await DashboardCache.invalidateAdminCache();

      // Broadcast update to admin users
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastAdminMetricsUpdate({
          type: 'metric_recorded',
          metricType,
          metricValue,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Recorded platform metric: ${metricType} = ${metricValue}`);
    } catch (error) {
      logger.error(`Error recording platform metric ${metricType}:`, error);
      throw error;
    }
  }

  /**
   * Trigger system health check and alert if issues found
   */
  static async performHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: SystemHealthData;
  }> {
    try {
      const healthData = await this.getSystemHealth();
      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check various health indicators
      if (!healthData.databaseHealth) {
        issues.push('Database connection issues detected');
        status = 'critical';
      }

      if (!healthData.redisHealth) {
        issues.push('Redis cache connection issues detected');
        status = status === 'critical' ? 'critical' : 'warning';
      }

      if (healthData.responseTime.avg > 1000) {
        issues.push('High average response time detected');
        status = status === 'critical' ? 'critical' : 'warning';
      }

      if (healthData.errorRate > 5) {
        issues.push('High error rate detected');
        status = status === 'critical' ? 'critical' : 'warning';
      }

      if (healthData.resourceUsage.cpu > 90) {
        issues.push('High CPU usage detected');
        status = status === 'critical' ? 'critical' : 'warning';
      }

      if (healthData.resourceUsage.memory > 90) {
        issues.push('High memory usage detected');
        status = status === 'critical' ? 'critical' : 'warning';
      }

      // Send alerts if issues found
      const wsManager = getWebSocketManager();
      if (wsManager && issues.length > 0) {
        wsManager.broadcastNotificationToAdmins({
          type: status === 'critical' ? 'error' : 'warning',
          title: `System Health Alert - ${status.toUpperCase()}`,
          message: `${issues.length} issue(s) detected: ${issues.join(', ')}`,
          data: { healthData, issues },
        });
      }

      return {
        status,
        issues,
        metrics: healthData,
      };
    } catch (error) {
      logger.error('Error performing health check:', error);
      throw error;
    }
  }

  /**
   * Get historical trends for admin dashboard
   */
  static async getHistoricalTrends(
    metricType: string,
    period: 'daily' | 'weekly' | 'monthly',
    limit: number = 30
  ): Promise<Array<{
    date: string;
    value: number;
    metadata?: any;
  }>> {
    try {
      const cacheKey = `historical:${metricType}:${period}:${limit}`;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.CHART_DATA,
        async () => {
          return await PlatformMetricsModel.getHistoricalMetrics(metricType, period, limit);
        }
      );
    } catch (error) {
      logger.error(`Error getting historical trends for ${metricType}:`, error);
      throw error;
    }
  }

  /**
   * Export analytics data for reporting
   */
  static async exportAnalyticsData(
    startDate: Date,
    endDate: Date,
    includeUserData: boolean = false
  ): Promise<{
    platformMetrics: any[];
    contentAnalytics: any[];
    userData?: any[];
    generatedAt: string;
  }> {
    try {
      // This would generate comprehensive reports
      // Implementation would depend on specific export requirements

      const [platformMetrics, contentAnalytics] = await Promise.all([
        PlatformMetricsModel.getHistoricalMetrics('user_growth', 'daily', 365),
        ContentAnalyticsModel.getAnalyticsSummary(),
      ]);

      const exportData = {
        platformMetrics,
        contentAnalytics: [contentAnalytics],
        generatedAt: new Date().toISOString(),
      };

      // Include user data if requested and user has permission
      if (includeUserData) {
        // Add aggregated user data (be careful with privacy)
        (exportData as any).userData = []; // Would be populated with anonymized data
      }

      logger.info(`Analytics data exported for period ${startDate.toISOString()} - ${endDate.toISOString()}`);
      return exportData;
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  /**
   * Invalidate all admin caches
   */
  static async invalidateAdminCaches(): Promise<void> {
    try {
      await DashboardCache.invalidateAdminCache();
      logger.info('Admin caches invalidated');
    } catch (error) {
      logger.error('Error invalidating admin caches:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic metrics collection
   */
  static async scheduleMetricsCollection(): Promise<void> {
    try {
      // This would typically be called by a cron job or scheduler
      // Record daily metrics
      const platformMetrics = await this.getPlatformMetrics('month');

      await Promise.all([
        this.recordPlatformMetric('daily_users', platformMetrics.activeUsers.daily, {}, 'daily'),
        this.recordPlatformMetric('total_users', platformMetrics.totalUsers, {}, 'daily'),
        this.recordPlatformMetric('user_growth_rate', platformMetrics.userGrowthRate, {}, 'daily'),
      ]);

      // Perform health check
      await this.performHealthCheck();

      logger.info('Scheduled metrics collection completed');
    } catch (error) {
      logger.error('Error in scheduled metrics collection:', error);
      throw error;
    }
  }
}