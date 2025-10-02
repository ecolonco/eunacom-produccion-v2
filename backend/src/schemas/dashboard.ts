import { z } from 'zod';

// Query parameter schemas
export const timeRangeSchema = z.enum(['week', 'month', 'year']);
export const metricTypeSchema = z.enum(['daily_users', 'content_usage', 'system_health', 'user_growth']);
export const recommendationTypeSchema = z.enum(['weak_area', 'next_topic', 'review']);

// Request validation schemas
export const getProgressTrendsSchema = z.object({
  period: timeRangeSchema.optional().default('month'),
});

export const getUserSpecialtiesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export const getContentAnalyticsSchema = z.object({
  specialtyId: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.enum(['attempts', 'success_rate', 'difficulty', 'popularity']).optional().default('attempts'),
});

export const getPlatformMetricsSchema = z.object({
  period: timeRangeSchema.optional().default('month'),
  includeGrowthRate: z.boolean().optional().default(true),
});

export const getUserManagementSchema = z.object({
  role: z.enum(['STUDENT', 'ADMIN', 'CONTENT_MANAGER']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  page: z.number().min(1).optional().default(1),
});

// Response schemas for type safety
export const userMetricsResponseSchema = z.object({
  questionsAnswered: z.number(),
  correctPercentage: z.number().min(0).max(100),
  studyStreak: z.number().min(0),
  totalStudyTime: z.number().min(0), // hours
  weeklyProgress: z.array(z.object({
    date: z.string(),
    questions: z.number(),
    score: z.number().optional(),
  })),
  averageScore: z.number().min(0).max(100).optional(),
  lastActivity: z.string().optional(),
});

export const specialtyProgressResponseSchema = z.object({
  specialtyId: z.string(),
  name: z.string(),
  questionsAnswered: z.number(),
  correctPercentage: z.number().min(0).max(100),
  difficultyBreakdown: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }),
  lastPracticed: z.string().optional(),
});

export const progressTrendsResponseSchema = z.object({
  scoresTrend: z.array(z.object({
    date: z.string(),
    score: z.number().min(0).max(100),
  })),
  timeSpentTrend: z.array(z.object({
    date: z.string(),
    minutes: z.number().min(0),
  })),
  strengthsWeaknesses: z.object({
    strengths: z.array(z.object({
      specialty: z.string(),
      score: z.number().min(0).max(100),
    })),
    weaknesses: z.array(z.object({
      specialty: z.string(),
      score: z.number().min(0).max(100),
    })),
  }),
});

export const studyRecommendationsResponseSchema = z.object({
  type: recommendationTypeSchema,
  specialty: z.string(),
  priority: z.number().min(1).max(5),
  reason: z.string(),
  estimatedTime: z.number().min(0).optional(), // minutes
  isActive: z.boolean(),
});

export const platformMetricsResponseSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.object({
    daily: z.number(),
    weekly: z.number(),
    monthly: z.number(),
  }),
  newRegistrations: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
  userGrowthRate: z.number(),
});

export const contentAnalyticsResponseSchema = z.object({
  questionUsage: z.array(z.object({
    questionId: z.string(),
    title: z.string(),
    totalAttempts: z.number(),
    successRate: z.number().min(0).max(100),
    avgDifficulty: z.number().min(0).max(5),
    popularityScore: z.number().min(0),
  })),
  specialtyPerformance: z.array(z.object({
    specialty: z.string(),
    totalQuestions: z.number(),
    avgSuccessRate: z.number().min(0).max(100),
    popularityScore: z.number().min(0),
  })),
});

export const userManagementResponseSchema = z.object({
  recentUsers: z.array(z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(['STUDENT', 'ADMIN', 'CONTENT_MANAGER']),
    isActive: z.boolean(),
    createdAt: z.string(),
  })),
  userActivity: z.array(z.object({
    userId: z.string(),
    lastActive: z.string(),
    questionsToday: z.number(),
  })),
  usersByRole: z.object({
    students: z.number(),
    admins: z.number(),
    contentManagers: z.number(),
  }),
  accountStatuses: z.object({
    active: z.number(),
    inactive: z.number(),
    suspended: z.number(),
  }),
});

export const systemHealthResponseSchema = z.object({
  responseTime: z.object({
    avg: z.number(),
    p95: z.number(),
    p99: z.number(),
  }),
  errorRate: z.number().min(0).max(100),
  resourceUsage: z.object({
    cpu: z.number().min(0).max(100),
    memory: z.number().min(0).max(100),
    disk: z.number().min(0).max(100),
  }),
  uptime: z.number().min(0), // seconds
  activeConnections: z.number().min(0),
  redisHealth: z.boolean(),
  databaseHealth: z.boolean(),
});

// Input validation schemas for creating/updating data
export const createStudyRecommendationSchema = z.object({
  userId: z.string(),
  specialtyId: z.string().optional(),
  recommendationType: recommendationTypeSchema,
  priority: z.number().min(1).max(5),
  reason: z.string().min(1).max(500),
  estimatedTime: z.number().min(0).optional(),
});

export const updateUserMetricsSchema = z.object({
  questionsAnswered: z.number().min(0).optional(),
  correctAnswers: z.number().min(0).optional(),
  studyStreak: z.number().min(0).optional(),
  totalStudyTime: z.number().min(0).optional(),
  lastActivity: z.string().optional(),
});

export const updateSpecialtyProgressSchema = z.object({
  questionsAnswered: z.number().min(0).optional(),
  correctPercentage: z.number().min(0).max(100).optional(),
  difficultyBreakdown: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }).optional(),
  lastPracticed: z.string().optional(),
});

export const recordPlatformMetricSchema = z.object({
  metricType: metricTypeSchema,
  metricValue: z.number(),
  metadata: z.record(z.any()).optional(),
  period: timeRangeSchema.optional(),
});

export const updateContentAnalyticsSchema = z.object({
  totalAttempts: z.number().min(0).optional(),
  correctAttempts: z.number().min(0).optional(),
  averageTime: z.number().min(0).optional(),
  difficultyRating: z.number().min(0).max(5).optional(),
  feedbackScore: z.number().min(1).max(5).optional(),
  popularityScore: z.number().min(0).optional(),
});

// Type exports for use in controllers and services
export type TimeRange = z.infer<typeof timeRangeSchema>;
export type UserMetricsResponse = z.infer<typeof userMetricsResponseSchema>;
export type SpecialtyProgressResponse = z.infer<typeof specialtyProgressResponseSchema>;
export type ProgressTrendsResponse = z.infer<typeof progressTrendsResponseSchema>;
export type StudyRecommendationsResponse = z.infer<typeof studyRecommendationsResponseSchema>;
export type PlatformMetricsResponse = z.infer<typeof platformMetricsResponseSchema>;
export type ContentAnalyticsResponse = z.infer<typeof contentAnalyticsResponseSchema>;
export type UserManagementResponse = z.infer<typeof userManagementResponseSchema>;
export type SystemHealthResponse = z.infer<typeof systemHealthResponseSchema>;

export type CreateStudyRecommendationRequest = z.infer<typeof createStudyRecommendationSchema>;
export type UpdateUserMetricsRequest = z.infer<typeof updateUserMetricsSchema>;
export type UpdateSpecialtyProgressRequest = z.infer<typeof updateSpecialtyProgressSchema>;
export type RecordPlatformMetricRequest = z.infer<typeof recordPlatformMetricSchema>;
export type UpdateContentAnalyticsRequest = z.infer<typeof updateContentAnalyticsSchema>;