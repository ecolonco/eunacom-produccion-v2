-- CreateEnum
CREATE TYPE "QASweep2Status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "QASweep2ResultStatus" AS ENUM ('ANALYZED', 'CORRECTED', 'REVIEWED', 'APPLIED');

-- CreateEnum
CREATE TYPE "QASweep2Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QASweep2Category" AS ENUM ('CONTENT', 'LOGIC', 'CLINICAL', 'FORMAT', 'GENDER', 'SAFETY');

-- CreateTable
CREATE TABLE "qa_sweep_2_runs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "QASweep2Status" NOT NULL DEFAULT 'PENDING',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_sweep_2_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_sweep_2_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "diagnosis" JSONB NOT NULL,
    "corrections" JSONB,
    "finalLabels" JSONB NOT NULL,
    "status" "QASweep2ResultStatus" NOT NULL DEFAULT 'ANALYZED',
    "ai_model_used" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "tokens_in" INTEGER NOT NULL,
    "tokens_out" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qa_sweep_2_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_sweep_2_labels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "QASweep2Severity" NOT NULL,
    "category" "QASweep2Category" NOT NULL,
    "autoFixable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qa_sweep_2_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qa_sweep_2_results_runId_idx" ON "qa_sweep_2_results"("runId");

-- CreateIndex
CREATE INDEX "qa_sweep_2_results_status_idx" ON "qa_sweep_2_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "qa_sweep_2_labels_name_key" ON "qa_sweep_2_labels"("name");

-- AddForeignKey
ALTER TABLE "qa_sweep_2_results" ADD CONSTRAINT "qa_sweep_2_results_runId_fkey" FOREIGN KEY ("runId") REFERENCES "qa_sweep_2_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
