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
  static async getRandomQuestion(specialty?: string, difficulty?: 'EASY' | 'MEDIUM' | 'HARD'): Promise<QuizQuestion> {
    const params = new URLSearchParams();
    if (specialty && specialty !== 'all') {
      params.append('specialty', specialty);
    }
    if (difficulty) {
      params.append('difficulty', difficulty);
    }

    const response = await apiClient.get(`/api/quiz/random-question?${params.toString()}`);
    return response.data.question;
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
