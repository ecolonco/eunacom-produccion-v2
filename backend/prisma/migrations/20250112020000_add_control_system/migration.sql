-- CreateEnum
CREATE TYPE "ControlPurchaseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "control_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "control_qty" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "controls_total" INTEGER NOT NULL,
    "controls_used" INTEGER NOT NULL DEFAULT 0,
    "status" "ControlPurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "control_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" INTEGER,
    "correct_answers" INTEGER,
    "total_questions" INTEGER NOT NULL DEFAULT 15,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "time_spent_secs" INTEGER,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_questions" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "question_order" INTEGER NOT NULL,

    CONSTRAINT "control_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_answers" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "selected_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "control_purchases_user_id_idx" ON "control_purchases"("user_id");

-- CreateIndex
CREATE INDEX "control_purchases_status_idx" ON "control_purchases"("status");

-- CreateIndex
CREATE INDEX "controls_user_id_idx" ON "controls"("user_id");

-- CreateIndex
CREATE INDEX "controls_status_idx" ON "controls"("status");

-- CreateIndex
CREATE INDEX "control_questions_control_id_idx" ON "control_questions"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_questions_control_id_question_order_key" ON "control_questions"("control_id", "question_order");

-- CreateIndex
CREATE INDEX "control_answers_control_id_idx" ON "control_answers"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_answers_control_id_variation_id_key" ON "control_answers"("control_id", "variation_id");

-- AddForeignKey
ALTER TABLE "control_purchases" ADD CONSTRAINT "control_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_purchases" ADD CONSTRAINT "control_purchases_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "control_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_purchases" ADD CONSTRAINT "control_purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "control_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_questions" ADD CONSTRAINT "control_questions_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_questions" ADD CONSTRAINT "control_questions_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_answers" ADD CONSTRAINT "control_answers_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_answers" ADD CONSTRAINT "control_answers_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

