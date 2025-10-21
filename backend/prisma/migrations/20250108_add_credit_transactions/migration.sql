-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('DEDUCTION', 'PURCHASE', 'REFUND', 'BONUS', 'ADMIN_ADJUSTMENT');

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "packageType" TEXT,
    "description" TEXT NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions"("userId");

-- CreateIndex
CREATE INDEX "credit_transactions_createdAt_idx" ON "credit_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

