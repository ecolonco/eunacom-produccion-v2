import { UserMetricsModel, UserMetricsData } from '../models/userMetrics';
import { SpecialtyProgressModel, SpecialtyProgressData } from '../models/specialtyProgress';
import { StudyRecommendationModel, StudyRecommendationData } from '../models/studyRecommendations';
import { DashboardCache, CACHE_KEYS, CACHE_TTL } from '../config/redis';
import { getWebSocketManager } from '../config/websocket';
import { logger } from '../utils/logger';

export interface ProgressTrendsData {
  scoresTrend: Array<{
    date: string;
    score: number;
  }>;
  timeSpentTrend: Array<{
    date: string;
    minutes: number;
  }>;
  strengthsWeaknesses: {
    strengths: Array<{
      specialty: string;
      score: number;
    }>;
    weaknesses: Array<{
      specialty: string;
      score: number;
    }>;
  };
}

export class StudentMetricsService {
  /**
   * Get comprehensive student metrics with caching
   */
  static async getStudentMetrics(userId: string): Promise<UserMetricsData> {
    try {
      const cacheKey = CACHE_KEYS.USER_METRICS(userId);

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.USER_METRICS,
        async () => {
          const metrics = await UserMetricsModel.getUserMetrics(userId);
          if (!metrics) {
            throw new Error('User not found');
          }
          return metrics;
        }
      );
    } catch (error) {
      logger.error(`Error in getStudentMetrics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get student specialty progress with caching
   */
  static async getStudentSpecialties(
    userId: string,
    includeInactive: boolean = false
  ): Promise<SpecialtyProgressData[]> {
    try {
      const cacheKey = CACHE_KEYS.USER_SPECIALTIES(userId);

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.USER_METRICS,
        async () => {
          return await SpecialtyProgressModel.getUserSpecialtyProgress(userId, includeInactive);
        }
      );
    } catch (error) {
      logger.error(`Error in getStudentSpecialties for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get student progress trends
   */
  static async getProgressTrends(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<ProgressTrendsData> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_PROGRESS(userId)}:${period}`;

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.CHART_DATA,
        async () => {
          const [metrics, specialties] = await Promise.all([
            UserMetricsModel.getUserMetrics(userId),
            SpecialtyProgressModel.getUserSpecialtyProgress(userId),
          ]);

          if (!metrics) {
            throw new Error('User not found');
          }

          // Generate scores trend from weekly progress
          const scoresTrend = this.generateScoresTrend(metrics.weeklyProgress || [], period);

          // Generate time spent trend
          const timeSpentTrend = this.generateTimeSpentTrend(metrics.weeklyProgress || [], period);

          // Identify strengths and weaknesses
          const strengthsWeaknesses = this.analyzeStrengthsWeaknesses(specialties);

          return {
            scoresTrend,
            timeSpentTrend,
            strengthsWeaknesses,
          };
        }
      );
    } catch (error) {
      logger.error(`Error in getProgressTrends for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get study recommendations for a student
   */
  static async getStudyRecommendations(userId: string): Promise<StudyRecommendationData[]> {
    try {
      const cacheKey = CACHE_KEYS.USER_RECOMMENDATIONS(userId);

      return await DashboardCache.getOrSet(
        cacheKey,
        CACHE_TTL.RECOMMENDATIONS,
        async () => {
          let recommendations = await StudyRecommendationModel.getUserRecommendations(userId);

          // If no active recommendations, generate new ones
          if (recommendations.length === 0) {
            recommendations = await StudyRecommendationModel.generateRecommendationsForUser(userId);
          }

          return recommendations;
        }
      );
    } catch (error) {
      logger.error(`Error in getStudyRecommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update student metrics after completing a question
   */
  static async updateStudentProgress(
    userId: string,
    questionId: string,
    isCorrect: boolean,
    timeSpentSeconds: number,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    specialtyId?: string
  ): Promise<void> {
    try {
      const studyTimeMinutes = Math.round(timeSpentSeconds / 60);

      // Update user metrics
      await UserMetricsModel.incrementQuestionAnswered(userId, isCorrect, studyTimeMinutes);

      // Update specialty progress if specialty provided
      if (specialtyId) {
        await SpecialtyProgressModel.updateSpecialtyProgress(userId, specialtyId, isCorrect, difficulty);
      }

      // Invalidate user cache
      await DashboardCache.invalidateUserCache(userId);

      // Send real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        const updatedMetrics = await UserMetricsModel.getUserMetrics(userId);
        wsManager.sendUserMetricsUpdate(userId, updatedMetrics);
      }

      // Check if recommendations need to be regenerated
      await this.checkAndUpdateRecommendations(userId);

      logger.info(`Updated progress for user ${userId}: question ${questionId}, correct: ${isCorrect}`);
    } catch (error) {
      logger.error(`Error updating student progress for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update study time for a student
   */
  static async updateStudyTime(userId: string, additionalMinutes: number): Promise<void> {
    try {
      await UserMetricsModel.updateStudyTime(userId, additionalMinutes);

      // Invalidate cache
      await DashboardCache.invalidateUserCache(userId);

      // Send real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        const updatedMetrics = await UserMetricsModel.getUserMetrics(userId);
        wsManager.sendUserMetricsUpdate(userId, updatedMetrics);
      }

      logger.info(`Updated study time for user ${userId}: +${additionalMinutes} minutes`);
    } catch (error) {
      logger.error(`Error updating study time for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Complete a study recommendation
   */
  static async completeRecommendation(userId: string, recommendationId: string): Promise<void> {
    try {
      await StudyRecommendationModel.completeRecommendation(recommendationId);

      // Invalidate recommendations cache
      const cacheKey = CACHE_KEYS.USER_RECOMMENDATIONS(userId);
      await DashboardCache.invalidatePattern(cacheKey);

      // Send real-time update
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.sendNotificationToUser(userId, {
          type: 'success',
          title: 'Recommendation Completed',
          message: 'Great job completing your study recommendation!',
        });
      }

      logger.info(`Completed recommendation ${recommendationId} for user ${userId}`);
    } catch (error) {
      logger.error(`Error completing recommendation ${recommendationId}:`, error);
      throw error;
    }
  }

  /**
   * Generate fresh recommendations for a user
   */
  static async refreshRecommendations(userId: string): Promise<StudyRecommendationData[]> {
    try {
      // Generate new recommendations
      const newRecommendations = await StudyRecommendationModel.generateRecommendationsForUser(userId);

      // Invalidate cache
      const cacheKey = CACHE_KEYS.USER_RECOMMENDATIONS(userId);
      await DashboardCache.invalidatePattern(cacheKey);

      // Send real-time update
      const wsManager = getWebSocketManager();
      if (wsManager && newRecommendations.length > 0) {
        wsManager.sendStudyRecommendation(userId, newRecommendations[0]);
      }

      return newRecommendations;
    } catch (error) {
      logger.error(`Error refreshing recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static generateScoresTrend(
    weeklyProgress: Array<{ date: string; questions: number; score?: number }>,
    period: 'week' | 'month' | 'year'
  ): Array<{ date: string; score: number }> {
    // Filter and sort the progress data
    const validProgress = weeklyProgress
      .filter(p => p.score !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (validProgress.length === 0) {
      return [];
    }

    // For now, return the weekly data as-is
    // In a more sophisticated implementation, you'd aggregate by period
    return validProgress.map(p => ({
      date: p.date,
      score: p.score || 0,
    }));
  }

  private static generateTimeSpentTrend(
    weeklyProgress: Array<{ date: string; questions: number; score?: number }>,
    period: 'week' | 'month' | 'year'
  ): Array<{ date: string; minutes: number }> {
    // Estimate time spent based on questions answered
    // This is a simplified calculation - in practice, you'd track actual time
    const timePerQuestion = 2; // Assume 2 minutes per question on average

    return weeklyProgress.map(p => ({
      date: p.date,
      minutes: p.questions * timePerQuestion,
    }));
  }

  private static analyzeStrengthsWeaknesses(
    specialties: SpecialtyProgressData[]
  ): {
    strengths: Array<{ specialty: string; score: number }>;
    weaknesses: Array<{ specialty: string; score: number }>;
  } {
    if (specialties.length === 0) {
      return { strengths: [], weaknesses: [] };
    }

    // Filter specialties with sufficient data
    const validSpecialties = specialties.filter(s => s.questionsAnswered >= 5);

    if (validSpecialties.length === 0) {
      return { strengths: [], weaknesses: [] };
    }

    // Sort by performance
    const sortedSpecialties = [...validSpecialties].sort(
      (a, b) => b.correctPercentage - a.correctPercentage
    );

    // Top 3 as strengths, bottom 3 as weaknesses
    const strengths = sortedSpecialties
      .slice(0, 3)
      .filter(s => s.correctPercentage >= 70)
      .map(s => ({
        specialty: s.name,
        score: s.correctPercentage,
      }));

    const weaknesses = sortedSpecialties
      .slice(-3)
      .filter(s => s.correctPercentage < 70)
      .reverse()
      .map(s => ({
        specialty: s.name,
        score: s.correctPercentage,
      }));

    return { strengths, weaknesses };
  }

  private static async checkAndUpdateRecommendations(userId: string): Promise<void> {
    try {
      // Check if user has been active enough to warrant new recommendations
      const metrics = await UserMetricsModel.getUserMetrics(userId);
      if (!metrics) return;

      // Regenerate recommendations every 20 questions or weekly
      const shouldRegenerate = (
        metrics.questionsAnswered > 0 &&
        metrics.questionsAnswered % 20 === 0
      );

      if (shouldRegenerate) {
        await this.refreshRecommendations(userId);
      }
    } catch (error) {
      logger.error(`Error checking recommendations for user ${userId}:`, error);
      // Don't throw - this is a background operation
    }
  }
}