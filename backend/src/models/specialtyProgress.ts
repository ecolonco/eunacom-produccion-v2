import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SpecialtyProgressData {
  specialtyId: string;
  name: string;
  questionsAnswered: number;
  correctPercentage: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
  lastPracticed?: Date;
}

export interface DifficultyBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

export class SpecialtyProgressModel {
  /**
   * Get specialty progress for a user
   */
  static async getUserSpecialtyProgress(
    userId: string,
    includeInactive: boolean = false
  ): Promise<SpecialtyProgressData[]> {
    try {
      const progress = await prisma.specialtyProgress.findMany({
        where: { userId },
        include: {
          specialty: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: {
          lastPracticed: 'desc',
        },
      });

      // Filter by active specialties if requested
      const filteredProgress = includeInactive
        ? progress
        : progress.filter(p => p.specialty.isActive);

      return filteredProgress.map(p => {
        let difficultyBreakdown: DifficultyBreakdown = { easy: 0, medium: 0, hard: 0 };

        if (p.difficultyBreakdown) {
          try {
            difficultyBreakdown = JSON.parse(p.difficultyBreakdown as string);
          } catch (error) {
            logger.warn(`Failed to parse difficulty breakdown for user ${userId}, specialty ${p.specialtyId}:`, error);
          }
        }

        const result: SpecialtyProgressData = {
          specialtyId: p.specialtyId,
          name: p.specialty.name,
          questionsAnswered: p.questionsAnswered,
          correctPercentage: p.correctPercentage,
          difficultyBreakdown,
        };

        if (p.lastPracticed) {
          result.lastPracticed = p.lastPracticed;
        }

        return result;
      });
    } catch (error) {
      logger.error(`Error fetching specialty progress for user ${userId}:`, error);
      throw new Error('Failed to fetch specialty progress');
    }
  }

  /**
   * Update specialty progress for a user
   */
  static async updateSpecialtyProgress(
    userId: string,
    specialtyId: string,
    isCorrect: boolean,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  ): Promise<SpecialtyProgressData> {
    try {
      // Get current progress
      const existing = await prisma.specialtyProgress.findUnique({
        where: {
          userId_specialtyId: {
            userId,
            specialtyId,
          },
        },
        include: {
          specialty: {
            select: {
              name: true,
              isActive: true,
            },
          },
        },
      });

      if (!existing) {
        // Create new progress record
        const newProgress = await prisma.specialtyProgress.create({
          data: {
            userId,
            specialtyId,
            questionsAnswered: 1,
            correctPercentage: isCorrect ? 100 : 0,
            difficultyBreakdown: JSON.stringify({
              easy: difficulty === 'EASY' ? (isCorrect ? 100 : 0) : 0,
              medium: difficulty === 'MEDIUM' ? (isCorrect ? 100 : 0) : 0,
              hard: difficulty === 'HARD' ? (isCorrect ? 100 : 0) : 0,
            }),
            lastPracticed: new Date(),
          },
          include: {
            specialty: {
              select: {
                name: true,
                isActive: true,
              },
            },
          },
        });

        return {
          specialtyId: newProgress.specialtyId,
          name: newProgress.specialty.name,
          questionsAnswered: 1,
          correctPercentage: isCorrect ? 100 : 0,
          difficultyBreakdown: {
            easy: difficulty === 'EASY' ? (isCorrect ? 100 : 0) : 0,
            medium: difficulty === 'MEDIUM' ? (isCorrect ? 100 : 0) : 0,
            hard: difficulty === 'HARD' ? (isCorrect ? 100 : 0) : 0,
          },
          lastPracticed: new Date(),
        };
      }

      // Update existing progress
      const newQuestionsAnswered = existing.questionsAnswered + 1;
      const currentCorrect = Math.round((existing.correctPercentage / 100) * existing.questionsAnswered);
      const newCorrect = currentCorrect + (isCorrect ? 1 : 0);
      const newCorrectPercentage = Math.round((newCorrect / newQuestionsAnswered) * 100);

      // Update difficulty breakdown
      let difficultyBreakdown: DifficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
      if (existing.difficultyBreakdown) {
        try {
          difficultyBreakdown = JSON.parse(existing.difficultyBreakdown as string);
        } catch (error) {
          logger.warn(`Failed to parse existing difficulty breakdown:`, error);
        }
      }

      // Update the specific difficulty level
      const difficultyKey = difficulty.toLowerCase() as keyof DifficultyBreakdown;
      const currentDifficultyQuestions = Math.round((difficultyBreakdown[difficultyKey] / 100) * existing.questionsAnswered);
      const newDifficultyCorrect = currentDifficultyQuestions + (isCorrect ? 1 : 0);
      const questionsAtDifficulty = this.countQuestionsByDifficulty(existing.questionsAnswered, difficultyBreakdown) + 1;

      if (questionsAtDifficulty > 0) {
        difficultyBreakdown[difficultyKey] = Math.round((newDifficultyCorrect / questionsAtDifficulty) * 100);
      }

      const updated = await prisma.specialtyProgress.update({
        where: {
          userId_specialtyId: {
            userId,
            specialtyId,
          },
        },
        data: {
          questionsAnswered: newQuestionsAnswered,
          correctPercentage: newCorrectPercentage,
          difficultyBreakdown: JSON.stringify(difficultyBreakdown),
          lastPracticed: new Date(),
        },
        include: {
          specialty: {
            select: {
              name: true,
              isActive: true,
            },
          },
        },
      });

      const result: SpecialtyProgressData = {
        specialtyId: updated.specialtyId,
        name: updated.specialty.name,
        questionsAnswered: updated.questionsAnswered,
        correctPercentage: updated.correctPercentage,
        difficultyBreakdown,
      };

      if (updated.lastPracticed) {
        result.lastPracticed = updated.lastPracticed;
      }

      return result;
    } catch (error) {
      logger.error(`Error updating specialty progress for user ${userId}, specialty ${specialtyId}:`, error);
      throw new Error('Failed to update specialty progress');
    }
  }

  /**
   * Get specialty progress for multiple users (admin function)
   */
  static async getBulkSpecialtyProgress(userIds: string[]): Promise<Map<string, SpecialtyProgressData[]>> {
    try {
      const progress = await prisma.specialtyProgress.findMany({
        where: {
          userId: {
            in: userIds,
          },
        },
        include: {
          specialty: {
            select: {
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: [
          { userId: 'asc' },
          { lastPracticed: 'desc' },
        ],
      });

      const result = new Map<string, SpecialtyProgressData[]>();

      // Group by user ID
      for (const p of progress) {
        if (!result.has(p.userId)) {
          result.set(p.userId, []);
        }

        let difficultyBreakdown: DifficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
        if (p.difficultyBreakdown) {
          try {
            difficultyBreakdown = JSON.parse(p.difficultyBreakdown as string);
          } catch (error) {
            logger.warn(`Failed to parse difficulty breakdown for user ${p.userId}, specialty ${p.specialtyId}:`, error);
          }
        }

        const progressData: SpecialtyProgressData = {
          specialtyId: p.specialtyId,
          name: p.specialty.name,
          questionsAnswered: p.questionsAnswered,
          correctPercentage: p.correctPercentage,
          difficultyBreakdown,
        };

        if (p.lastPracticed) {
          progressData.lastPracticed = p.lastPracticed;
        }

        result.get(p.userId)!.push(progressData);
      }

      // Ensure all requested users have entries (even if empty)
      for (const userId of userIds) {
        if (!result.has(userId)) {
          result.set(userId, []);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error fetching bulk specialty progress:', error);
      throw new Error('Failed to fetch bulk specialty progress');
    }
  }

  /**
   * Get top performing specialties across all users
   */
  static async getTopPerformingSpecialties(limit: number = 10): Promise<Array<{
    specialtyId: string;
    name: string;
    averagePerformance: number;
    totalQuestions: number;
    userCount: number;
  }>> {
    try {
      const results = await prisma.specialtyProgress.groupBy({
        by: ['specialtyId'],
        _avg: {
          correctPercentage: true,
        },
        _sum: {
          questionsAnswered: true,
        },
        _count: {
          userId: true,
        },
        having: {
          questionsAnswered: {
            _sum: {
              gt: 0,
            },
          },
        },
        orderBy: {
          _avg: {
            correctPercentage: 'desc',
          },
        },
        take: limit,
      });

      // Get specialty names
      const specialtyIds = results.map(r => r.specialtyId);
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

      return results.map(r => ({
        specialtyId: r.specialtyId,
        name: specialtyMap.get(r.specialtyId) || 'Unknown',
        averagePerformance: Math.round(r._avg.correctPercentage || 0),
        totalQuestions: r._sum.questionsAnswered || 0,
        userCount: r._count.userId,
      }));
    } catch (error) {
      logger.error('Error fetching top performing specialties:', error);
      throw new Error('Failed to fetch top performing specialties');
    }
  }

  /**
   * Helper to count questions by difficulty level
   */
  private static countQuestionsByDifficulty(
    totalQuestions: number,
    difficultyBreakdown: DifficultyBreakdown
  ): number {
    // This is a simplified calculation - in reality, you'd track this separately
    // For now, assume roughly equal distribution
    return Math.round(totalQuestions / 3);
  }

  /**
   * Reset specialty progress for a user
   */
  static async resetUserSpecialtyProgress(userId: string, specialtyId?: string): Promise<void> {
    try {
      const whereClause = specialtyId
        ? {
            userId_specialtyId: {
              userId,
              specialtyId,
            },
          }
        : { userId };

      await prisma.specialtyProgress.deleteMany({
        where: whereClause,
      });

      logger.info(`Reset specialty progress for user ${userId}${specialtyId ? `, specialty ${specialtyId}` : ''}`);
    } catch (error) {
      logger.error(`Error resetting specialty progress for user ${userId}:`, error);
      throw new Error('Failed to reset specialty progress');
    }
  }
}