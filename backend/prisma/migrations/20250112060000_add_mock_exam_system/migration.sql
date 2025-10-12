-- ============================================================================
-- SISTEMA DE ENSAYOS EUNACOM (180 PREGUNTAS)
-- ============================================================================

-- CreateEnum para estados de compra de ensayos
CREATE TYPE "MockExamPurchaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum para estados de ensayos
CREATE TYPE "MockExamStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable: Paquetes de ensayos
CREATE TABLE "mock_exam_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "mock_exam_qty" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_exam_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Compras de paquetes de ensayos
CREATE TABLE "mock_exam_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "mock_exams_total" INTEGER NOT NULL,
    "mock_exams_used" INTEGER NOT NULL DEFAULT 0,
    "status" "MockExamPurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "mock_exam_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Instancias de ensayos
CREATE TABLE "mock_exams" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "MockExamStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "correct_answers" INTEGER,
    "total_questions" INTEGER NOT NULL DEFAULT 180,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "time_spent_secs" INTEGER,

    CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Preguntas dentro de ensayos
CREATE TABLE "mock_exam_questions" (
    "id" TEXT NOT NULL,
    "mock_exam_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "question_order" INTEGER NOT NULL,

    CONSTRAINT "mock_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Respuestas del alumno en ensayos
CREATE TABLE "mock_exam_answers" (
    "id" TEXT NOT NULL,
    "mock_exam_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "selected_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mock_exam_packages_name_key" ON "mock_exam_packages"("name");

-- CreateIndex
CREATE INDEX "mock_exam_purchases_user_id_idx" ON "mock_exam_purchases"("user_id");

-- CreateIndex
CREATE INDEX "mock_exam_purchases_status_idx" ON "mock_exam_purchases"("status");

-- CreateIndex
CREATE INDEX "mock_exams_user_id_idx" ON "mock_exams"("user_id");

-- CreateIndex
CREATE INDEX "mock_exams_status_idx" ON "mock_exams"("status");

-- CreateIndex
CREATE INDEX "mock_exam_questions_mock_exam_id_idx" ON "mock_exam_questions"("mock_exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_exam_questions_mock_exam_id_question_order_key" ON "mock_exam_questions"("mock_exam_id", "question_order");

-- CreateIndex
CREATE INDEX "mock_exam_answers_mock_exam_id_idx" ON "mock_exam_answers"("mock_exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_exam_answers_mock_exam_id_variation_id_key" ON "mock_exam_answers"("mock_exam_id", "variation_id");

-- AddForeignKey
ALTER TABLE "mock_exam_purchases" ADD CONSTRAINT "mock_exam_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_purchases" ADD CONSTRAINT "mock_exam_purchases_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "mock_exam_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_purchases" ADD CONSTRAINT "mock_exam_purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "mock_exam_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_questions" ADD CONSTRAINT "mock_exam_questions_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_questions" ADD CONSTRAINT "mock_exam_questions_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_answers" ADD CONSTRAINT "mock_exam_answers_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_answers" ADD CONSTRAINT "mock_exam_answers_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

