import OpenAI from 'openai';
import { PrismaClient, AnalysisType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface SpecialtyPerformance {
  specialty: string;
  correct: number;
  total: number;
  percentage: number;
}

interface IndividualAnalysisResult {
  strengths: string[];
  mediumPerformance: string[];
  weaknesses: string[];
  summary: string;
  tokensUsed: number;
  latencyMs: number;
}

interface EvolutionaryAnalysisResult {
  summary: string;
  examsAnalyzed: number;
  lastExamAnalyzed: string;
  tokensUsed: number;
  latencyMs: number;
}

export class AIAnalysisService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    this.model = 'gpt-5-mini'; // Modelo para análisis de rendimiento
  }

  /**
   * Analiza el rendimiento de un estudiante en un ensayo individual
   */
  async generateIndividualAnalysis(
    userId: string,
    mockExamId: string
  ): Promise<IndividualAnalysisResult> {
    const startTime = Date.now();

    try {
      // 1. Obtener datos del ensayo
      const mockExam = await prisma.mockExam.findUnique({
        where: { id: mockExamId },
        include: {
          answers: {
            include: {
              variation: {
                include: {
                  baseQuestion: {
                    include: {
                      aiAnalysis: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!mockExam || mockExam.status !== 'COMPLETED') {
        throw new Error('Mock exam not found or not completed');
      }

      // 2. Calcular rendimiento por especialidad
      const performanceBySpecialty = this.calculatePerformanceBySpecialty(mockExam.answers);

      // 3. Clasificar especialidades
      const strengths: string[] = [];
      const mediumPerformance: string[] = [];
      const weaknesses: string[] = [];

      performanceBySpecialty.forEach(({ specialty, percentage, total }) => {
        // Solo incluir especialidades con al menos 3 preguntas
        if (total >= 3) {
          if (percentage >= 70) {
            strengths.push(specialty);
          } else if (percentage >= 50) {
            mediumPerformance.push(specialty);
          } else {
            weaknesses.push(specialty);
          }
        }
      });

      // 4. Generar resumen con IA
      const summary = await this.generateIndividualSummary(
        mockExam.score || 0,
        mockExam.totalQuestions,
        strengths,
        mediumPerformance,
        weaknesses
      );

      const latencyMs = Date.now() - startTime;

      // 5. Guardar en base de datos
      await prisma.examAIAnalysis.create({
        data: {
          userId,
          mockExamId,
          analysisType: AnalysisType.INDIVIDUAL,
          strengths,
          mediumPerformance,
          weaknesses,
          individualSummary: summary.content,
          aiModel: this.model,
          tokensUsed: summary.tokensIn + summary.tokensOut,
          latencyMs
        }
      });

      logger.info('Individual analysis generated', {
        userId,
        mockExamId,
        strengths: strengths.length,
        medium: mediumPerformance.length,
        weaknesses: weaknesses.length,
        tokensUsed: summary.tokensIn + summary.tokensOut,
        latencyMs
      });

      return {
        strengths,
        mediumPerformance,
        weaknesses,
        summary: summary.content,
        tokensUsed: summary.tokensIn + summary.tokensOut,
        latencyMs
      };
    } catch (error) {
      logger.error('Individual analysis failed:', error);
      throw error;
    }
  }

  /**
   * Genera análisis evolutivo de todos los ensayos completados del estudiante
   */
  async generateEvolutionaryAnalysis(userId: string): Promise<EvolutionaryAnalysisResult> {
    const startTime = Date.now();

    try {
      // 1. Obtener todos los ensayos completados
      const completedExams = await prisma.mockExam.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        include: {
          answers: {
            include: {
              variation: {
                include: {
                  baseQuestion: {
                    include: {
                      aiAnalysis: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          completedAt: 'asc'
        }
      });

      if (completedExams.length === 0) {
        throw new Error('No completed exams found for this user');
      }

      // 2. Verificar caché: ¿ya existe análisis actualizado?
      const latestExam = completedExams[completedExams.length - 1];
      const existingAnalysis = await prisma.examAIAnalysis.findFirst({
        where: {
          userId,
          analysisType: AnalysisType.EVOLUTIONARY
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Si existe análisis y no hay nuevos ensayos, retornar el existente
      if (existingAnalysis && existingAnalysis.lastExamAnalyzed === latestExam.id) {
        logger.info('Returning cached evolutionary analysis', {
          userId,
          analysisId: existingAnalysis.id,
          examsAnalyzed: existingAnalysis.examsAnalyzed || 0
        });

        return {
          summary: existingAnalysis.evolutionarySummary || '',
          examsAnalyzed: existingAnalysis.examsAnalyzed || 0,
          lastExamAnalyzed: existingAnalysis.lastExamAnalyzed || '',
          tokensUsed: 0, // No se usaron tokens (caché)
          latencyMs: Date.now() - startTime
        };
      }

      // 3. Calcular evolución de rendimiento
      const evolution = this.calculatePerformanceEvolution(completedExams);

      // 4. Generar resumen evolutivo con IA
      const summary = await this.generateEvolutionarySummary(evolution);

      const latencyMs = Date.now() - startTime;

      // 5. Guardar en base de datos
      await prisma.examAIAnalysis.create({
        data: {
          userId,
          mockExamId: null, // Análisis evolutivo no está ligado a un ensayo específico
          analysisType: AnalysisType.EVOLUTIONARY,
          strengths: [],
          mediumPerformance: [],
          weaknesses: [],
          evolutionarySummary: summary.content,
          examsAnalyzed: completedExams.length,
          lastExamAnalyzed: latestExam.id,
          aiModel: this.model,
          tokensUsed: summary.tokensIn + summary.tokensOut,
          latencyMs
        }
      });

      logger.info('Evolutionary analysis generated', {
        userId,
        examsAnalyzed: completedExams.length,
        lastExamAnalyzed: latestExam.id,
        tokensUsed: summary.tokensIn + summary.tokensOut,
        latencyMs
      });

      return {
        summary: summary.content,
        examsAnalyzed: completedExams.length,
        lastExamAnalyzed: latestExam.id,
        tokensUsed: summary.tokensIn + summary.tokensOut,
        latencyMs
      };
    } catch (error) {
      logger.error('Evolutionary analysis failed:', error);
      throw error;
    }
  }

  /**
   * Obtiene el análisis individual de un ensayo (si existe)
   */
  async getIndividualAnalysis(mockExamId: string) {
    return await prisma.examAIAnalysis.findFirst({
      where: {
        mockExamId,
        analysisType: AnalysisType.INDIVIDUAL
      }
    });
  }

  /**
   * Obtiene el análisis evolutivo más reciente de un usuario
   */
  async getLatestEvolutionaryAnalysis(userId: string) {
    return await prisma.examAIAnalysis.findFirst({
      where: {
        userId,
        analysisType: AnalysisType.EVOLUTIONARY
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Calcula el rendimiento por especialidad
   */
  private calculatePerformanceBySpecialty(answers: any[]): SpecialtyPerformance[] {
    const specialtyMap = new Map<string, { correct: number; total: number }>();

    answers.forEach((answer) => {
      const specialty = answer.variation?.baseQuestion?.aiAnalysis?.specialty || 'Sin clasificar';

      if (!specialtyMap.has(specialty)) {
        specialtyMap.set(specialty, { correct: 0, total: 0 });
      }

      const stats = specialtyMap.get(specialty)!;
      stats.total++;
      if (answer.isCorrect) {
        stats.correct++;
      }
    });

    return Array.from(specialtyMap.entries()).map(([specialty, stats]) => ({
      specialty,
      correct: stats.correct,
      total: stats.total,
      percentage: (stats.correct / stats.total) * 100
    }));
  }

  /**
   * Calcula la evolución del rendimiento a lo largo del tiempo
   */
  private calculatePerformanceEvolution(exams: any[]) {
    const evolution = exams.map((exam, index) => ({
      examNumber: index + 1,
      completedAt: exam.completedAt,
      score: exam.score || 0,
      percentage: ((exam.correctAnswers || 0) / exam.totalQuestions) * 100,
      timeSpentSecs: exam.timeSpentSecs,
      performanceBySpecialty: this.calculatePerformanceBySpecialty(exam.answers)
    }));

    return {
      totalExams: exams.length,
      evolution,
      firstExamScore: evolution[0]?.percentage || 0,
      lastExamScore: evolution[evolution.length - 1]?.percentage || 0,
      averageScore: evolution.reduce((sum, e) => sum + e.percentage, 0) / evolution.length,
      trend: this.calculateTrend(evolution.map(e => e.percentage))
    };
  }

  /**
   * Calcula la tendencia (mejorando, estable, declinando)
   */
  private calculateTrend(scores: number[]): 'MEJORANDO' | 'ESTABLE' | 'DECLINANDO' {
    if (scores.length < 2) return 'ESTABLE';

    // Comparar últimos 3 ensayos con primeros 3 ensayos
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));

    const avgFirst = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;

    if (diff > 5) return 'MEJORANDO';
    if (diff < -5) return 'DECLINANDO';
    return 'ESTABLE';
  }

  /**
   * Genera resumen individual usando GPT
   */
  private async generateIndividualSummary(
    score: number,
    totalQuestions: number,
    strengths: string[],
    mediumPerformance: string[],
    weaknesses: string[]
  ): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
    const percentage = (score / totalQuestions) * 100;

    const prompt = `Eres un tutor médico que analiza el rendimiento de un estudiante en un ensayo EUNACOM.

DATOS DEL ENSAYO:
- Puntaje: ${score}/${totalQuestions} (${percentage.toFixed(1)}%)
- Especialidades fuertes (>70%): ${strengths.join(', ') || 'Ninguna'}
- Especialidades medias (50-70%): ${mediumPerformance.join(', ') || 'Ninguna'}
- Especialidades débiles (<50%): ${weaknesses.join(', ') || 'Ninguna'}

TAREA:
Genera un diagnóstico conciso de máximo 300 caracteres que:
1. Felicite brevemente si hay especialidades fuertes
2. Señale las áreas de mayor debilidad
3. De una recomendación de estudio específica

El tono debe ser motivador pero realista. Enfócate en lo más importante.

Responde solo con el texto del diagnóstico (sin comillas, sin JSON, solo el texto).`;

    const startTime = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor médico experto que da retroalimentación concisa y motivadora.'
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 150,
      temperature: 0.7
    });

    const content = response.choices[0].message.content || '';

    return {
      content: content.substring(0, 300), // Asegurar límite de 300 caracteres
      tokensIn: response.usage?.prompt_tokens || 0,
      tokensOut: response.usage?.completion_tokens || 0
    };
  }

  /**
   * Genera resumen evolutivo usando GPT
   */
  private async generateEvolutionarySummary(
    evolution: any
  ): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
    const { totalExams, firstExamScore, lastExamScore, averageScore, trend } = evolution;
    const improvement = lastExamScore - firstExamScore;

    // Identificar especialidades que mejoraron o empeoraron
    const specialtyTrends = this.analyzeSpecialtyTrends(evolution.evolution);

    const prompt = `Eres un tutor médico que analiza la evolución de un estudiante en múltiples ensayos EUNACOM.

DATOS DE EVOLUCIÓN:
- Total de ensayos: ${totalExams}
- Primer ensayo: ${firstExamScore.toFixed(1)}%
- Último ensayo: ${lastExamScore.toFixed(1)}%
- Promedio general: ${averageScore.toFixed(1)}%
- Tendencia: ${trend}
- Mejora total: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%

ESPECIALIDADES QUE MEJORARON:
${specialtyTrends.improving.join(', ') || 'Ninguna destacable'}

ESPECIALIDADES QUE EMPEORARON:
${specialtyTrends.declining.join(', ') || 'Ninguna'}

TAREA:
Genera un análisis evolutivo de máximo 400 caracteres que:
1. Comente la tendencia general (mejorando/estable/declinando)
2. Destaque especialidades que mejoraron
3. Señale áreas que requieren más atención
4. De una recomendación estratégica para continuar

El tono debe ser motivador y orientado a la acción.

Responde solo con el texto del análisis (sin comillas, sin JSON, solo el texto).`;

    const startTime = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor médico experto que analiza la evolución del aprendizaje.'
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 200,
      temperature: 0.7
    });

    const content = response.choices[0].message.content || '';

    return {
      content: content.substring(0, 400), // Asegurar límite de 400 caracteres
      tokensIn: response.usage?.prompt_tokens || 0,
      tokensOut: response.usage?.completion_tokens || 0
    };
  }

  /**
   * Analiza tendencias por especialidad
   */
  private analyzeSpecialtyTrends(evolution: any[]) {
    if (evolution.length < 2) {
      return { improving: [], declining: [] };
    }

    const firstExam = evolution[0];
    const lastExam = evolution[evolution.length - 1];

    const improving: string[] = [];
    const declining: string[] = [];

    // Comparar especialidades entre primer y último ensayo
    const firstSpecialties = new Map(
      firstExam.performanceBySpecialty.map((s: any) => [s.specialty, s.percentage])
    );

    lastExam.performanceBySpecialty.forEach((s: any) => {
      const firstPercentage = firstSpecialties.get(s.specialty);
      if (firstPercentage !== undefined && typeof s.percentage === 'number') {
        const diff = Number(s.percentage) - Number(firstPercentage);
        if (diff > 15) {
          improving.push(s.specialty);
        } else if (diff < -15) {
          declining.push(s.specialty);
        }
      }
    });

    return { improving, declining };
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();
