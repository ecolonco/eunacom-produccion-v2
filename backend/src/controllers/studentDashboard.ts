import { Request, Response } from 'express';
import { StudentMetricsService } from '../services/studentMetrics';
import {
  getProgressTrendsSchema,
  getUserSpecialtiesSchema,
  userMetricsResponseSchema,
  specialtyProgressResponseSchema,
  progressTrendsResponseSchema,
  studyRecommendationsResponseSchema,
} from '../schemas/dashboard';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
    email: string;
  };
}

export class StudentDashboardController {
  /**
   * GET /api/dashboard/student/metrics
   * Get student metrics (FR-010)
   */
  static async getStudentMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      // Check if admin is trying to access without userId parameter
      if ((userRole === 'ADMIN' || userRole === 'CONTENT_MANAGER') && !req.query.userId) {
        res.status(400).json({
          error: 'Missing parameter',
          message: 'userId parameter required for admin access'
        });
        return;
      }

      // For students, only allow access to their own metrics
      const targetUserId = req.query.userId as string || userId;
      if (userRole === 'STUDENT' && targetUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Students can only access their own metrics'
        });
        return;
      }

      const metrics = await StudentMetricsService.getStudentMetrics(targetUserId);

      // Validate response structure
      const validatedMetrics = userMetricsResponseSchema.parse(metrics);

      res.status(200).json(validatedMetrics);
    } catch (error) {
      logger.error('Error in getStudentMetrics:', error);

      if ((error as any)?.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'User metrics not available'
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch student metrics'
      });
    }
  }

  /**
   * GET /api/dashboard/student/specialties
   * Get student specialty progress (FR-011)
   */
  static async getStudentSpecialties(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      // Validate query parameters
      const validationResult = getUserSpecialtiesSchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid query parameter',
          message: 'includeInactive must be a boolean'
        });
        return;
      }

      const { includeInactive } = validationResult.data;

      // Check admin access
      const targetUserId = req.query.userId as string || userId;
      if (userRole === 'ADMIN' || userRole === 'CONTENT_MANAGER') {
        if (!req.query.userId) {
          res.status(400).json({
            error: 'Missing parameter',
            message: 'userId parameter required for admin access'
          });
          return;
        }
      } else if (userRole === 'STUDENT' && targetUserId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Students can only access their own data'
        });
        return;
      }

      const specialties = await StudentMetricsService.getStudentSpecialties(targetUserId, includeInactive);

      // Validate each specialty in the response
      const validatedSpecialties = specialties.map(specialty =>
        specialtyProgressResponseSchema.parse(specialty)
      );

      res.status(200).json(validatedSpecialties);
    } catch (error) {
      logger.error('Error in getStudentSpecialties:', error);

      if ((error as any)?.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'User specialty data not available'
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch student specialties'
      });
    }
  }

  /**
   * GET /api/dashboard/student/progress-trends
   * Get student progress trends (FR-012)
   */
  static async getProgressTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      // Validate query parameters
      const validationResult = getProgressTrendsSchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid query parameter',
          message: 'period must be one of: week, month, year'
        });
        return;
      }

      const { period } = validationResult.data;

      const trends = await StudentMetricsService.getProgressTrends(userId, period);

      // Validate response structure
      const validatedTrends = progressTrendsResponseSchema.parse(trends);

      res.status(200).json(validatedTrends);
    } catch (error) {
      logger.error('Error in getProgressTrends:', error);

      if ((error as any)?.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'User progress data not available'
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch progress trends'
      });
    }
  }

  /**
   * GET /api/dashboard/student/recommendations
   * Get study recommendations (FR-013)
   */
  static async getStudyRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      const recommendations = await StudentMetricsService.getStudyRecommendations(userId);

      // Validate each recommendation
      const validatedRecommendations = recommendations.map(rec =>
        studyRecommendationsResponseSchema.parse(rec)
      );

      res.status(200).json(validatedRecommendations);
    } catch (error) {
      logger.error('Error in getStudyRecommendations:', error);

      if ((error as any)?.message === 'User not found') {
        res.status(404).json({
          error: 'User not found',
          message: 'User recommendations not available'
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch study recommendations'
      });
    }
  }

  /**
   * POST /api/dashboard/student/recommendations/:id/complete
   * Mark a recommendation as completed
   */
  static async completeRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const recommendationId = req.params.id;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (!recommendationId) {
        res.status(400).json({
          error: 'Missing parameter',
          message: 'Recommendation ID is required'
        });
        return;
      }

      await StudentMetricsService.completeRecommendation(userId, recommendationId);

      res.status(200).json({
        message: 'Recommendation completed successfully'
      });
    } catch (error) {
      logger.error('Error in completeRecommendation:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to complete recommendation'
      });
    }
  }

  /**
   * POST /api/dashboard/student/recommendations/refresh
   * Generate fresh recommendations
   */
  static async refreshRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      const newRecommendations = await StudentMetricsService.refreshRecommendations(userId);

      // Validate each recommendation
      const validatedRecommendations = newRecommendations.map(rec =>
        studyRecommendationsResponseSchema.parse(rec)
      );

      res.status(200).json(validatedRecommendations);
    } catch (error) {
      logger.error('Error in refreshRecommendations:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to refresh recommendations'
      });
    }
  }

  /**
   * PUT /api/dashboard/student/study-time
   * Update study time
   */
  static async updateStudyTime(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { minutes } = req.body;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'No token provided'
        });
        return;
      }

      if (typeof minutes !== 'number' || minutes < 0) {
        res.status(400).json({
          error: 'Invalid parameter',
          message: 'minutes must be a positive number'
        });
        return;
      }

      await StudentMetricsService.updateStudyTime(userId, minutes);

      res.status(200).json({
        message: 'Study time updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateStudyTime:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update study time'
      });
    }
  }
}