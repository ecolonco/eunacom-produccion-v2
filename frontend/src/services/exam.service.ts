/**
 * Servicio para gestionar pruebas (45 preguntas)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

// Interfaces
export interface ExamPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  examQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamPurchase {
  id: string;
  userId: string;
  packageId: string;
  paymentId: string | null;
  examsTotal: number;
  examsUsed: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  purchasedAt: string;
  expiresAt: string | null;
  package: ExamPackage;
}

export interface Exam {
  id: string;
  purchaseId: string;
  userId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  score: number | null;
  correctAnswers: number | null;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  timeSpentSecs: number | null;
  questions: ExamQuestion[];
  answers: ExamAnswer[];
}

export interface ExamQuestion {
  id: string;
  examId: string;
  variationId: string;
  questionOrder: number;
  variation: {
    id: string;
    content: string;
    explanation: string;
    displayCode: string | null;
    alternatives: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      explanation: string | null;
      order: number;
    }>;
  };
}

export interface ExamAnswer {
  id: string;
  examId: string;
  variationId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
}

class ExamService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Listar paquetes de pruebas disponibles
   */
  async listPackages(): Promise<ExamPackage[]> {
    const response = await fetch(`${API_BASE}/api/exams/packages`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar paquetes');
    }
    
    return data.data;
  }

  /**
   * Obtener mis compras de pruebas
   */
  async getMyPurchases(): Promise<ExamPurchase[]> {
    const response = await fetch(`${API_BASE}/api/exams/my-purchases`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar compras');
    }
    
    return data.data;
  }

  /**
   * Iniciar una nueva prueba
   */
  async startExam(purchaseId: string): Promise<Exam> {
    console.log('🚀 startExam service called');
    console.log('   purchaseId:', purchaseId);
    console.log('   URL:', `${API_BASE}/api/exams/start`);
    
    const response = await fetch(`${API_BASE}/api/exams/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ purchaseId }),
    });

    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!data.success) {
      console.error('❌ Start failed:', data.message);
      throw new Error(data.message || 'Error al iniciar prueba');
    }
    
    console.log('✅ Start successful');
    return data.data;
  }

  /**
   * Obtener una prueba específica
   */
  async getExam(examId: string): Promise<Exam> {
    const response = await fetch(`${API_BASE}/api/exams/${examId}`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar prueba');
    }
    
    return data.data;
  }

  /**
   * Enviar respuesta a una pregunta
   */
  async submitAnswer(examId: string, variationId: string, selectedAnswer: string) {
    const response = await fetch(`${API_BASE}/api/exams/${examId}/answer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        variationId,
        selectedAnswer,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al guardar respuesta');
    }
    
    return data.data;
  }

  /**
   * Completar la prueba
   */
  async completeExam(examId: string): Promise<Exam> {
    console.log('🚀 completeExam service called');
    console.log('   examId:', examId);
    console.log('   URL:', `${API_BASE}/api/exams/${examId}/complete`);
    
    const response = await fetch(`${API_BASE}/api/exams/${examId}/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    console.log('📡 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!data.success) {
      console.error('❌ Complete failed:', data.message);
      throw new Error(data.message || 'Error al completar prueba');
    }
    
    console.log('✅ Complete successful');
    return data.data;
  }

  /**
   * Obtener resultados de una prueba
   */
  async getResults(examId: string): Promise<Exam> {
    const response = await fetch(`${API_BASE}/api/exams/${examId}/results`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener resultados');
    }
    
    return data.data;
  }

  /**
   * Listar mis pruebas
   */
  async listUserExams(): Promise<Exam[]> {
    const response = await fetch(`${API_BASE}/api/exams`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al listar pruebas');
    }
    
    return data.data;
  }
}

export const examService = new ExamService();

