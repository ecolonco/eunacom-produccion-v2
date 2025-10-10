-- Create enum for payment status
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('CREATED','PENDING','PAID','FAILED','CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "credits" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CLP',
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "flowToken" TEXT,
  "flowOrder" TEXT,
  "payUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Uniqueness for flow token when present
CREATE UNIQUE INDEX IF NOT EXISTS "payments_flowToken_key" ON "payments"(("flowToken")) WHERE "flowToken" IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS "payments_userId_idx" ON "payments"("userId");
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");

-- FK
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


