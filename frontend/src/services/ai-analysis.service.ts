/**
 * Servicio para gestionar análisis de IA de rendimiento del estudiante
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

// Interfaces
export interface IndividualAnalysis {
  strengths: string[];
  mediumPerformance: string[];
  weaknesses: string[];
  summary: string;
  tokensUsed?: number;
  latencyMs?: number;
  createdAt?: string;
}

export interface EvolutionaryAnalysis {
  summary: string;
  examsAnalyzed: number;
  lastExamAnalyzed: string;
  tokensUsed?: number;
  latencyMs?: number;
  createdAt?: string;
}

class AIAnalysisService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Genera análisis individual de un ensayo completado
   */
  async generateIndividualAnalysis(mockExamId: string): Promise<IndividualAnalysis> {
    const response = await fetch(`${API_BASE}/api/ai-analysis/individual/${mockExamId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al generar análisis individual');
    }

    return data.analysis;
  }

  /**
   * Obtiene el análisis individual de un ensayo (si existe)
   */
  async getIndividualAnalysis(mockExamId: string): Promise<IndividualAnalysis | null> {
    try {
      const response = await fetch(`${API_BASE}/api/ai-analysis/individual/${mockExamId}`, {
        headers: this.getAuthHeaders(),
      });

      if (response.status === 404) {
        return null; // No existe análisis
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener análisis individual');
      }

      return data.analysis;
    } catch (error) {
      console.error('Error fetching individual analysis:', error);
      return null;
    }
  }

  /**
   * Genera análisis evolutivo de todos los ensayos del usuario
   */
  async generateEvolutionaryAnalysis(): Promise<EvolutionaryAnalysis> {
    const response = await fetch(`${API_BASE}/api/ai-analysis/evolutionary`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al generar análisis evolutivo');
    }

    return data.analysis;
  }

  /**
   * Obtiene el análisis evolutivo más reciente del usuario
   */
  async getEvolutionaryAnalysis(): Promise<EvolutionaryAnalysis | null> {
    try {
      const response = await fetch(`${API_BASE}/api/ai-analysis/evolutionary`, {
        headers: this.getAuthHeaders(),
      });

      if (response.status === 404) {
        return null; // No existe análisis
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener análisis evolutivo');
      }

      return data.analysis;
    } catch (error) {
      console.error('Error fetching evolutionary analysis:', error);
      return null;
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();
