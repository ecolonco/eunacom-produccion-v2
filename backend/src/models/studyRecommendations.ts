import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface StudyRecommendationData {
  id: string;
  type: 'weak_area' | 'next_topic' | 'review';
  specialty: string;
  specialtyId?: string;
  priority: number; // 1-5, where 5 is highest priority
  reason: string;
  estimatedTime?: number; // in minutes
  isActive: boolean;
  createdAt: Date;
}

export interface CreateRecommendationData {
  userId: string;
  specialtyId?: string;
  recommendationType: 'weak_area' | 'next_topic' | 'review';
  priority: number;
  reason: string;
  estimatedTime?: number;
}

export class StudyRecommendationModel {
  /**
   * Get active study recommendations for a user
   */
  static async getUserRecommendations(userId: string): Promise<StudyRecommendationData[]> {
    try {
      const recommendations = await prisma.studyRecommendation.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          specialty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return recommendations.map(r => {
        const result: StudyRecommendationData = {
          id: r.id,
          type: r.recommendationType as 'weak_area' | 'next_topic' | 'review',
          specialty: r.specialty?.name || 'General',
          priority: r.priority,
          reason: r.reason,
          isActive: r.isActive,
          createdAt: r.createdAt,
        };

        if (r.specialtyId) {
          result.specialtyId = r.specialtyId;
        }

        if (r.estimatedTime) {
          result.estimatedTime = r.estimatedTime;
        }

        return result;
      });
    } catch (error) {
      logger.error(`Error fetching recommendations for user ${userId}:`, error);
      throw new Error('Failed to fetch study recommendations');
    }
  }

  /**
   * Create a new study recommendation
   */
  static async createRecommendation(data: CreateRecommendationData): Promise<StudyRecommendationData> {
    try {
      const recommendation = await prisma.studyRecommendation.create({
        data: {
          userId: data.userId,
          specialtyId: data.specialtyId || null,
          recommendationType: data.recommendationType,
          priority: data.priority,
          reason: data.reason,
          estimatedTime: data.estimatedTime || null,
          isActive: true,
        },
        include: {
          specialty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const result: StudyRecommendationData = {
        id: recommendation.id,
        type: recommendation.recommendationType as 'weak_area' | 'next_topic' | 'review',
        specialty: recommendation.specialty?.name || 'General',
        priority: recommendation.priority,
        reason: recommendation.reason,
        isActive: recommendation.isActive,
        createdAt: recommendation.createdAt,
      };

      if (recommendation.specialtyId) {
        result.specialtyId = recommendation.specialtyId;
      }

      if (recommendation.estimatedTime) {
        result.estimatedTime = recommendation.estimatedTime;
      }

      return result;
    } catch (error) {
      logger.error('Error creating study recommendation:', error);
      throw new Error('Failed to create study recommendation');
    }
  }

  /**
   * Generate recommendations based on user performance
   */
  static async generateRecommendationsForUser(userId: string): Promise<StudyRecommendationData[]> {
    try {
      // Get user's specialty progress to identify weak areas
      const specialtyProgress = await prisma.specialtyProgress.findMany({
        where: { userId },
        include: {
          specialty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          correctPercentage: 'asc',
        },
      });

      // Get user's metrics to understand overall performance
      const userMetrics = await prisma.userMetrics.findUnique({
        where: { userId },
      });

      const recommendations: CreateRecommendationData[] = [];

      // 1. Identify weak areas (performance < 70%)
      const weakSpecialties = specialtyProgress.filter(sp => sp.correctPercentage < 70);
      for (const weakSpecialty of weakSpecialties.slice(0, 3)) { // Top 3 weak areas
        recommendations.push({
          userId,
          specialtyId: weakSpecialty.specialtyId,
          recommendationType: 'weak_area',
          priority: this.calculatePriority(weakSpecialty.correctPercentage, weakSpecialty.questionsAnswered),
          reason: `Your performance in ${weakSpecialty.specialty.name} is ${weakSpecialty.correctPercentage}%. Focus on improving this area.`,
          estimatedTime: this.estimateStudyTime(weakSpecialty.correctPercentage, weakSpecialty.questionsAnswered),
        });
      }

      // 2. Suggest next topics for specialties with good performance
      const goodSpecialties = specialtyProgress.filter(sp =>
        sp.correctPercentage >= 80 && sp.questionsAnswered >= 10
      );
      if (goodSpecialties.length > 0) {
        const nextSpecialty = goodSpecialties[Math.floor(Math.random() * goodSpecialties.length)]!;
        recommendations.push({
          userId,
          specialtyId: nextSpecialty.specialtyId,
          recommendationType: 'next_topic',
          priority: 3,
          reason: `Great progress in ${nextSpecialty.specialty.name}! Ready for more advanced topics.`,
          estimatedTime: 30,
        });
      }

      // 3. Suggest review for topics not practiced recently
      const oldProgress = specialtyProgress.filter(sp => {
        if (!sp.lastPracticed) return false;
        const daysSinceLastPractice = (Date.now() - sp.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastPractice > 7 && sp.questionsAnswered >= 5;
      });

      for (const oldSpecialty of oldProgress.slice(0, 2)) { // Top 2 for review
        recommendations.push({
          userId,
          specialtyId: oldSpecialty.specialtyId,
          recommendationType: 'review',
          priority: 2,
          reason: `It's been a while since you practiced ${oldSpecialty.specialty.name}. A quick review would help maintain your progress.`,
          estimatedTime: 20,
        });
      }

      // Deactivate old recommendations before creating new ones
      await this.deactivateOldRecommendations(userId);

      // Create new recommendations
      const createdRecommendations: StudyRecommendationData[] = [];
      for (const recData of recommendations) {
        const created = await this.createRecommendation(recData);
        createdRecommendations.push(created);
      }

      logger.info(`Generated ${createdRecommendations.length} recommendations for user ${userId}`);
      return createdRecommendations;
    } catch (error) {
      logger.error(`Error generating recommendations for user ${userId}:`, error);
      throw new Error('Failed to generate study recommendations');
    }
  }

  /**
   * Mark a recommendation as completed/inactive
   */
  static async completeRecommendation(recommendationId: string): Promise<void> {
    try {
      await prisma.studyRecommendation.update({
        where: { id: recommendationId },
        data: { isActive: false },
      });

      logger.info(`Marked recommendation ${recommendationId} as completed`);
    } catch (error) {
      logger.error(`Error completing recommendation ${recommendationId}:`, error);
      throw new Error('Failed to complete recommendation');
    }
  }

  /**
   * Deactivate old recommendations for a user
   */
  static async deactivateOldRecommendations(userId: string): Promise<void> {
    try {
      await prisma.studyRecommendation.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      logger.info(`Deactivated old recommendations for user ${userId}`);
    } catch (error) {
      logger.error(`Error deactivating recommendations for user ${userId}:`, error);
      throw new Error('Failed to deactivate old recommendations');
    }
  }

  /**
   * Get recommendations analytics for admin
   */
  static async getRecommendationsAnalytics(): Promise<{
    totalActiveRecommendations: number;
    recommendationsByType: Record<string, number>;
    averagePriority: number;
    topSpecialties: Array<{ specialtyName: string; count: number }>;
  }> {
    try {
      // Total active recommendations
      const totalActive = await prisma.studyRecommendation.count({
        where: { isActive: true },
      });

      // Recommendations by type
      const byType = await prisma.studyRecommendation.groupBy({
        by: ['recommendationType'],
        where: { isActive: true },
        _count: {
          id: true,
        },
      });

      const recommendationsByType = byType.reduce((acc, item) => {
        acc[item.recommendationType] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Average priority
      const avgPriority = await prisma.studyRecommendation.aggregate({
        where: { isActive: true },
        _avg: {
          priority: true,
        },
      });

      // Top specialties in recommendations
      const topSpecialtiesData = await prisma.studyRecommendation.groupBy({
        by: ['specialtyId'],
        where: {
          isActive: true,
          specialtyId: {
            not: null,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      });

      // Get specialty names
      const specialtyIds = topSpecialtiesData.map(item => item.specialtyId).filter(Boolean) as string[];
      const specialties = await prisma.specialty.findMany({
        where: {
          id: {
            in: specialtyIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const specialtyMap = new Map(specialties.map(s => [s.id, s.name]));
      const topSpecialties = topSpecialtiesData.map(item => ({
        specialtyName: specialtyMap.get(item.specialtyId!) || 'Unknown',
        count: item._count.id,
      }));

      return {
        totalActiveRecommendations: totalActive,
        recommendationsByType,
        averagePriority: Math.round(avgPriority._avg.priority || 0),
        topSpecialties,
      };
    } catch (error) {
      logger.error('Error fetching recommendations analytics:', error);
      throw new Error('Failed to fetch recommendations analytics');
    }
  }

  /**
   * Calculate priority based on performance and question count
   */
  private static calculatePriority(correctPercentage: number, questionsAnswered: number): number {
    // Lower performance = higher priority
    // More questions answered = more reliable data = higher priority
    let priority = 1;

    if (correctPercentage < 50) priority = 5;
    else if (correctPercentage < 60) priority = 4;
    else if (correctPercentage < 70) priority = 3;
    else priority = 2;

    // Boost priority if we have enough data points
    if (questionsAnswered >= 20) priority = Math.min(5, priority + 1);

    return priority;
  }

  /**
   * Estimate study time needed based on performance
   */
  private static estimateStudyTime(correctPercentage: number, questionsAnswered: number): number {
    let baseTime = 30; // 30 minutes base

    // More time needed for worse performance
    if (correctPercentage < 50) baseTime = 60;
    else if (correctPercentage < 60) baseTime = 45;
    else if (correctPercentage < 70) baseTime = 30;
    else baseTime = 20;

    // Adjust based on experience in the topic
    if (questionsAnswered < 10) baseTime += 15; // Need more time if inexperienced

    return baseTime;
  }
}