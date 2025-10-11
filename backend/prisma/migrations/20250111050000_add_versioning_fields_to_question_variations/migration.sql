-- Add versioning fields to question_variations table
ALTER TABLE "question_variations" 
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "is_visible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "modified_at" TIMESTAMP(3),
ADD COLUMN "parent_version_id" TEXT;
