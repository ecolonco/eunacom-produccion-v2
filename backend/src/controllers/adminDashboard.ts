import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AdminAnalyticsService } from '../services/adminAnalytics';
import {
  getPlatformMetricsSchema,
  getContentAnalyticsSchema,
  getUserManagementSchema,
  platformMetricsResponseSchema,
  contentAnalyticsResponseSchema,
  userManagementResponseSchema,
  systemHealthResponseSchema,
} from '../schemas/dashboard';
import { logger } from '../utils/logger';

export class AdminDashboardController {
  /**
   * GET /api/dashboard/admin/platform-metrics
   * Get platform metrics (FR-004)
   */
  static async getPlatformMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      // Validate query parameters
      const validationResult = getPlatformMetricsSchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid query parameter',
          message: 'period must be one of: week, month, year'
        });
        return;
      }

      const { period, includeGrowthRate } = validationResult.data;

      const metrics = await AdminAnalyticsService.getPlatformMetrics(period, includeGrowthRate);

      // Validate response structure
      const validatedMetrics = platformMetricsResponseSchema.parse(metrics);

      res.status(200).json(validatedMetrics);
    } catch (error) {
      logger.error('Error in getPlatformMetrics:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch platform metrics'
      });
    }
  }

  /**
   * GET /api/dashboard/admin/content-analytics
   * Get content analytics (FR-005)
   */
  static async getContentAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      // Validate query parameters
      const validationResult = getContentAnalyticsSchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid query parameter',
          message: 'Invalid parameters provided'
        });
        return;
      }

      const { specialtyId, limit, sortBy } = validationResult.data;

      const analytics = await AdminAnalyticsService.getContentAnalytics(specialtyId, limit, sortBy);

      // Validate response structure
      const validatedAnalytics = contentAnalyticsResponseSchema.parse(analytics);

      res.status(200).json(validatedAnalytics);
    } catch (error) {
      logger.error('Error in getContentAnalytics:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch content analytics'
      });
    }
  }

  /**
   * GET /api/dashboard/admin/user-management
   * Get user management data (FR-006)
   */
  static async getUserManagement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      // Validate query parameters
      const validationResult = getUserManagementSchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid query parameter',
          message: 'Invalid parameters provided'
        });
        return;
      }

      const { role, status, limit, page } = validationResult.data;

      const managementData = await AdminAnalyticsService.getUserManagementData(role, status, limit, page);

      // Validate response structure
      const validatedData = userManagementResponseSchema.parse(managementData);

      res.status(200).json(validatedData);
    } catch (error) {
      logger.error('Error in getUserManagement:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch user management data'
      });
    }
  }

  /**
   * GET /api/dashboard/admin/system-health
   * Get system health metrics (FR-007)
   */
  static async getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      const healthData = await AdminAnalyticsService.getSystemHealth();

      // Validate response structure
      const validatedHealth = systemHealthResponseSchema.parse(healthData);

      res.status(200).json(validatedHealth);
    } catch (error) {
      logger.error('Error in getSystemHealth:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch system health'
      });
    }
  }

  /**
   * GET /api/dashboard/admin/analytics-summary
   * Get comprehensive analytics summary
   */
  static async getAnalyticsSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      const summary = await AdminAnalyticsService.getAnalyticsSummary();

      res.status(200).json(summary);
    } catch (error) {
      logger.error('Error in getAnalyticsSummary:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch analytics summary'
      });
    }
  }

  /**
   * GET /api/dashboard/admin/questions-review
   * Get questions needing review
   */
  static async getQuestionsNeedingReview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      const questionsNeedingReview = await AdminAnalyticsService.getQuestionsNeedingReview();

      res.status(200).json(questionsNeedingReview);
    } catch (error) {
      logger.error('Error in getQuestionsNeedingReview:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch questions needing review'
      });
    }
  }

  /**
   * GET /api/dashboard/admin/historical-trends/:metricType
   * Get historical trends for a specific metric
   */
  static async getHistoricalTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;
      const metricType = req.params.metricType;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN' && userRole !== 'CONTENT_MANAGER') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      if (!metricType) {
        res.status(400).json({
          error: 'Missing parameter',
          message: 'Metric type is required'
        });
        return;
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
      const limit = parseInt(req.query.limit as string) || 30;

      const trends = await AdminAnalyticsService.getHistoricalTrends(metricType, period, limit);

      res.status(200).json(trends);
    } catch (error) {
      logger.error('Error in getHistoricalTrends:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch historical trends'
      });
    }
  }

  /**
   * POST /api/dashboard/admin/health-check
   * Perform system health check
   */
  static async performHealthCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      const healthCheck = await AdminAnalyticsService.performHealthCheck();

      res.status(200).json(healthCheck);
    } catch (error) {
      logger.error('Error in performHealthCheck:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to perform health check'
      });
    }
  }

  /**
   * POST /api/dashboard/admin/export-data
   * Export analytics data
   */
  static async exportAnalyticsData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      const { startDate, endDate, includeUserData } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const exportData = await AdminAnalyticsService.exportAnalyticsData(
        new Date(startDate),
        new Date(endDate),
        includeUserData || false
      );

      res.status(200).json(exportData);
    } catch (error) {
      logger.error('Error in exportAnalyticsData:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to export analytics data'
      });
    }
  }

  /**
   * DELETE /api/dashboard/admin/cache
   * Invalidate admin caches
   */
  static async invalidateCaches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Check authorization
      if (!req.user?.userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (userRole !== 'ADMIN') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
        return;
      }

      await AdminAnalyticsService.invalidateAdminCaches();

      res.status(200).json({
        message: 'Admin caches invalidated successfully'
      });
    } catch (error) {
      logger.error('Error in invalidateCaches:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to invalidate caches'
      });
    }
  }
}