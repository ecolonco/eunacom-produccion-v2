import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CreditPackage {
  type: string;
  cost: number;
  exercises: number;
  description: string;
  savings?: number;
  savingsPercent?: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'DEDUCTION' | 'PURCHASE' | 'REFUND' | 'BONUS' | 'ADMIN_ADJUSTMENT';
  packageType?: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: any;
  createdAt: string;
}

export interface DeductCreditsRequest {
  packageType: 'SINGLE_RANDOM' | 'SINGLE_SPECIALTY' | 'PACK_20' | 'PACK_90';
  metadata?: {
    specialtyId?: string;
    specialtyName?: string;
    quizId?: string;
    [key: string]: any;
  };
}

export interface CheckCreditsRequest {
  packageType: 'SINGLE_RANDOM' | 'SINGLE_SPECIALTY' | 'PACK_20' | 'PACK_90';
}

class CreditsServiceClass {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Obtiene el balance actual de créditos del usuario
   */
  async getBalance(): Promise<{ credits: number; userId: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/credits/balance`, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Verifica si el usuario tiene suficientes créditos para un paquete
   */
  async checkCredits(request: CheckCreditsRequest): Promise<{
    hasEnoughCredits: boolean;
    currentCredits: number;
    requiredCredits: number;
    packageInfo: CreditPackage;
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/credits/check`,
        request,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error checking credits:', error);
      throw error;
    }
  }

  /**
   * Descuenta créditos del usuario
   */
  async deductCredits(request: DeductCreditsRequest): Promise<{
    newBalance: number;
    transactionId: string;
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/credits/deduct`,
        request,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data.data;
    } catch (error: any) {
      console.error('Error deducting credits:', error);
      
      // Detectar error de créditos insuficientes
      if (error.response?.data?.code === 'INSUFFICIENT_CREDITS') {
        throw new Error('INSUFFICIENT_CREDITS');
      }
      
      throw error;
    }
  }

  /**
   * Obtiene el historial de transacciones del usuario
   */
  async getTransactions(limit: number = 50, offset: number = 0): Promise<{
    transactions: CreditTransaction[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/credits/transactions?limit=${limit}&offset=${offset}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los paquetes disponibles
   */
  async getPackages(): Promise<CreditPackage[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/credits/packages`, {
        headers: this.getAuthHeaders(),
      });

      return response.data.data.packages;
    } catch (error) {
      console.error('Error getting packages:', error);
      throw error;
    }
  }

  /**
   * Calcula el costo por ejercicio de un paquete
   */
  calculateCostPerExercise(packageInfo: CreditPackage): number {
    return Number((packageInfo.cost / packageInfo.exercises).toFixed(2));
  }

  /**
   * Formatea la información de ahorro de un paquete
   */
  formatSavings(packageInfo: CreditPackage): string {
    if (!packageInfo.savings || packageInfo.savings <= 0) {
      return '';
    }
    return `Ahorras ${packageInfo.savings} créditos (${packageInfo.savingsPercent}%)`;
  }

  /**
   * Obtiene el ícono apropiado para un tipo de paquete
   */
  getPackageIcon(packageType: string): string {
    switch (packageType) {
      case 'SINGLE_RANDOM':
        return '🎲';
      case 'SINGLE_SPECIALTY':
        return '🏥';
      case 'PACK_20':
        return '📦';
      case 'PACK_90':
        return '🎁';
      default:
        return '📚';
    }
  }

  /**
   * Obtiene el color apropiado para un tipo de paquete
   */
  getPackageColor(packageType: string): string {
    switch (packageType) {
      case 'SINGLE_RANDOM':
        return 'blue';
      case 'SINGLE_SPECIALTY':
        return 'indigo';
      case 'PACK_20':
        return 'teal';
      case 'PACK_90':
        return 'green';
      default:
        return 'gray';
    }
  }
}

export const CreditsService = new CreditsServiceClass();

