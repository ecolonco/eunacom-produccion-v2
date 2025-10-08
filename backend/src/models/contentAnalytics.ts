import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ContentAnalyticsData {
  questionUsage: Array<{
    questionId: string;
    title: string;
    totalAttempts: number;
    successRate: number;
    avgDifficulty: number;
    popularityScore: number;
  }>;
  specialtyPerformance: Array<{
    specialty: string;
    totalQuestions: number;
    avgSuccessRate: number;
    popularityScore: number;
  }>;
}

export interface QuestionAnalytics {
  questionId: string;
  totalAttempts: number;
  correctAttempts: number;
  averageTime?: number; // in seconds
  difficultyRating?: number; // 1-5 scale
  feedbackScore?: number; // 1-5 scale
  popularityScore?: number;
}

export class ContentAnalyticsModel {
  /**
   * Get comprehensive content analytics
   */
  static async getContentAnalytics(
    specialtyId?: string,
    limit: number = 20,
    sortBy: 'attempts' | 'success_rate' | 'difficulty' | 'popularity' = 'attempts'
  ): Promise<ContentAnalyticsData> {
    try {
      // Get question usage data
      const questionUsage = await this.getQuestionUsageAnalytics(specialtyId, limit, sortBy);

      // Get specialty performance data
      const specialtyPerformance = await this.getSpecialtyPerformanceAnalytics(specialtyId);

      return {
        questionUsage,
        specialtyPerformance,
      };
    } catch (error) {
      logger.error('Error fetching content analytics:', error);
      throw new Error('Failed to fetch content analytics');
    }
  }

  /**
   * Update analytics for a question when answered
   */
  static async updateQuestionAnalytics(
    questionId: string,
    isCorrect: boolean,
    timeSpentSeconds?: number,
    userFeedback?: number
  ): Promise<void> {
    try {
      // Get or create analytics record
      const existing = await prisma.contentAnalytic.findUnique({
        where: { questionId },
      });

      if (existing) {
        // Update existing record
        const newTotalAttempts = existing.totalAttempts + 1;
        const newCorrectAttempts = existing.correctAttempts + (isCorrect ? 1 : 0);

        // Calculate new average time if time provided
        let newAverageTime = existing.averageTime;
        if (timeSpentSeconds !== undefined) {
          if (existing.averageTime) {
            newAverageTime = (existing.averageTime * existing.totalAttempts + timeSpentSeconds) / newTotalAttempts;
          } else {
            newAverageTime = timeSpentSeconds;
          }
        }

        // Update feedback score if provided
        let newFeedbackScore = existing.feedbackScore;
        if (userFeedback !== undefined) {
          if (existing.feedbackScore) {
            // Simple average - in practice, you might want weighted averages
            newFeedbackScore = (existing.feedbackScore + userFeedback) / 2;
          } else {
            newFeedbackScore = userFeedback;
          }
        }

        // Calculate difficulty rating based on success rate
        const successRate = (newCorrectAttempts / newTotalAttempts) * 100;
        const difficultyRating = this.calculateDifficultyRating(successRate);

        // Calculate popularity score (attempts per day since creation)
        const popularityScore = this.calculatePopularityScore(
          newTotalAttempts,
          existing.lastUpdated
        );

        await prisma.contentAnalytic.update({
          where: { questionId },
          data: {
            totalAttempts: newTotalAttempts,
            correctAttempts: newCorrectAttempts,
            averageTime: newAverageTime,
            difficultyRating,
            feedbackScore: newFeedbackScore,
            popularityScore,
            lastUpdated: new Date(),
          },
        });
      } else {
        // Create new analytics record
        const difficultyRating = isCorrect ? 2 : 4; // Initial estimate
        const popularityScore = 1; // Initial value

        const createData: any = {
          questionId,
          totalAttempts: 1,
          correctAttempts: isCorrect ? 1 : 0,
          difficultyRating,
          popularityScore,
          lastUpdated: new Date(),
        };

        if (timeSpentSeconds !== undefined) {
          createData.averageTime = timeSpentSeconds;
        }

        if (userFeedback !== undefined) {
          createData.feedbackScore = userFeedback;
        }

        await prisma.contentAnalytic.create({
          data: createData,
        });
      }

      logger.debug(`Updated analytics for question ${questionId}`);
    } catch (error) {
      logger.error(`Error updating question analytics for ${questionId}:`, error);
      throw new Error('Failed to update question analytics');
    }
  }

  /**
   * Get analytics for a specific question
   */
  static async getQuestionAnalytics(questionId: string): Promise<QuestionAnalytics | null> {
    try {
      const analytics = await prisma.contentAnalytic.findUnique({
        where: { questionId },
      });

      if (!analytics) {
        return null;
      }

      const result: any = {
        questionId: analytics.questionId,
        totalAttempts: analytics.totalAttempts,
        correctAttempts: analytics.correctAttempts,
        difficultyRating: analytics.difficultyRating,
        popularityScore: analytics.popularityScore,
      };

      if (analytics.averageTime !== null) {
        result.averageTime = analytics.averageTime;
      }

      if (analytics.feedbackScore !== null) {
        result.feedbackScore = analytics.feedbackScore;
      }

      return result;
    } catch (error) {
      logger.error(`Error fetching analytics for question ${questionId}:`, error);
      throw new Error('Failed to fetch question analytics');
    }
  }

  /**
   * Get top performing questions by success rate
   */
  static async getTopPerformingQuestions(limit: number = 10): Promise<Array<{
    questionId: string;
    title: string;
    successRate: number;
    totalAttempts: number;
    specialty: string;
  }>> {
    try {
      const analytics = await prisma.contentAnalytic.findMany({
        where: {
          totalAttempts: {
            gte: 10, // Minimum attempts for reliable data
          },
        },
        include: {
          question: {
            select: {
              id: true,
              content: true,
              specialty: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          correctAttempts: 'desc', // This is a simplified ordering
        },
        take: limit,
      });

      return analytics.map(a => {
        const successRate = (a.correctAttempts / a.totalAttempts) * 100;
        const title = a.question.content.length > 100
          ? a.question.content.substring(0, 97) + '...'
          : a.question.content;

        return {
          questionId: a.questionId,
          title,
          successRate: Math.round(successRate),
          totalAttempts: a.totalAttempts,
          specialty: a.question.specialty?.name || 'General',
        };
      });
    } catch (error) {
      logger.error('Error fetching top performing questions:', error);
      throw new Error('Failed to fetch top performing questions');
    }
  }

  /**
   * Get questions that need review (poor performance or feedback)
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
      const analytics = await prisma.contentAnalytic.findMany({
        where: {
          totalAttempts: {
            gte: 5, // Minimum attempts
          },
        },
        include: {
          question: {
            select: {
              id: true,
              content: true,
            },
          },
        },
      });

      const questionsNeedingReview = analytics.filter(a => {
        const successRate = (a.correctAttempts / a.totalAttempts) * 100;
        return (
          successRate < 30 || // Very low success rate
          successRate > 95 || // Suspiciously high success rate
          (a.feedbackScore && a.feedbackScore < 2.5) // Poor feedback
        );
      });

      return questionsNeedingReview.map(a => {
        const successRate = (a.correctAttempts / a.totalAttempts) * 100;
        const title = a.question.content.length > 100
          ? a.question.content.substring(0, 97) + '...'
          : a.question.content;

        const issues: string[] = [];
        if (successRate < 30) issues.push('Very low success rate');
        if (successRate > 95) issues.push('Suspiciously high success rate');
        if (a.feedbackScore && a.feedbackScore < 2.5) issues.push('Poor user feedback');

        const result: any = {
          questionId: a.questionId,
          title,
          successRate: Math.round(successRate),
          totalAttempts: a.totalAttempts,
          issues,
        };

        if (a.feedbackScore !== null) {
          result.feedbackScore = a.feedbackScore;
        }

        return result;
      });
    } catch (error) {
      logger.error('Error fetching questions needing review:', error);
      throw new Error('Failed to fetch questions needing review');
    }
  }

  /**
   * Get content analytics summary
   */
  static async getAnalyticsSummary(): Promise<{
    totalQuestions: number;
    questionsWithAnalytics: number;
    averageSuccessRate: number;
    totalAttempts: number;
    questionsNeedingReview: number;
  }> {
    try {
      const [totalQuestions, analyticsRecords] = await Promise.all([
        prisma.question.count({ where: { isActive: true } }),
        prisma.contentAnalytic.findMany({
          select: {
            totalAttempts: true,
            correctAttempts: true,
            feedbackScore: true,
          },
        }),
      ]);

      const questionsWithAnalytics = analyticsRecords.length;
      const totalAttempts = analyticsRecords.reduce((sum, a) => sum + a.totalAttempts, 0);
      const totalCorrect = analyticsRecords.reduce((sum, a) => sum + a.correctAttempts, 0);
      const averageSuccessRate = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

      // Count questions needing review
      const questionsNeedingReview = analyticsRecords.filter(a => {
        const successRate = a.totalAttempts > 0 ? (a.correctAttempts / a.totalAttempts) * 100 : 0;
        return (
          (a.totalAttempts >= 5 && (successRate < 30 || successRate > 95)) ||
          (a.feedbackScore && a.feedbackScore < 2.5)
        );
      }).length;

      return {
        totalQuestions,
        questionsWithAnalytics,
        averageSuccessRate: Math.round(averageSuccessRate),
        totalAttempts,
        questionsNeedingReview,
      };
    } catch (error) {
      logger.error('Error fetching analytics summary:', error);
      throw new Error('Failed to fetch analytics summary');
    }
  }

  /**
   * Private helper methods
   */
  private static async getQuestionUsageAnalytics(
    specialtyId?: string,
    limit: number = 20,
    sortBy: 'attempts' | 'success_rate' | 'difficulty' | 'popularity' = 'attempts'
  ): Promise<Array<{
    questionId: string;
    title: string;
    totalAttempts: number;
    successRate: number;
    avgDifficulty: number;
    popularityScore: number;
  }>> {
    try {
      // Build where clause
      const whereClause: any = {};
      if (specialtyId) {
        whereClause.question = {
          specialtyId,
        };
      }

      // Build order by clause
      let orderBy: any;
      switch (sortBy) {
        case 'success_rate':
          orderBy = { correctAttempts: 'desc' }; // This is simplified
          break;
        case 'difficulty':
          orderBy = { difficultyRating: 'desc' };
          break;
        case 'popularity':
          orderBy = { popularityScore: 'desc' };
          break;
        default:
          orderBy = { totalAttempts: 'desc' };
      }

      const analytics = await prisma.contentAnalytic.findMany({
        where: whereClause,
        include: {
          question: {
            select: {
              id: true,
              content: true,
            },
          },
        },
        orderBy,
        take: limit,
      });

      return analytics.map(a => {
        const successRate = a.totalAttempts > 0 ? (a.correctAttempts / a.totalAttempts) * 100 : 0;
        const title = a.question.content.length > 100
          ? a.question.content.substring(0, 97) + '...'
          : a.question.content;

        return {
          questionId: a.questionId,
          title,
          totalAttempts: a.totalAttempts,
          successRate: Math.round(successRate),
          avgDifficulty: a.difficultyRating || 0,
          popularityScore: a.popularityScore || 0,
        };
      });
    } catch (error) {
      logger.error('Error fetching question usage analytics:', error);
      return [];
    }
  }

  private static async getSpecialtyPerformanceAnalytics(
    specialtyId?: string
  ): Promise<Array<{
    specialty: string;
    totalQuestions: number;
    avgSuccessRate: number;
    popularityScore: number;
  }>> {
    try {
      // This is a complex query that would benefit from materialized views in production
      const specialties = await prisma.specialty.findMany({
        where: specialtyId ? { id: specialtyId } : { isActive: true },
        include: {
          questions: {
            include: {
              contentAnalytics: true,
            },
          },
        },
      });

      return specialties.map(specialty => {
        const questionsWithAnalytics = specialty.questions.filter(q => q.contentAnalytics);
        const totalQuestions = questionsWithAnalytics.length;

        if (totalQuestions === 0) {
          return {
            specialty: specialty.name,
            totalQuestions: specialty.questions.length,
            avgSuccessRate: 0,
            popularityScore: 0,
          };
        }

        // Calculate average success rate across all questions in specialty
        const totalAttempts = questionsWithAnalytics.reduce(
          (sum, q) => sum + (q.contentAnalytics?.totalAttempts || 0),
          0
        );
        const totalCorrect = questionsWithAnalytics.reduce(
          (sum, q) => sum + (q.contentAnalytics?.correctAttempts || 0),
          0
        );

        const avgSuccessRate = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

        // Calculate popularity as average attempts per question
        const popularityScore = totalQuestions > 0 ? totalAttempts / totalQuestions : 0;

        return {
          specialty: specialty.name,
          totalQuestions,
          avgSuccessRate: Math.round(avgSuccessRate),
          popularityScore: Math.round(popularityScore),
        };
      });
    } catch (error) {
      logger.error('Error fetching specialty performance analytics:', error);
      return [];
    }
  }

  private static calculateDifficultyRating(successRate: number): number {
    // Convert success rate to difficulty rating (1 = very easy, 5 = very hard)
    if (successRate >= 90) return 1; // Very easy
    if (successRate >= 75) return 2; // Easy
    if (successRate >= 50) return 3; // Medium
    if (successRate >= 25) return 4; // Hard
    return 5; // Very hard
  }

  private static calculatePopularityScore(totalAttempts: number, lastUpdated: Date): number {
    // Calculate attempts per day since last update
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 0 ? Math.round(totalAttempts / daysSinceUpdate) : totalAttempts;
  }
}