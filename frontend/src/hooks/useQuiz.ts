import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuizService } from '../services/quizService';
import { useAuth } from '../contexts/AuthContext';

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

// Custom hook to get random question and update credits
export const useRandomQuestionWithCredits = () => {
  const queryClient = useQueryClient();
  const { setUserCredits } = useAuth();

  return useMutation({
    mutationFn: async ({ specialty, difficulty }: { specialty?: string; difficulty?: string }) => {
      console.log('useRandomQuestionWithCredits - Calling QuizService.getRandomQuestion:', { specialty, difficulty });
      const result = await QuizService.getRandomQuestion(specialty, difficulty);
      console.log('useRandomQuestionWithCredits - Got result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('useRandomQuestionWithCredits - Success:', data);
      // Update the credits in the query cache
      queryClient.setQueryData(['user-credits'], data.credits.remaining);
      // Also update the question in the cache for consistency
      queryClient.setQueryData(['random-question'], data.question);
      // Sync AuthContext user credits so UI reflects new balance instantly
      setUserCredits(data.credits.remaining);
    },
    onError: (error) => {
      console.error('useRandomQuestionWithCredits - Error fetching question with credits:', error);
    },
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