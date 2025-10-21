-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('INDIVIDUAL', 'EVOLUTIONARY');

-- CreateTable
CREATE TABLE "exam_ai_analyses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mock_exam_id" TEXT,
    "analysis_type" "AnalysisType" NOT NULL,
    "strengths" TEXT[],
    "medium_performance" TEXT[],
    "weaknesses" TEXT[],
    "individual_summary" TEXT,
    "evolutionary_summary" TEXT,
    "exams_analyzed" INTEGER,
    "last_exam_analyzed" TEXT,
    "ai_model" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_ai_analyses_user_id_idx" ON "exam_ai_analyses"("user_id");

-- CreateIndex
CREATE INDEX "exam_ai_analyses_mock_exam_id_idx" ON "exam_ai_analyses"("mock_exam_id");

-- CreateIndex
CREATE INDEX "exam_ai_analyses_analysis_type_idx" ON "exam_ai_analyses"("analysis_type");

-- AddForeignKey
ALTER TABLE "exam_ai_analyses" ADD CONSTRAINT "exam_ai_analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_ai_analyses" ADD CONSTRAINT "exam_ai_analyses_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
