-- AlterTable
ALTER TABLE "question_variations"
ADD COLUMN "confidence_score" DOUBLE PRECISION,
ADD COLUMN "last_qa_date" TIMESTAMP(3);

-- Add comment
COMMENT ON COLUMN "question_variations"."confidence_score" IS 'Confidence score from QA analysis (0.0-1.0, null = never analyzed)';
COMMENT ON COLUMN "question_variations"."last_qa_date" IS 'Date of last QA analysis';

-- Create index for filtering by confidence score
CREATE INDEX "question_variations_confidence_score_idx" ON "question_variations"("confidence_score");
CREATE INDEX "question_variations_is_visible_confidence_score_idx" ON "question_variations"("is_visible", "confidence_score");
