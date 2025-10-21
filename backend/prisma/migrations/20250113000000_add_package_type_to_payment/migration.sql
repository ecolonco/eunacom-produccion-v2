-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('CREDITS', 'CONTROL', 'EXAM', 'MOCK_EXAM');

-- AlterTable
ALTER TABLE "payments" 
ADD COLUMN "package_type" "PackageType" NOT NULL DEFAULT 'CREDITS',
ADD COLUMN "package_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_package_type_idx" ON "payments"("package_type");

