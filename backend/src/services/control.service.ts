import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CreateControlPackageDto {
  name: string;
  description?: string;
  price: number;
  controlQty: number;
}

export interface PurchaseControlPackageDto {
  userId: string;
  packageId: string;
  paymentId?: string;
}

export interface StartControlDto {
  userId: string;
  purchaseId: string;
  specialtyId?: string; // Opcional: filtrar por especialidad
}

export interface SubmitAnswerDto {
  controlId: string;
  variationId: string;
  selectedAnswer: string;
}

export class ControlService {
  /**
   * Crear un paquete de controles (ADMIN)
   */
  async createPackage(data: CreateControlPackageDto) {
    return await prisma.controlPackage.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        controlQty: data.controlQty,
      },
    });
  }

  /**
   * Listar paquetes activos
   */
  async listPackages() {
    return await prisma.controlPackage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Comprar un paquete de controles
   */
  async purchasePackage(data: PurchaseControlPackageDto) {
    const pkg = await prisma.controlPackage.findUnique({
      where: { id: data.packageId },
    });

    if (!pkg) {
      throw new Error('Paquete no encontrado');
    }

    return await prisma.controlPurchase.create({
      data: {
        userId: data.userId,
        packageId: data.packageId,
        paymentId: data.paymentId,
        controlsTotal: pkg.controlQty,
        controlsUsed: 0,
        status: 'ACTIVE',
      },
      include: {
        package: true,
      },
    });
  }

  /**
   * Obtener compras de controles de un usuario
   */
  async getUserPurchases(userId: string) {
    return await prisma.controlPurchase.findMany({
      where: { userId },
      include: {
        package: true,
        controls: {
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  /**
   * Seleccionar 15 preguntas aleatorias visibles
   */
  private async selectRandomQuestions(count: number = 15, specialtyId?: string) {
    // Primero, si hay especialidad, buscar su nombre
    let specialtyName: string | undefined;
    if (specialtyId) {
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId },
      });
      specialtyName = specialty?.name;
    }

    // Obtener todas las variaciones visibles (última versión)
    const allVariations = await prisma.questionVariation.findMany({
      where: {
        isVisible: true,
      },
      include: {
        alternatives: {
          orderBy: { order: 'asc' },
        },
        baseQuestion: {
          include: {
            aiAnalysis: true,
          },
        },
      },
    });

    // Agrupar por baseQuestionId + variationNumber para deduplicar versiones
    const variationMap = new Map();
    for (const variation of allVariations) {
      const key = `${variation.baseQuestionId}-${variation.variationNumber}`;
      const existing = variationMap.get(key);
      
      // Quedarse con la versión más reciente
      if (!existing || variation.version > existing.version) {
        variationMap.set(key, variation);
      }
    }

    let uniqueVariations = Array.from(variationMap.values());

    // Filtrar por especialidad si se especificó
    if (specialtyName) {
      uniqueVariations = uniqueVariations.filter((variation) => {
        const aiAnalysis = variation.baseQuestion.aiAnalysis;
        if (!aiAnalysis) return false;
        
        // Comparar specialty (case insensitive)
        return aiAnalysis.specialty?.toLowerCase() === specialtyName.toLowerCase();
      });
      
      logger.info(`Filtrado por especialidad '${specialtyName}': ${uniqueVariations.length} variaciones encontradas`);
    }

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
   * Iniciar un nuevo control
   */
  async startControl(data: StartControlDto) {
    // Verificar que el usuario tiene controles disponibles
    const purchase = await prisma.controlPurchase.findUnique({
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

    if (purchase.controlsUsed >= purchase.controlsTotal) {
      throw new Error('No tienes controles disponibles');
    }

    // Seleccionar 15 preguntas aleatorias (con filtro de especialidad opcional)
    const questions = await this.selectRandomQuestions(15, data.specialtyId);

    // Crear el control
    const control = await prisma.control.create({
      data: {
        purchaseId: data.purchaseId,
        userId: data.userId,
        status: 'IN_PROGRESS',
        totalQuestions: 15,
      },
    });

    // Crear las preguntas del control
    await prisma.controlQuestion.createMany({
      data: questions.map((q, index) => ({
        controlId: control.id,
        variationId: q.id,
        questionOrder: index + 1,
      })),
    });

    // Incrementar controles usados
    await prisma.controlPurchase.update({
      where: { id: data.purchaseId },
      data: { controlsUsed: { increment: 1 } },
    });

    logger.info(`Control ${control.id} iniciado por usuario ${data.userId}`);

    return await this.getControl(control.id, data.userId);
  }

  /**
   * Obtener un control con sus preguntas
   */
  async getControl(controlId: string, userId: string) {
    const control = await prisma.control.findUnique({
      where: { id: controlId },
      include: {
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
                baseQuestion: {
                  include: {
                    aiAnalysis: true,
                  },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
        answers: true,
      },
    });

    if (!control) {
      throw new Error('Control no encontrado');
    }

    if (control.userId !== userId) {
      throw new Error('No autorizado');
    }

    return control;
  }

  /**
   * Responder una pregunta del control
   */
  async submitAnswer(data: SubmitAnswerDto, userId: string) {
    const control = await prisma.control.findUnique({
      where: { id: data.controlId },
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

    if (!control) {
      throw new Error('Control no encontrado');
    }

    if (control.userId !== userId) {
      throw new Error('No autorizado');
    }

    if (control.status !== 'IN_PROGRESS') {
      throw new Error('El control ya fue completado');
    }

    // Encontrar la variación y verificar la respuesta
    const question = control.questions.find(q => q.variationId === data.variationId);
    if (!question) {
      throw new Error('Pregunta no encontrada en este control');
    }

    const correctAlternative = question.variation.alternatives.find(a => a.isCorrect);
    if (!correctAlternative) {
      throw new Error('No se encontró la respuesta correcta');
    }

    const isCorrect = correctAlternative.text === data.selectedAnswer || 
                      correctAlternative.order.toString() === data.selectedAnswer ||
                      String.fromCharCode(65 + correctAlternative.order) === data.selectedAnswer;

    // Guardar o actualizar la respuesta
    await prisma.controlAnswer.upsert({
      where: {
        controlId_variationId: {
          controlId: data.controlId,
          variationId: data.variationId,
        },
      },
      create: {
        controlId: data.controlId,
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
   * Completar un control y calcular el puntaje
   */
  async completeControl(controlId: string, userId: string) {
    const control = await prisma.control.findUnique({
      where: { id: controlId },
      include: {
        answers: true,
        questions: true,
      },
    });

    if (!control) {
      throw new Error('Control no encontrado');
    }

    if (control.userId !== userId) {
      throw new Error('No autorizado');
    }

    if (control.status !== 'IN_PROGRESS') {
      throw new Error('El control ya fue completado');
    }

    // Calcular puntaje
    const correctAnswers = control.answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctAnswers / control.totalQuestions) * 100);
    
    // Calcular tiempo transcurrido
    const timeSpentSecs = Math.floor((Date.now() - control.startedAt.getTime()) / 1000);

    // Actualizar control
    await prisma.control.update({
      where: { id: controlId },
      data: {
        status: 'COMPLETED',
        score,
        correctAnswers,
        completedAt: new Date(),
        timeSpentSecs,
      },
    });

    logger.info(`Control ${controlId} completado - Puntaje: ${score}% (${correctAnswers}/${control.totalQuestions})`);

    return await this.getControlResults(controlId, userId);
  }

  /**
   * Obtener resultados de un control completado
   */
  async getControlResults(controlId: string, userId: string) {
    const control = await prisma.control.findUnique({
      where: { id: controlId },
      include: {
        questions: {
          include: {
            variation: {
              include: {
                alternatives: {
                  orderBy: { order: 'asc' },
                },
                baseQuestion: {
                  include: {
                    aiAnalysis: true,
                  },
                },
              },
            },
          },
          orderBy: { questionOrder: 'asc' },
        },
        answers: true,
        purchase: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!control) {
      throw new Error('Control no encontrado');
    }

    if (control.userId !== userId) {
      throw new Error('No autorizado');
    }

    return control;
  }

  /**
   * Listar controles de un usuario
   */
  async listUserControls(userId: string) {
    return await prisma.control.findMany({
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

export const controlService = new ControlService();

