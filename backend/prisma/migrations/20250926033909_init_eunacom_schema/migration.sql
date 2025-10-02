-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('STUDENT', 'ADMIN', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "public"."Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY');

-- CreateEnum
CREATE TYPE "public"."QuizType" AS ENUM ('PRACTICE', 'SIMULATION', 'REVIEW');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "public"."UserRole" NOT NULL DEFAULT 'STUDENT',
    "credits" INTEGER NOT NULL DEFAULT 50,
    "lastFreeQuestionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "medicalSchool" TEXT,
    "graduationYear" INTEGER,
    "specialty" TEXT,
    "examDate" TIMESTAMP(3),
    "studyGoals" TEXT,
    "weeklyStudyHours" INTEGER,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'es',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" "public"."Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "type" "public"."QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "specialtyId" TEXT,
    "topicId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "timesAsked" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."specialties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specialtyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."QuizType" NOT NULL DEFAULT 'PRACTICE',
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "timeLimit" INTEGER,
    "passingScore" INTEGER,
    "specialtyId" TEXT,
    "difficulty" "public"."Difficulty",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "timeSpent" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "lastAnswer" BOOLEAN,
    "lastAttemptAt" TIMESTAMP(3),
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "public"."user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_key" ON "public"."specialties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "public"."specialties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "topics_name_specialtyId_key" ON "public"."topics"("name", "specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_quizId_questionId_key" ON "public"."quiz_questions"("quizId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_userId_questionId_key" ON "public"."user_progress"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- AddForeignKey
ALTER TABLE "public"."user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."specialties" ADD CONSTRAINT "specialties_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."topics" ADD CONSTRAINT "topics_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quizzes" ADD CONSTRAINT "quizzes_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_results" ADD CONSTRAINT "quiz_results_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_progress" ADD CONSTRAINT "user_progress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
