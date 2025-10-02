-- Update question IDs to start from 1000
-- This script will update existing questions and set the sequence to start from 1000

-- First, update existing question IDs by adding 999 to current IDs
-- We need to disable foreign key constraints temporarily

-- Update questions table
UPDATE questions SET id = id + 999;

-- Update related tables that reference question IDs
UPDATE question_options SET "questionId" = "questionId" + 999;
UPDATE user_progress SET "questionId" = "questionId" + 999 WHERE "questionId" IS NOT NULL;
UPDATE quiz_questions SET "questionId" = "questionId" + 999;

-- Update the sequence to start from 1000 for new questions
ALTER SEQUENCE questions_id_seq RESTART WITH 1000;

-- Update the sequence current value to be after the highest existing ID
SELECT setval('questions_id_seq', (SELECT MAX(id) + 1 FROM questions));