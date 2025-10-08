import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface UserMetricsData {
  questionsAnswered: number;
  correctAnswers: number; // Keep this for internal use
  correctPercentage: number; // Add this for API response
  studyStreak: number;
  totalStudyTime: number; // in minutes
  lastActivity?: string; // ISO string
  averageScore?: number;
  weeklyProgress?: Array<{
    date: string;
    questions: number;
    score?: number;
  }>;
}

export interface WeeklyProgressPoint {
  date: string;
  questions: number;
  score?: number;
}

export class UserMetricsModel {
  /**
   * Get user metrics by user ID
   */
  static async getUserMetrics(userId: string): Promise<UserMetricsData | null> {
    try {
      const metrics = await prisma.userMetrics.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      if (!metrics) {
        // Return default metrics for new users
        return {
          questionsAnswered: 0,
          correctAnswers: 0,
          correctPercentage: 0,
          studyStreak: 0,
          totalStudyTime: 0,
          weeklyProgress: [],
        };
      }

      // Calculate correct percentage
      const correctPercentage = metrics.questionsAnswered > 0
        ? Math.round((metrics.correctAnswers / metrics.questionsAnswered) * 100)
        : 0;

      // Parse weekly progress from JSON
      let weeklyProgress: WeeklyProgressPoint[] = [];
      if (metrics.weeklyProgress) {
        try {
          weeklyProgress = JSON.parse(metrics.weeklyProgress as string);
        } catch (error) {
          logger.warn(`Failed to parse weekly progress for user ${userId}:`, error);
          weeklyProgress = [];
        }
      }

      const result: UserMetricsData = {
        questionsAnswered: metrics.questionsAnswered,
        correctAnswers: metrics.correctAnswers,
        correctPercentage: correctPercentage,
        studyStreak: metrics.studyStreak,
        totalStudyTime: metrics.totalStudyTime,
        weeklyProgress,
      };

      if (metrics.lastActivity) {
        result.lastActivity = metrics.lastActivity.toISOString();
      }

      if (correctPercentage !== null) {
        result.averageScore = correctPercentage;
      }

      return result;
    } catch (error) {
      logger.error(`Error fetching user metrics for ${userId}:`, error);
      throw new Error('Failed to fetch user metrics');
    }
  }

  /**
   * Create or update user metrics
   */
  static async upsertUserMetrics(
    userId: string,
    data: Partial<UserMetricsData>
  ): Promise<UserMetricsData> {
    try {
      // Prepare the data for database
      const updateData: any = {
        questionsAnswered: data.questionsAnswered,
        correctAnswers: data.correctAnswers,
        studyStreak: data.studyStreak,
        totalStudyTime: data.totalStudyTime,
        lastActivity: data.lastActivity || new Date(),
        averageScore: data.averageScore,
      };

      // Handle weekly progress JSON
      if (data.weeklyProgress) {
        updateData.weeklyProgress = JSON.stringify(data.weeklyProgress);
      }

      const metrics = await prisma.userMetrics.upsert({
        where: { userId },
        create: {
          userId,
          ...updateData,
        },
        update: updateData,
      });

      // Return formatted data
      return await this.getUserMetrics(userId) as UserMetricsData;
    } catch (error) {
      logger.error(`Error upserting user metrics for ${userId}:`, error);
      throw new Error('Failed to update user metrics');
    }
  }

  /**
   * Increment questions answered and update streak
   */
  static async incrementQuestionAnswered(
    userId: string,
    isCorrect: boolean,
    studyTimeMinutes: number = 0
  ): Promise<UserMetricsData> {
    try {
      const currentMetrics = await this.getUserMetrics(userId);
      if (!currentMetrics) {
        throw new Error('User metrics not found');
      }

      // Calculate new values
      const newQuestionsAnswered = currentMetrics.questionsAnswered + 1;
      const newCorrectAnswers = currentMetrics.correctAnswers + (isCorrect ? 1 : 0);
      const newTotalStudyTime = currentMetrics.totalStudyTime + studyTimeMinutes;

      // Update study streak
      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = currentMetrics.lastActivity?.split('T')[0];

      let newStudyStreak = currentMetrics.studyStreak;
      if (lastActivityDate !== today) {
        // Different day - check if it's consecutive
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActivityDate === yesterdayStr) {
          newStudyStreak += 1; // Consecutive day
        } else if (lastActivityDate !== today) {
          newStudyStreak = 1; // Reset streak
        }
      }

      // Update weekly progress
      const weeklyProgress = [...(currentMetrics.weeklyProgress || [])];
      const todayProgress = weeklyProgress.find(p => p.date === today);

      if (todayProgress) {
        todayProgress.questions += 1;
        if (isCorrect && todayProgress.score !== undefined) {
          // Recalculate average score for today
          const totalQuestions = todayProgress.questions;
          const correctToday = Math.round((todayProgress.score / 100) * (totalQuestions - 1)) + (isCorrect ? 1 : 0);
          todayProgress.score = Math.round((correctToday / totalQuestions) * 100);
        }
      } else {
        weeklyProgress.push({
          date: today!,
          questions: 1,
          score: isCorrect ? 100 : 0,
        });
      }

      // Keep only last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const filteredProgress = weeklyProgress.filter(p =>
        new Date(p.date) >= sevenDaysAgo
      );

      return await this.upsertUserMetrics(userId, {
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        studyStreak: newStudyStreak,
        totalStudyTime: newTotalStudyTime,
        lastActivity: new Date().toISOString(),
        weeklyProgress: filteredProgress,
      });
    } catch (error) {
      logger.error(`Error incrementing question for user ${userId}:`, error);
      throw new Error('Failed to update question metrics');
    }
  }

  /**
   * Update study time for user
   */
  static async updateStudyTime(userId: string, additionalMinutes: number): Promise<void> {
    try {
      await prisma.userMetrics.upsert({
        where: { userId },
        create: {
          userId,
          questionsAnswered: 0,
          correctAnswers: 0,
          studyStreak: 0,
          totalStudyTime: additionalMinutes,
          lastActivity: new Date().toISOString(),
        },
        update: {
          totalStudyTime: {
            increment: additionalMinutes,
          },
          lastActivity: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(`Error updating study time for user ${userId}:`, error);
      throw new Error('Failed to update study time');
    }
  }

  /**
   * Get metrics for multiple users (admin function)
   */
  static async getBulkUserMetrics(userIds: string[]): Promise<Map<string, UserMetricsData>> {
    try {
      const metrics = await prisma.userMetrics.findMany({
        where: {
          userId: {
            in: userIds,
          },
        },
      });

      const result = new Map<string, UserMetricsData>();

      // Process each user's metrics
      for (const metric of metrics) {
        const averageScore = metric.questionsAnswered > 0
          ? Math.round((metric.correctAnswers / metric.questionsAnswered) * 100)
          : null;

        let weeklyProgress: WeeklyProgressPoint[] = [];
        if (metric.weeklyProgress) {
          try {
            weeklyProgress = JSON.parse(metric.weeklyProgress as string);
          } catch (error) {
            logger.warn(`Failed to parse weekly progress for user ${metric.userId}:`, error);
          }
        }

        const correctPercentage = metric.questionsAnswered > 0
          ? Math.round((metric.correctAnswers / metric.questionsAnswered) * 100)
          : 0;

        const userResult: UserMetricsData = {
          questionsAnswered: metric.questionsAnswered,
          correctAnswers: metric.correctAnswers,
          correctPercentage: correctPercentage,
          studyStreak: metric.studyStreak,
          totalStudyTime: metric.totalStudyTime,
          weeklyProgress,
        };

        if (metric.lastActivity) {
          userResult.lastActivity = metric.lastActivity.toISOString();
        }

        if (averageScore !== null) {
          userResult.averageScore = averageScore;
        }

        result.set(metric.userId, userResult);
      }

      // Add default metrics for users not in database
      for (const userId of userIds) {
        if (!result.has(userId)) {
          result.set(userId, {
            questionsAnswered: 0,
            correctAnswers: 0,
            correctPercentage: 0,
            studyStreak: 0,
            totalStudyTime: 0,
            weeklyProgress: [],
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('Error fetching bulk user metrics:', error);
      throw new Error('Failed to fetch bulk user metrics');
    }
  }

  /**
   * Reset user metrics (for testing or admin functions)
   */
  static async resetUserMetrics(userId: string): Promise<void> {
    try {
      await prisma.userMetrics.upsert({
        where: { userId },
        create: {
          userId,
          questionsAnswered: 0,
          correctAnswers: 0,
          studyStreak: 0,
          totalStudyTime: 0,
          lastActivity: new Date().toISOString(),
        },
        update: {
          questionsAnswered: 0,
          correctAnswers: 0,
          studyStreak: 0,
          totalStudyTime: 0,
          lastActivity: new Date().toISOString(),
        },
      });

      logger.info(`Reset metrics for user ${userId}`);
    } catch (error) {
      logger.error(`Error resetting metrics for user ${userId}:`, error);
      throw new Error('Failed to reset user metrics');
    }
  }
}