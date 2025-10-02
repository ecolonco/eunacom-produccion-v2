import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PlatformMetricsData {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  newRegistrations: Array<{
    date: string;
    count: number;
  }>;
  userGrowthRate: number;
}

export interface UserActivityData {
  userId: string;
  lastActive: string;
  questionsToday: number;
}

export interface UsersByRole {
  students: number;
  admins: number;
  contentManagers: number;
}

export interface AccountStatuses {
  active: number;
  inactive: number;
  suspended: number;
}

export class PlatformMetricsModel {
  /**
   * Get comprehensive platform metrics
   */
  static async getPlatformMetrics(period: 'week' | 'month' | 'year' = 'month'): Promise<PlatformMetricsData> {
    try {
      // Get total users count
      const totalUsers = await prisma.user.count();

      // Get active users for different periods
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
        prisma.userMetrics.count({
          where: {
            lastActivity: {
              gte: oneDayAgo,
            },
          },
        }),
        prisma.userMetrics.count({
          where: {
            lastActivity: {
              gte: oneWeekAgo,
            },
          },
        }),
        prisma.userMetrics.count({
          where: {
            lastActivity: {
              gte: oneMonthAgo,
            },
          },
        }),
      ]);

      // Get registration data for the specified period
      const registrationPeriod = this.getDateRange(period);
      const newRegistrations = await this.getNewRegistrations(registrationPeriod.start, registrationPeriod.end);

      // Calculate growth rate
      const userGrowthRate = await this.calculateGrowthRate(period);

      return {
        totalUsers,
        activeUsers: {
          daily: dailyActive,
          weekly: weeklyActive,
          monthly: monthlyActive,
        },
        newRegistrations,
        userGrowthRate,
      };
    } catch (error) {
      logger.error('Error fetching platform metrics:', error);
      throw new Error('Failed to fetch platform metrics');
    }
  }

  /**
   * Get user management data for admin dashboard
   */
  static async getUserManagementData(
    role?: 'STUDENT' | 'ADMIN' | 'CONTENT_MANAGER',
    status?: 'active' | 'inactive' | 'suspended',
    limit: number = 20,
    page: number = 1
  ): Promise<{
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
  }> {
    try {
      // Build where clause for recent users
      const whereClause: any = {};
      if (role) whereClause.role = role;
      if (status === 'active') whereClause.isActive = true;
      else if (status === 'inactive') whereClause.isActive = false;

      // Get recent users
      const recentUsers = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      });

      // Get user activity data
      const userActivity = await this.getUserActivityData();

      // Get users by role
      const usersByRole = await this.getUsersByRole();

      // Get account statuses
      const accountStatuses = await this.getAccountStatuses();

      return {
        recentUsers: recentUsers.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        })),
        userActivity,
        usersByRole,
        accountStatuses,
      };
    } catch (error) {
      logger.error('Error fetching user management data:', error);
      throw new Error('Failed to fetch user management data');
    }
  }

  /**
   * Get system health metrics
   */
  static async getSystemHealth(): Promise<{
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
  }> {
    try {
      // These would typically come from monitoring systems
      // For now, return mock data or basic checks
      const databaseHealth = await this.checkDatabaseHealth();
      const redisHealth = await this.checkRedisHealth();

      return {
        responseTime: {
          avg: 150, // Mock data - would come from APM
          p95: 300,
          p99: 500,
        },
        errorRate: 0.5, // Mock data - would come from logs
        resourceUsage: {
          cpu: 45, // Mock data - would come from system monitoring
          memory: 60,
          disk: 30,
        },
        uptime: process.uptime(),
        activeConnections: await this.getActiveConnectionsCount(),
        redisHealth,
        databaseHealth,
      };
    } catch (error) {
      logger.error('Error fetching system health:', error);
      throw new Error('Failed to fetch system health');
    }
  }

  /**
   * Record a platform metric
   */
  static async recordMetric(
    metricType: string,
    metricValue: number,
    metadata?: Record<string, any>,
    period?: 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    try {
      const createData: any = {
        metricType,
        metricValue,
        recordedAt: new Date(),
      };

      if (metadata) {
        createData.metadata = JSON.stringify(metadata);
      }

      if (period) {
        createData.period = period;
      }

      await prisma.platformMetric.create({
        data: createData,
      });
    } catch (error) {
      logger.error(`Error recording metric ${metricType}:`, error);
      throw new Error('Failed to record platform metric');
    }
  }

  /**
   * Get historical metrics
   */
  static async getHistoricalMetrics(
    metricType: string,
    period: 'daily' | 'weekly' | 'monthly',
    limit: number = 30
  ): Promise<Array<{
    date: string;
    value: number;
    metadata?: any;
  }>> {
    try {
      const metrics = await prisma.platformMetric.findMany({
        where: {
          metricType,
          period,
        },
        orderBy: {
          recordedAt: 'desc',
        },
        take: limit,
      });

      return metrics.map(m => ({
        date: m.recordedAt.toISOString(),
        value: m.metricValue,
        metadata: m.metadata ? JSON.parse(m.metadata as string) : undefined,
      }));
    } catch (error) {
      logger.error(`Error fetching historical metrics for ${metricType}:`, error);
      throw new Error('Failed to fetch historical metrics');
    }
  }

  /**
   * Private helper methods
   */
  private static getDateRange(period: 'week' | 'month' | 'year'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }

  private static async getNewRegistrations(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; count: number }>> {
    try {
      // Get daily registration counts
      const registrations = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      return registrations.map(r => ({
        date: r.date,
        count: Number(r.count),
      }));
    } catch (error) {
      logger.error('Error fetching new registrations:', error);
      // Return empty array if query fails
      return [];
    }
  }

  private static async calculateGrowthRate(period: 'week' | 'month' | 'year'): Promise<number> {
    try {
      const now = new Date();
      const periodStart = new Date();
      const previousPeriodStart = new Date();

      switch (period) {
        case 'week':
          periodStart.setDate(now.getDate() - 7);
          previousPeriodStart.setDate(now.getDate() - 14);
          break;
        case 'month':
          periodStart.setMonth(now.getMonth() - 1);
          previousPeriodStart.setMonth(now.getMonth() - 2);
          break;
        case 'year':
          periodStart.setFullYear(now.getFullYear() - 1);
          previousPeriodStart.setFullYear(now.getFullYear() - 2);
          break;
      }

      const [currentPeriodUsers, previousPeriodUsers] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: {
              gte: periodStart,
              lte: now,
            },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: previousPeriodStart,
              lte: periodStart,
            },
          },
        }),
      ]);

      if (previousPeriodUsers === 0) return currentPeriodUsers > 0 ? 100 : 0;

      return Math.round(((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100);
    } catch (error) {
      logger.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  private static async getUserActivityData(): Promise<UserActivityData[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userActivity = await prisma.userMetrics.findMany({
        where: {
          lastActivity: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          lastActivity: 'desc',
        },
        take: 20,
      });

      return userActivity.map(ua => ({
        userId: ua.userId,
        lastActive: ua.lastActivity?.toISOString() || new Date().toISOString(),
        questionsToday: 0, // This would need to be calculated from daily activity
      }));
    } catch (error) {
      logger.error('Error fetching user activity data:', error);
      return [];
    }
  }

  private static async getUsersByRole(): Promise<UsersByRole> {
    try {
      const roleGroups = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true,
        },
      });

      const result: UsersByRole = {
        students: 0,
        admins: 0,
        contentManagers: 0,
      };

      roleGroups.forEach(group => {
        switch (group.role) {
          case 'STUDENT':
            result.students = group._count.id;
            break;
          case 'ADMIN':
            result.admins = group._count.id;
            break;
          case 'CONTENT_MANAGER':
            result.contentManagers = group._count.id;
            break;
        }
      });

      return result;
    } catch (error) {
      logger.error('Error fetching users by role:', error);
      return { students: 0, admins: 0, contentManagers: 0 };
    }
  }

  private static async getAccountStatuses(): Promise<AccountStatuses> {
    try {
      const [active, inactive] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
      ]);

      return {
        active,
        inactive,
        suspended: 0, // Would need additional status field in user model
      };
    } catch (error) {
      logger.error('Error fetching account statuses:', error);
      return { active: 0, inactive: 0, suspended: 0 };
    }
  }

  private static async checkDatabaseHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  private static async checkRedisHealth(): Promise<boolean> {
    try {
      // Import redis dynamically to avoid circular dependencies
      const { redis } = await import('../config/redis');
      await redis.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  private static async getActiveConnectionsCount(): Promise<number> {
    try {
      // This would typically come from connection pool or WebSocket manager
      // For now, return a mock value
      return 150;
    } catch (error) {
      logger.error('Error getting active connections count:', error);
      return 0;
    }
  }
}