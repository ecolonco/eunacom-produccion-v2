-- Script de migración manual para fixing processing_jobs table
-- Este script verifica si la tabla processing_jobs existe y la crea si es necesario
-- También maneja el caso donde la tabla existe pero le falta la columna totalItems

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    column_exists BOOLEAN := FALSE;
BEGIN
    -- Verificar si la tabla processing_jobs existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'processing_jobs'
    ) INTO table_exists;

    IF NOT table_exists THEN
        -- Si la tabla no existe, crearla completamente
        RAISE NOTICE 'Creando tabla processing_jobs...';

        CREATE TABLE "processing_jobs" (
            "id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "totalItems" INTEGER NOT NULL DEFAULT 0,
            "processedItems" INTEGER NOT NULL DEFAULT 0,
            "inputData" JSONB,
            "outputData" JSONB,
            "errorMessage" TEXT,
            "startedAt" TIMESTAMP(3),
            "completedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
        );

        RAISE NOTICE 'Tabla processing_jobs creada exitosamente.';
    ELSE
        -- Si la tabla existe, verificar si tiene la columna totalItems
        SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'processing_jobs'
            AND column_name = 'totalItems'
        ) INTO column_exists;

        IF NOT column_exists THEN
            -- Agregar la columna totalItems si no existe
            RAISE NOTICE 'Agregando columna totalItems a la tabla processing_jobs...';
            ALTER TABLE "processing_jobs" ADD COLUMN "totalItems" INTEGER NOT NULL DEFAULT 0;
            RAISE NOTICE 'Columna totalItems agregada exitosamente.';
        ELSE
            RAISE NOTICE 'La tabla processing_jobs ya tiene la columna totalItems.';
        END IF;
    END IF;

    -- Verificar si necesitamos crear las otras tablas de exercise factory
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'base_questions') THEN
        RAISE NOTICE 'Creando tabla base_questions...';

        CREATE TABLE "base_questions" (
            "id" TEXT NOT NULL,
            "content" TEXT NOT NULL,
            "source" TEXT NOT NULL,
            "uploadedBy" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "base_questions_pkey" PRIMARY KEY ("id")
        );
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_analysis') THEN
        RAISE NOTICE 'Creando tabla ai_analysis...';

        CREATE TABLE "ai_analysis" (
            "id" TEXT NOT NULL,
            "baseQuestionId" TEXT NOT NULL,
            "specialty" TEXT NOT NULL,
            "topic" TEXT NOT NULL,
            "subtopic" TEXT,
            "baseDifficulty" TEXT NOT NULL,
            "questionType" TEXT NOT NULL,
            "keywords" TEXT[],
            "learningObjectives" TEXT[],
            "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            "reviewNotes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
        );

        CREATE UNIQUE INDEX "ai_analysis_baseQuestionId_key" ON "ai_analysis"("baseQuestionId");
        ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_baseQuestionId_fkey" FOREIGN KEY ("baseQuestionId") REFERENCES "base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'question_variations') THEN
        RAISE NOTICE 'Creando tabla question_variations...';

        CREATE TABLE "question_variations" (
            "id" TEXT NOT NULL,
            "baseQuestionId" TEXT NOT NULL,
            "difficulty" TEXT NOT NULL,
            "variationNumber" INTEGER NOT NULL,
            "content" TEXT NOT NULL,
            "explanation" TEXT NOT NULL,
            "isApproved" BOOLEAN NOT NULL DEFAULT false,
            "reviewedBy" TEXT,
            "reviewedAt" TIMESTAMP(3),
            "finalQuestionId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "question_variations_pkey" PRIMARY KEY ("id")
        );

        ALTER TABLE "question_variations" ADD CONSTRAINT "question_variations_baseQuestionId_fkey" FOREIGN KEY ("baseQuestionId") REFERENCES "base_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alternatives') THEN
        RAISE NOTICE 'Creando tabla alternatives...';

        CREATE TABLE "alternatives" (
            "id" TEXT NOT NULL,
            "variationId" TEXT NOT NULL,
            "text" TEXT NOT NULL,
            "isCorrect" BOOLEAN NOT NULL DEFAULT false,
            "order" INTEGER NOT NULL DEFAULT 0,
            "explanation" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "alternatives_pkey" PRIMARY KEY ("id")
        );

        ALTER TABLE "alternatives" ADD CONSTRAINT "alternatives_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "question_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    RAISE NOTICE 'Migración completada exitosamente.';
END $$;