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

    cons