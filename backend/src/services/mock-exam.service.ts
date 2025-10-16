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
   * Seleccionar preguntas aleatorias para un ensayo RESPETANDO LA DISTRIBUCIÓN EUNACOM
   * Usa mockExamPercentage de cada topic para calcular cuántas preguntas seleccionar
   */
  private async selectRandomQuestions(count: number = 180) {
    logger.info(`🎯 Generando ensayo EUNACOM con distribución de ${count} preguntas`);

    // 1. Obtener todos los topics con porcentaje asignado
    const topicsWithPercentage = await prisma.topic.findMany({
      where: {
        mockExamPercentage: { not: null },
      },
      select: {
        id: true,
        name: true,
        mockExamPercentage: true,
      },
    });

    if (topicsWithPercentage.length === 0) {
      logger.warn('⚠️  No hay topics con porcentaje asignado, usando selección aleatoria');
      return await this.selectRandomQuestionsLegacy(count);
    }

    // 2. Calcular cuántas preguntas necesitamos de cada topic
    const topicDistribution = topicsWithPercentage.map((topic) => {
      const percentage = topic.mockExamPercentage!;
      const questionsNeeded = Math.round((percentage / 100) * count);
      return {
        topicId: topic.id,
        topicName: topic.name,
        percentage,
        questionsNeeded,
      };
    });

    logger.info(`📊 Distribución calculada para ${topicDistribution.length} topics`);

    // 3. Para cada topic, seleccionar preguntas aleatorias
    const selectedVariations: any[] = [];

    for (const dist of topicDistribution) {
      if (dist.questionsNeeded === 0) continue;

      logger.info(`   - ${dist.topicName}: buscando ${dist.questionsNeeded} preguntas (${dist.percentage}%)`);

      // Obtener todas las preguntas de este topic
      const topicQuestions = await prisma.question.findMany({
        where: {
          topicId: dist.topicId,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (topicQuestions.length === 0) {
        logger.warn(`   ⚠️  Topic "${dist.topicName}" no tiene preguntas, saltando`);
        continue;
      }

      // Obtener variaciones activas para estas preguntas
      const variations = await prisma.questionVariation.findMany({
        where: {
          baseQuestion: {
            id: { in: topicQuestions.map((q) => q.id) },
            topicId: dist.topicId,
            isActive: true,
          },
          isVisible: true,
        },
        select: {
          id: true,
          baseQuestionId: true,
          variationNumber: true,
          version: true,
        },
      });

      // Deduplicar: mantener solo la versión más reciente de cada variación
      const variationMap = new Map<string, typeof variations[0]>();
      for (const variation of variations) {
        const key = `${variation.baseQuestionId}-${variation.variationNumber}`;
        const existing = variationMap.get(key);

        if (!existing || variation.version > existing.version) {
          variationMap.set(key, variation);
        }
      }

      const uniqueVariations = Array.from(variationMap.values());

      if (uniqueVariations.length < dist.questionsNeeded) {
        logger.warn(`   ⚠️  Topic "${dist.topicName}": solo ${uniqueVariations.length} preguntas disponibles, se necesitan ${dist.questionsNeeded}`);
      }

      // Seleccionar aleatoriamente
      const shuffled = uniqueVariations.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(dist.questionsNeeded, uniqueVariations.length));

      logger.info(`   ✅ ${dist.topicName}: ${selected.length} preguntas seleccionadas`);
      selectedVariations.push(...selected);
    }

    if (selectedVariations.length < count) {
      logger.warn(`⚠️  Solo se pudieron seleccionar ${selectedVariations.length} de ${count} preguntas según distribución`);

      // Completar con preguntas aleatorias si faltan
      const missing = count - selectedVariations.length;
      if (missing > 0) {
        logger.info(`   Completando con ${missing} preguntas aleatorias adicionales`);
        const additionalQuestions = await this.selectRandomQuestionsLegacy(missing);
        selectedVariations.push(...additionalQuestions);
      }
    }

    // 4. Mezclar el orden final de todas las preguntas
    const finalShuffled = selectedVariations.sort(() => Math.random() - 0.5);
    logger.info(`✅ Ensayo generado: ${finalShuffled.length} preguntas con distribución EUNACOM`);

    return finalShuffled.slice(0, count);
  }

  /**
   * Método legacy: selección aleatoria sin distribución (fallback)
   */
  private async selectRandomQuestionsLegacy(count: number) {
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
    });

    // Deduplicar
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

