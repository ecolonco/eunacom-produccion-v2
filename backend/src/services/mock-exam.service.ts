/**
 * Servicio para gestionar el sistema de Ensayos EUNACOM (180 preguntas)
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// DTOs
export interface StartMockExamDto {
  userId: string;
  purchaseId: string;
}

export interface SubmitMockExamAnswerDto {
  mockExamId: string;
  userId: string;
  variationId: string;
  selectedAnswer: string;
}

class MockExamService {
  /**
   * Listar paquetes de ensayos disponibles
   */
  async listPackages() {
    return await prisma.mockExamPackage.findMany({
      where: { isActive: true },
      orderBy: { mockExamQty: 'asc' },
    });
  }

  /**
   * Obtener compras de ensayos de un usuario
   */
  async getUserPurchases(userId: string) {
    return await prisma.mockExamPurchase.findMany({
      where: { userId },
      include: {
        package: true,
      },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  /**
   * Seleccionar preguntas aleatorias para un ensayo
   */
  private async selectRandomQuestions(count: number = 180) {
    // Obtener todas las variaciones activas y visibles
    const allVariations = await prisma.questionVariation.findMany({
      where: {
        isVisible: true,
      },
      select: {
        id: true,
        baseQuestionId: true,
        variationNumber: true,
        version: true,
      },
      orderBy: [
        { baseQuestion: { displaySequence: 'asc' } },
        { variationNumber: 'asc' },
      ],
    });

    // Deduplicar: mantener solo la versión más reciente de cada variación
    const variationMap = new Map<string, typeof allVariations[0]>();
    for (const variation of allVariations) {
      const key = `${variation.baseQuestionId}-${variation.variationNumber}`;
      const existing = variationMap.get(key);
      
      if (!existing || variation.version > existing.version) {
        variationMap.set(key, variation);
      }
    }

    const uniqueVariations = Array.from(variationMap.values());

    if (uniqueVariations.length < count) {
      logger.warn(`Solo hay ${uniqueVariations.length} variaciones disponibles, se necesitan ${count}`);
      throw new Error(`No hay suficientes preguntas disponibles. Se necesitan ${count}, solo hay ${uniqueVariations.length}`);
    }

    // Mezclar aleatoriamente y tomar las primeras 'count'
    const shuffled = uniqueVariations.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Iniciar un nuevo ensayo
   */
  async startMockExam(data: StartMockExamDto) {
    const purchase = await prisma.mockExamPurchase.findUnique({
      where: { id: data.purchaseId },
      include: { package: true },
    });

    if (!purchase) {
      throw new Error('Compra no encontrada');
    }

    if (purchase.userId !== data.userId) {
      throw new Error('No autorizado');
    }

    if (purchase.status !== 'ACTIVE') {
      throw new Error('La compra no está activa');
    }

    if (purchase.mockExamsUsed >= purchase.mockExamsTotal) {
      throw new Error('No tienes ensayos disponibles');
    }

    // Seleccionar 180 preguntas aleatorias
    const questions = await this.selectRandomQuestions(180);

    console.log(`📝 Creando ensayo EUNACOM con ${questions.length} preguntas...`);

    // Crear el ensayo
    const mockExam = await prisma.mockExam.create({
      data: {
        purchaseId: data.purchaseId,
        userId: data.userId,
        status: 'IN_PROGRESS',
        totalQuestions: 180,
        questions: {
          create: questions.map((q, index) => ({
            variationId: q.id,
            questionOrder: index + 1,
          })),
        },
      },
      include: {
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
        answers: true,
      },
    });

    // Incrementar el contador de ensayos usados
    await prisma.mockExamPurchase.update({
      where: { id: data.purchaseId },
      data: { mockExamsUsed: { increment: 1 } },
    });

    logger.info(`Ensayo EUNACOM creado: ${mockExam.id} para usuario ${data.userId}`);
    return mockExam;
  }

  /**
   * Obtener un ensayo específico
   */
  async getMockExam(mockExamId: string, userId: string) {
    const mockExam = await prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: {
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
        answers: true,
      },
    });

    if (!mockExam) {
      throw new Error('Ensayo no encontrado');
    }

    if (mockExam.userId !== userId) {
      throw new Error('No autorizado');
    }

    return mockExam;
  }

  /**
   * Responder una pregunta del ensayo
   */
  async answerQuestion(data: SubmitMockExamAnswerDto) {
    const mockExam = await prisma.mockExam.findUnique({
      where: { id: data.mockExamId },
      include: {
        questions: {
          include: {
            variation: {
              include: {
                alternatives: true,
              },
            },
          },
        },
      },
    });

    if (!mockExam) {
      throw new Error('Ensayo no encontrado');
    }

    if (mockExam.userId !== data.userId) {
      throw new Error('No autorizado');
    }

    if (mockExam.status !== 'IN_PROGRESS') {
      throw new Error('El ensayo ya ha sido completado');
    }

    const question = mockExam.questions.find((q) => q.variationId === data.variationId);
    if (!question) {
      throw new Error('Pregunta no encontrada en este ensayo');
    }

    const correctAlternative = question.variation.alternatives.find((alt) => alt.isCorrect);
    if (!correctAlternative) {
      throw new Error('No se encontró la respuesta correcta');
    }

    const isCorrect = data.selectedAnswer === correctAlternative.text || 
                      data.selectedAnswer === String.fromCharCode(65 + correctAlternative.order);

    await prisma.mockExamAnswer.upsert({
      where: {
        mockExamId_variationId: {
          mockExamId: data.mockExamId,
          variationId: data.variationId,
        },
      },
      create: {
        mockExamId: data.mockExamId,
        variationId: data.variationId,
        selectedAnswer: data.selectedAnswer,
        isCorrect,
      },
      update: {
        selectedAnswer: data.selectedAnswer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    return { success: true, isCorrect };
  }

  /**
   * Completar el ensayo y calcular resultados
   */
  async completeMockExam(mockExamId: string, userId: string) {
    const mockExam = await prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: {
        answers: true,
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
      },
    });

    if (!mockExam) {
      throw new Error('Ensayo no encontrado');
    }

    if (mockExam.userId !== userId) {
      throw new Error('No autorizado');
    }

    if (mockExam.status === 'COMPLETED') {
      return mockExam;
    }

    const correctAnswers = mockExam.answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / mockExam.totalQuestions) * 100);
    const timeSpentSecs = Math.floor((Date.now() - mockExam.startedAt.getTime()) / 1000);

    const updatedMockExam = await prisma.mockExam.update({
      where: { id: mockExamId },
      data: {
        status: 'COMPLETED',
        correctAnswers,
        score,
        completedAt: new Date(),
        timeSpentSecs,
      },
      include: {
        answers: true,
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
      },
    });

    logger.info(`Ensayo EUNACOM completado: ${mockExamId} - ${correctAnswers}/${mockExam.totalQuestions} correctas`);
    return updatedMockExam;
  }

  /**
   * Obtener resultados de un ensayo
   */
  async getMockExamResults(mockExamId: string, userId: string) {
    const mockExam = await prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: {
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
        answers: true,
      },
    });

    if (!mockExam) {
      throw new Error('Ensayo no encontrado');
    }

    if (mockExam.userId !== userId) {
      throw new Error('No autorizado');
    }

    if (mockExam.status !== 'COMPLETED') {
      throw new Error('El ensayo aún no ha sido completado');
    }

    return mockExam;
  }

  /**
   * Listar ensayos de un usuario
   */
  async listUserMockExams(userId: string) {
    return await prisma.mockExam.findMany({
      where: { userId },
      include: {
        purchase: {
          include: {
            package: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}

export const mockExamService = new MockExamService();

