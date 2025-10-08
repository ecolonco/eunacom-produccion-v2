import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuizService } from '../services/quizService';

// Query keys for React Query
export const QUIZ_QUERY_KEYS = {
  randomQuestion: (specialty?: string, difficulty?: string) =>
    ['quiz', 'random-question', specialty, difficulty] as const,
  availableQuizzes: () => ['quiz', 'available-quizzes'] as const,
  specialties: () => ['quiz', 'specialties'] as const,
};

// Get random question for quick practice
export const useRandomQuestion = (specialty?: string, difficulty?: 'EASY' | 'MEDIUM' | 'HARD') => {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.randomQuestion(specialty, difficulty),
    queryFn: () => QuizService.getRandomQuestion(specialty, difficulty),
    staleTime: 0, // Always fetch new question
    gcTime: 0, // Don't cache questions
    enabled: false, // Don't auto-fetch, only on manual refetch
  });
};

// Submit answer mutation
export const useSubmitAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      selectedOptionId,
      timeSpent
    }: {
      questionId: string;
      selectedOptionId: string;
      timeSpent?: number;
    }) => QuizService.submitAnswer(questionId, selectedOptionId, timeSpent),

    onSuccess: () => {
      // Invalidate relevant dashboard queries to update stats
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Get available quizzes
export const useAvailableQuizzes = () => {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.availableQuizzes(),
    queryFn: QuizService.getAvailableQuizzes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Start simulation mutation
export const useStartSimulation = () => {
  return useMutation({
    mutationFn: (quizId: string) => QuizService.startSimulation(quizId),
  });
};

// Get specialties for filtering
export const useSpecialties = () => {
  return useQuery({
    queryKey: QUIZ_QUERY_KEYS.specialties(),
    queryFn: QuizService.getSpecialties,
    staleTime: 30 * 60 * 1000, // 30 minutes - specialties don't change often
  });
};