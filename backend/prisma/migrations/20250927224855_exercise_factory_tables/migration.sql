-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "inputData" JSONB,
    "outputData" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "base_questions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "base_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" TEXT NOT NULL,
    "baseQuestionId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "topic" TEXT,
    "subtopic" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "keywords" TEXT[],
    "learningObjectives" TEXT[],
    "questionType" TEXT NOT NULL,
    "baseDifficulty" TEXT NOT NULL,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_variations" (
    "id" TEXT NOT NULL,
    "baseQuestionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "variationNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternatives" (
    "id" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "explanation" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alternatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_baseQuestionId_key" ON "ai_analysis"("baseQuestionId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_baseQuestionId_fkey" FOREIGN KEY ("baseQuestionId") REFERENCES "base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_variations" ADD CONSTRAINT "question_variations_baseQuestionId_fkey" FOREIGN KEY ("baseQuestionId") REFERENCES "base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternatives" ADD CONSTRAINT "alternatives_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "question_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;