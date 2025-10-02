-- CreateTable
CREATE TABLE "public"."user_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "studyStreak" INTEGER NOT NULL DEFAULT 0,
    "totalStudyTime" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3),
    "averageScore" DOUBLE PRECISION,
    "weeklyProgress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."specialty_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "correctPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficultyBreakdown" JSONB,
    "lastPracticed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialty_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."study_recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialtyId" TEXT,
    "recommendationType" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "estimatedTime" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platform_metrics" (
    "id" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "period" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_analytics" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION,
    "difficultyRating" DOUBLE PRECISION,
    "feedbackScore" DOUBLE PRECISION,
    "popularityScore" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_metrics_userId_key" ON "public"."user_metrics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "specialty_progress_userId_specialtyId_key" ON "public"."specialty_progress"("userId", "specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "content_analytics_questionId_key" ON "public"."content_analytics"("questionId");

-- AddForeignKey
ALTER TABLE "public"."user_metrics" ADD CONSTRAINT "user_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."specialty_progress" ADD CONSTRAINT "specialty_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."specialty_progress" ADD CONSTRAINT "specialty_progress_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."study_recommendations" ADD CONSTRAINT "study_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."study_recommendations" ADD CONSTRAINT "study_recommendations_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_analytics" ADD CONSTRAINT "content_analytics_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
