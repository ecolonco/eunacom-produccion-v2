const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://eunacom-backend-v3.onrender.com';

export interface ControlPackage {
  id: string;
  name: string;
  description?: string;
  price: number;
  controlQty: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPurchase {
  id: string;
  userId: string;
  packageId: string;
  paymentId?: string;
  controlsTotal: number;
  controlsUsed: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  purchasedAt: string;
  expiresAt?: string;
  package: ControlPackage;
  controls: Control[];
}

export interface Control {
  id: string;
  purchaseId: string;
  userId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  score?: number;
  correctAnswers?: number;
  totalQuestions: number;
  startedAt: string;
  completedAt?: string;
  timeSpentSecs?: number;
  questions?: ControlQuestion[];
  answers?: ControlAnswer[];
}

export interface ControlQuestion {
  id: string;
  controlId: string;
  variationId: string;
  questionOrder: number;
  variation: {
    id: string;
    content: string;
    explanation: string;
    displayCode?: string;
    alternatives: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      explanation?: string;
      order: number;
    }>;
    baseQuestion: {
      id: string;
      aiAnalysis?: {
        specialty?: string;
        topic?: string;
      };
    };
  };
}

export interface ControlAnswer {
  id: string;
  controlId: string;
  variationId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
}

export class ControlService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Listar paquetes de controles disponibles
   */
  async listPackages(): Promise<ControlPackage[]> {
    const response = await fetch(`${API_BASE}/api/controls/packages`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar paquetes');
    }
    
    return data.data;
  }

  /**
   * Obtener mis compras de controles
   */
  async getMyPurchases(): Promise<ControlPurchase[]> {
    const response = await fetch(`${API_BASE}/api/controls/my-purchases`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar compras');
    }
    
    return data.data;
  }

  /**
   * Iniciar un nuevo control
   */
  async startControl(purchaseId: string): Promise<Control> {
    const response = await fetch(`${API_BASE}/api/controls/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ purchaseId }),
    });
    
    // Log para debug
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok || !data.success) {
      const errorMsg = data.message || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }
    
    return data.data;
  }

  /**
   * Obtener un control específico
   */
  async getControl(controlId: string): Promise<Control> {
    const response = await fetch(`${API_BASE}/api/controls/${controlId}`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar control');
    }
    
    return data.data;
  }

  /**
   * Responder una pregunta
   */
  async submitAnswer(controlId: string, variationId: string, selectedAnswer: string): Promise<{ success: boolean; isCorrect: boolean }> {
    const response = await fetch(`${API_BASE}/api/controls/${controlId}/answer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ variationId, selectedAnswer }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al guardar respuesta');
    }
    
    return data.data;
  }

  /**
   * Completar el control
   */
  async completeControl(controlId: string): Promise<Control> {
    const response = await fetch(`${API_BASE}/api/controls/${controlId}/complete`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al completar control');
    }
    
    return data.data;
  }

  /**
   * Obtener resultados de un control
   */
  async getResults(controlId: string): Promise<Control> {
    const response = await fetch(`${API_BASE}/api/controls/${controlId}/results`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar resultados');
    }
    
    return data.data;
  }

  /**
   * Listar mis controles
   */
  async listMyControls(): Promise<Control[]> {
    const response = await fetch(`${API_BASE}/api/controls`, {
      headers: this.getAuthHeaders(),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar controles');
    }
    
    return data.data;
  }
}

export const controlService = new ControlService();

