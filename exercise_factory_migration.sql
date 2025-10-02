-- Migration to create Exercise Factory tables
-- Execute this directly on the production database

-- Check if tables exist first
DO $$
BEGIN
    -- Create ProcessingJob table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processing_jobs') THEN
        CREATE TABLE "processing_jobs" (
            "id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "total_items" INTEGER NOT NULL DEFAULT 0,
            "processed_items" INTEGER NOT NULL DEFAULT 0,
            "input_data" JSONB,
            "result_data" JSONB,
            "error_message" TEXT,
            "started_at" TIMESTAMP(3),
            "completed_at" TIMESTAMP(3),
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created processing_jobs table';
    ELSE
        RAISE NOTICE 'processing_jobs table already exists';
    END IF;

    -- Create BaseQuestion table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'base_questions') THEN
        CREATE TABLE "base_questions" (
            "id" TEXT NOT NULL,
            "content" TEXT NOT NULL,
            "source_file" TEXT NOT NULL,
            "uploaded_by" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "base_questions_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created base_questions table';
    ELSE
        RAISE NOTICE 'base_questions table already exists';
    END IF;

    -- Create AIAnalysis table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_analysis') THEN
        CREATE TABLE "ai_analysis" (
            "id" TEXT NOT NULL,
            "base_question_id" TEXT NOT NULL,
            "analysis_result" JSONB NOT NULL,
            "difficulty" TEXT,
            "specialty" TEXT,
            "topic" TEXT,
            "review_notes" TEXT,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "ai_analysis_base_question_id_key" UNIQUE ("base_question_id")
        );
        RAISE NOTICE 'Created ai_analysis table';
    ELSE
        RAISE NOTICE 'ai_analysis table already exists';
    END IF;

    -- Create QuestionVariation table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_variations') THEN
        CREATE TABLE "question_variations" (
            "id" TEXT NOT NULL,
            "base_question_id" TEXT NOT NULL,
            "variation_number" INTEGER NOT NULL,
            "content" TEXT NOT NULL,
            "explanation" TEXT NOT NULL,
            "difficulty" TEXT NOT NULL,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "question_variations_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created question_variations table';
    ELSE
        RAISE NOTICE 'question_variations table already exists';
    END IF;

    -- Create Alternative table if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alternatives') THEN
        CREATE TABLE "alternatives" (
            "id" TEXT NOT NULL,
            "variation_id" TEXT NOT NULL,
            "text" TEXT NOT NULL,
            "is_correct" BOOLEAN NOT NULL,
            "explanation" TEXT,
            "order" INTEGER NOT NULL,
            CONSTRAINT "alternatives_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created alternatives table';
    ELSE
        RAISE NOTICE 'alternatives table already exists';
    END IF;
END $$;

-- Add foreign keys if they don't exist
DO $$
BEGIN
    -- Check and add foreign key for ai_analysis
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ai_analysis_base_question_id_fkey'
    ) THEN
        ALTER TABLE "ai_analysis"
        ADD CONSTRAINT "ai_analysis_base_question_id_fkey"
        FOREIGN KEY ("base_question_id") REFERENCES "base_questions"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key ai_analysis_base_question_id_fkey';
    END IF;

    -- Check and add foreign key for question_variations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'question_variations_base_question_id_fkey'
    ) THEN
        ALTER TABLE "question_variations"
        ADD CONSTRAINT "question_variations_base_question_id_fkey"
        FOREIGN KEY ("base_question_id") REFERENCES "base_questions"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key question_variations_base_question_id_fkey';
    END IF;

    -- Check and add foreign key for alternatives
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'alternatives_variation_id_fkey'
    ) THEN
        ALTER TABLE "alternatives"
        ADD CONSTRAINT "alternatives_variation_id_fkey"
        FOREIGN KEY ("variation_id") REFERENCES "question_variations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key alternatives_variation_id_fkey';
    END IF;
END $$;

-- Query to check if data exists in Exercise Factory tables
SELECT
    'processing_jobs' as table_name,
    COUNT(*) as record_count
FROM "processing_jobs"
UNION ALL
SELECT
    'base_questions' as table_name,
    COUNT(*) as record_count
FROM "base_questions"
UNION ALL
SELECT
    'question_variations' as table_name,
    COUNT(*) as record_count
FROM "question_variations"
UNION ALL
SELECT
    'alternatives' as table_name,
    COUNT(*) as record_count
FROM "alternatives";