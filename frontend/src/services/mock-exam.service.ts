/**
 * Servicio para gestionar ensayos EUNACOM (180 preguntas)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

// Interfaces
export interface MockExamPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  mockExamQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockExamPurchase {
  id: string;
  userId: string;
  packageId: string;
  paymentId: string | null;
  mockExamsTotal: number;
  mockExamsUsed: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  purchasedAt: string;
  expiresAt: string | null;
  package: MockExamPackage;
}

export interface MockExam {
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
  questions: MockExamQuestion[];
  answers: MockExamAnswer[];
}

export interface MockExamQuestion {
  id: string;
  mockExamId: string;
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

export interface MockExamAnswer {
  id: string;
  mockExamId: string;
  variationId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
}

class MockExamService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async listPackages(): Promise<MockExamPackage[]> {
    const response = await fetch(`${API_BASE}/api/mock-exams/packages`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Error al cargar paquetes');
    return data.data;
  }

  async getMyPurchases(): Promise<MockExamPurchase[]> {
    const response = await fetch(`${API_BASE}/api/mock-exams/my-purchases`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Error al cargar compras');
    return data.data;
  }

  async startMockExam(purchaseId: string): Promise<MockExam> {
    console.log('🚀 startMockExam service called');
    console.log('   purchaseId:', purchaseId);
    
    const response = await fetch(`${API_BASE}/api/mock-exams/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ purchaseId }),
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!data.success) {
      console.error('❌ Start failed:', data.message);
      throw new Error(data.message || 'Error al iniciar ensayo');
    }
    
    console.log('✅ Start successful');
    return data.data;
  }

  async getMockExam(mockExamId: string): Promise<MockExam> {
    const response = await fetch(`${API_BASE}/api/mock-exams/${mockExamId}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Error al cargar ensayo');
    return data.data;
  }

  async submitAnswer(mockExamId: string, variationId: string, selectedAnswer: string) {
    const response = await fetch(`${API_BASE}/api/mock-exams/${mockExamId}/answer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ variationId, selectedAnswer }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Error al guardar respuesta');
    return data.data;
  }

  async completeMockExam(mockExamId: string): Promise<MockExam> {
    console.log('🚀 completeMockExam service called');
    console.log('   mockExamId:', mockExamId);
    
    const response = await fetch(`${API_BASE}/api/mock-exams/${mockExamId}/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    console.log('📡 Response status:', response.status);
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!data.success) {
      console.error('❌ Complete failed:', data.message);
      throw new Error(data.message || 'Error al completar ensayo');
    }
    
    console.log('✅ Complete successful');
    return data.data;
  }

  async getResults(mockExamId: string): Promise<MockExam> {
    const response = await fetch(`${API_BASE}/api/mock-exams/${mockExamId}/results`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Error al obtener resultados');
    return data.data;
  }

  async listUserMockExams(): Promise<MockExam[]> {
    const response = await fetch(`${API_BASE}/api/mock-exams`, {
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Error al listar ensayos');
    return data.data;
  }
}

export const mockExamService = new MockExamService();

