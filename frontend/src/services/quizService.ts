import apiClient from './api';
import type {
  QuizQuestion,
  QuizResult,
  QuizSession,
  AvailableQuiz,
  Specialty
} from '../types/dashboard';

export class QuizService {

  // Get a random question for quick practice
  static async getRandomQuestion(specialty?: string, difficulty?: 'EASY' | 'MEDIUM' | 'HARD'): Promise<{
    question: QuizQuestion;
    credits: {
      remaining: number;
      deducted: number;
      transaction: any;
    };
  }> {
    console.log('QuizService.getRandomQuestion - Requesting:', { specialty, difficulty });

    const params = new URLSearchParams();
    if (specialty && specialty !== 'all') {
      params.append('specialty', specialty);
    }
    if (difficulty) {
      params.append('difficulty', difficulty);
    }

    console.log('QuizService.getRandomQuestion - URL:', `/api/quiz/random-question?${params.toString()}`);

    const response = await apiClient.get(`/api/quiz/random-question?${params.toString()}`);

    console.log('QuizService.getRandomQuestion - Response:', response.data);

    return {
      question: response.data.question,
      credits: response.data.credits
    };
  }

  // Get a random question WITHOUT credit deduction (for prepaid packages)
  static async getRandomQuestionNoCredits(
    specialty?: string,
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  ): Promise<{ question: QuizQuestion }> {
    console.log('QuizService.getRandomQuestionNoCredits - Requesting:', { specialty, difficulty });

    const params = new URLSearchParams();
    if (specialty && specialty !== 'all') {
      params.append('specialty', specialty);
    }
    if (difficulty) {
      params.append('difficulty', difficulty);
    }

    console.log('QuizService.getRandomQuestionNoCredits - URL:', `/api/quiz/ai-random?${params.toString()}`);

    const response = await apiClient.get(`/api/quiz/ai-random?${params.toString()}`);

    console.log('QuizService.getRandomQuestionNoCredits - Response:', response.data);

    return {
      question: response.data.question,
    };
  }

  // Submit answer for a question
  static async submitAnswer(
    questionId: string,
    selectedOptionId: string,
    timeSpent?: number
  ): Promise<QuizResult> {
    const response = await apiClient.post('/api/quiz/submit-answer', {
      questionId,
      selectedOptionId,
      timeSpent
    });
    return response.data.result;
  }

  // Get available quizzes for simulations
  static async getAvailableQuizzes(): Promise<AvailableQuiz[]> {
    const response = await apiClient.get('/api/quiz/available-quizzes');
    return response.data.quizzes;
  }

  // Start a quiz simulation
  static async startSimulation(quizId: string): Promise<QuizSession> {
    const response = await apiClient.post('/api/quiz/start-simulation', {
      quizId
    });
    return response.data.session;
  }

  // Get available specialties for filtering
  static async getSpecialties(): Promise<Specialty[]> {
    const response = await apiClient.get('/api/quiz/specialties');
    return response.data.specialties;
  }
}
