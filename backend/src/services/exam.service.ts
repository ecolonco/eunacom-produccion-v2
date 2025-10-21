/**
 * Servicio para gestionar el sistema de Pruebas (45 preguntas)
 */

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// DTOs
export interface StartExamDto {
  userId: string;
  purchaseId: string;
}

export interface SubmitExamAnswerDto {
  examId: string;
  userId: string;
  variationId: string;
  selectedAnswer: string;
}

class ExamService {
  /**
   * Listar paquetes de pruebas disponibles
   */
  async listPackages() {
    return await prisma.examPackage.findMany({
      where: { isActive: true },
      orderBy: { examQty: 'asc' },
    });
  }

  /**
   * Obtener compras de pruebas de un usuario
   */
  async getUserPurchases(userId: string) {
    return await prisma.examPurchase.findMany({
      where: { userId },
      include: {
        package: true,
      },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  /**
   * Seleccionar preguntas aleatorias para una prueba
   */
  private async selectRandomQuestions(count: number = 45) {
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
      
      // Quedarse con la versión más reciente
      if (!existing || variation.version > existing.version) {
        variationMap.set(key, variation);
      }
    }

    const uniqueVariations = Array.from(variationMap.values());

    // Validar que hay suficientes preguntas
    if (uniqueVariations.length < count) {
      logger.warn(`Solo hay ${uniqueVariations.length} variaciones disponibles, se necesitan ${count}`);
      throw new Error(`No hay suficientes preguntas disponibles. Se necesitan ${count}, solo hay ${uniqueVariations.length}`);
    }

    // Mezclar aleatoriamente y tomar las primeras 'count'
    const shuffled = uniqueVariations.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Iniciar una nueva prueba
   */
  async startExam(data: StartExamDto) {
    // Verificar que el usuario tiene pruebas disponibles
    const purchase = await prisma.examPurchase.findUnique({
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

    if (purchase.examsUsed >= purchase.examsTotal) {
      throw new Error('No tienes pruebas disponibles');
    }

    // Seleccionar 45 preguntas aleatorias
    const questions = await this.selectRandomQuestions(45);

    console.log(`📝 Creando prueba con ${questions.length} preguntas...`);

    // Crear la prueba
    const exam = await prisma.exam.create({
      data: {
        purchaseId: data.purchaseId,
        userId: data.userId,
        status: 'IN_PROGRESS',
        totalQuestions: 45,
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

    // Incrementar el contador de pruebas usadas
    await prisma.examPurchase.update({
      where: { id: data.purchaseId },
      data: { examsUsed: { increment: 1 } },
    });

    logger.info(`Prueba creada: ${exam.id} para usuario ${data.userId}`);
    return exam;
  }

  /**
   * Obtener una prueba específica
   */
  async getExam(examId: string, userId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
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

    if (!exam) {
      throw new Error('Prueba no encontrada');
    }

    if (exam.userId !== userId) {
      throw new Error('No autorizado');
    }

    return exam;
  }

  /**
   * Responder una pregunta de la prueba
   */
  async answerQuestion(data: SubmitExamAnswerDto) {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
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

    if (!exam) {
      throw new Error('Prueba no encontrada');
    }

    if (exam.userId !== data.userId) {
      throw new Error('No autorizado');
    }

    if (exam.status !== 'IN_PROGRESS') {
      throw new Error('La prueba ya ha sido completada');
    }

    // Buscar la pregunta
    const question = exam.questions.find((q) => q.variationId === data.variationId);
    if (!question) {
      throw new Error('Pregunta no encontrada en esta prueba');
    }

    // Determinar si la respuesta es correcta
    const correctAlternative = question.variation.alternatives.find((alt) => alt.isCorrect);
    if (!correctAlternative) {
      throw new Error('No se encontró la respuesta correcta');
    }

    const isCorrect = data.selectedAnswer === correctAlternative.text || 
                      data.selectedAnswer === String.fromCharCode(65 + correctAlternative.order);

    // Guardar la respuesta (upsert para permitir modificaciones)
    await prisma.examAnswer.upsert({
      where: {
        examId_variationId: {
          examId: data.examId,
          variationId: data.variationId,
        },
      },
      create: {
        examId: data.examId,
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
   * Completar la prueba y calcular resultados
   */
  async completeExam(examId: string, userId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
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

    if (!exam) {
      throw new Error('Prueba no encontrada');
    }

    if (exam.userId !== userId) {
      throw new Error('No autorizado');
    }

    if (exam.status === 'COMPLETED') {
      return exam; // Ya completada
    }

    // Calcular respuestas correctas
    const correctAnswers = exam.answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / exam.totalQuestions) * 100);

    // Calcular tiempo transcurrido
    const timeSpentSecs = Math.floor((Date.now() - exam.startedAt.getTime()) / 1000);

    // Actualizar la prueba
    const updatedExam = await prisma.exam.update({
      where: { id: examId },
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

    logger.info(`Prueba completada: ${examId} - ${correctAnswers}/${exam.totalQuestions} correctas`);
    return updatedExam;
  }

  /**
   * Obtener resultados de una prueba
   */
  async getExamResults(examId: string, userId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
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

    if (!exam) {
      throw new Error('Prueba no encontrada');
    }

    if (exam.userId !== userId) {
      throw new Error('No autorizado');
    }

    if (exam.status !== 'COMPLETED') {
      throw new Error('La prueba aún no ha sido completada');
    }

    return exam;
  }

  /**
   * Listar pruebas de un usuario
   */
  async listUserExams(userId: string) {
    return await prisma.exam.findMany({
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

export const examService = new ExamService();

