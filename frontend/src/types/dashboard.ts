// Dashboard Types - Frontend
// These types match the backend API responses

export interface WeeklyProgressPoint {
  date: string;
  questions: number;
  score?: number;
}

export interface UserMetrics {
  questionsAnswered: number;
  correctPercentage: number;
  studyStreak: number;
  totalStudyTime: number; // in minutes
  weeklyProgress: WeeklyProgressPoint[];
  averageScore?: number;
  lastActivity?: string; // ISO string
}

export interface SpecialtyProgress {
  id: string;
  specialtyName: string;
  correctPercentage: number;
  questionsAnswered: number;
  lastPracticed: string | null;
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
}

export interface StudyRecommendation {
  id: string;
  type: 'weak_area' | 'next_topic' | 'review';
  specialty: string;
  specialtyId?: string;
  priority: number; // 1-5, where 5 is highest priority
  reason: string;
  estimatedTime?: number; // in minutes
  isActive: boolean;
  createdAt: string;
}

export interface ProgressTrends {
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

// Admin Dashboard Types
export interface PlatformMetrics {
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

export interface ContentAnalytics {
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
  userActivity: Array<{
    userId: string;
    lastActive: string;
    questionsToday: number;
  }>;
  usersByRole: {
    students: number;
    admins: number;
    contentManagers: number;
  };
  accountStatuses: {
    active: number;
    inactive: number;
    suspended: number;
  };
}

export interface SystemHealth {
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

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Query parameters for endpoints
export interface GetProgressTrendsParams {
  period?: 'week' | 'month' | 'year';
}

export interface GetSpecialtiesParams {
  includeInactive?: boolean;
}

export interface GetContentAnalyticsParams {
  specialtyId?: string;
  limit?: number;
  sortBy?: 'attempts' | 'success_rate' | 'difficulty' | 'popularity';
}

export interface GetPlatformMetricsParams {
  period?: 'week' | 'month' | 'year';
  includeGrowthRate?: boolean;
}

export interface GetUserManagementParams {
  role?: 'STUDENT' | 'ADMIN' | 'CONTENT_MANAGER';
  status?: 'active' | 'inactive' | 'suspended';
  limit?: number;
  page?: number;
}

// Quiz and Practice types
export interface QuizQuestion {
  id: string;
  content: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY';
  specialty: string;
  topic: string;
  points?: number;
  options: QuizOption[];
  formattedId?: string | null;
  displayId?: string | null;
  variationNumber?: number | null;
}

export interface QuizOption {
  id: string;
  text: string;
  order: number;
  explanation?: string | null;
}

export interface QuizResult {
  isCorrect: boolean;
  correctAnswer: string;
  correctOptionId?: string;
  correctAnswerExplanation?: string | null;
  explanation: string;
  selectedAnswer: string;
  selectedOptionId?: string;
  selectedAnswerExplanation?: string | null;
  points: number;
  creditsRemaining: number;
}

export interface QuizSession {
  id: string;
  quizTitle: string;
  timeLimit: number;
  questionCount: number;
  passingScore: number;
  questions: QuizQuestion[];
  creditsRemaining: number;
}

export interface AvailableQuiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  timeLimit: number;
  passingScore: number;
  specialty: string;
  creditsRequired: number;
}

export interface Specialty {
  id: string;
  name: string;
  description: string;
  code: string;
}
