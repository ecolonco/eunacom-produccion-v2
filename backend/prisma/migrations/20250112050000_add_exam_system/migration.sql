-- ============================================================================
-- SISTEMA DE PRUEBAS (EXÁMENES DE 45 PREGUNTAS)
-- ============================================================================

-- CreateEnum para estados de compra de exámenes
CREATE TYPE "ExamPurchaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum para estados de exámenes
CREATE TYPE "ExamStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable: Paquetes de pruebas
CREATE TABLE "exam_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "exam_qty" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Compras de paquetes de pruebas
CREATE TABLE "exam_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "exams_total" INTEGER NOT NULL,
    "exams_used" INTEGER NOT NULL DEFAULT 0,
    "status" "ExamPurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "exam_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Instancias de pruebas
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "correct_answers" INTEGER,
    "total_questions" INTEGER NOT NULL DEFAULT 45,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "time_spent_secs" INTEGER,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Preguntas dentro de pruebas
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "question_order" INTEGER NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Respuestas del alumno en pruebas
CREATE TABLE "exam_answers" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "selected_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_packages_name_key" ON "exam_packages"("name");

-- CreateIndex
CREATE INDEX "exam_purchases_user_id_idx" ON "exam_purchases"("user_id");

-- CreateIndex
CREATE INDEX "exam_purchases_status_idx" ON "exam_purchases"("status");

-- CreateIndex
CREATE INDEX "exams_user_id_idx" ON "exams"("user_id");

-- CreateIndex
CREATE INDEX "exams_status_idx" ON "exams"("status");

-- CreateIndex
CREATE INDEX "exam_questions_exam_id_idx" ON "exam_questions"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_exam_id_question_order_key" ON "exam_questions"("exam_id", "question_order");

-- CreateIndex
CREATE INDEX "exam_answers_exam_id_idx" ON "exam_answers"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_answers_exam_id_variation_id_key" ON "exam_answers"("exam_id", "variation_id");

-- AddForeignKey
ALTER TABLE "exam_purchases" ADD CONSTRAINT "exam_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_purchases" ADD CONSTRAINT "exam_purchases_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "exam_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_purchases" ADD CONSTRAINT "exam_purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "exam_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

