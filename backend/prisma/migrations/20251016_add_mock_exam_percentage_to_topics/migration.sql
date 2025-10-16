-- AlterTable
ALTER TABLE "topics" ADD COLUMN "mock_exam_percentage" DOUBLE PRECISION;

-- Add comment
COMMENT ON COLUMN "topics"."mock_exam_percentage" IS 'Porcentaje asignado a este topic para la generación de ensayos EUNACOM (180 preguntas)';
