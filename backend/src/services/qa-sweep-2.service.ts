import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { OpenAIService } from './openai.service';

export interface QASweep2Config {
  name: string;
  description?: string;
  batchSize: number;
  maxConcurrency: number;
  specialty?: string;
  topic?: string;
  modelEval: string;
  modelFix: string;
  // Nuevo: rango de ejercicios base
  baseQuestionFrom?: number;
  baseQuestionTo?: number;
}

export interface ExerciseData {
  id: string;
  displayCode?: string;
  especialidad: string;
  tema: string;
  nivel: string;
  enunciado: string;
  alternativas: { [key: string]: string };
  respuesta_correcta: string;
  explicaciones: { [key: string]: string };
  explicacion_global: string;
}

export class QASweep2Service {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  /**
   * Worker loop: claim and process pending runs continuously
   */
  async workerLoop(pollMs: number = 3000): Promise<void> {
    // simple loop; stops only on process exit
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const run = await prisma.qASweep2Run.updateMany({
          data: { status: 'RUNNING' },
          where: { status: 'PENDING' },
        });
        // If someone else claimed concurrently, updateMany>0 tells us there is at least one; pick one
        const next = await prisma.qASweep2Run.findFirst({ where: { status: 'RUNNING' }, orderBy: { createdAt: 'asc' } });
        if (!next) {
          await new Promise(r => setTimeout(r, pollMs));
          continue;
        }

        // Process this run (pagination inside analyzeVariations)
        await this.startAnalysis(next.id);
      } catch (err) {
        logger.error('Worker loop error:', err);
        await new Promise(r => setTimeout(r, pollMs));
      }
    }
  }

  /**
   * Crea una nueva versión de la variación aplicando correcciones y desactiva la anterior
   */
  async applyCorrectionsAsNewVersion(variationId: string, corrections: any): Promise<{ newVariationId: string }> {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.questionVariation.findUnique({
        where: { id: variationId },
        include: { alternatives: true, baseQuestion: { include: { aiAnalysis: true } } }
      });
      if (!original) throw new Error('Original variation not found');

      const parentVersionId = original.parentVersionId ?? original.id;
      const nextVersion = (original.version ?? 1) + 1;

      // Crear nueva versión visible
      const newVariation = await tx.questionVariation.create({
        data: {
          baseQuestionId: original.baseQuestionId,
          difficulty: original.difficulty,
          variationNumber: original.variationNumber,
          content: corrections.enunciado_corregido ?? original.content,
          explanation: corrections.explicacion_global ?? original.explanation,
          displayCode: original.displayCode,
          version: nextVersion,
          isVisible: true,
          modifiedAt: new Date(),
          parentVersionId
        }
      });

      // Crear alternativas corregidas
      const letters = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const text = corrections.alternativas?.[letter] ?? original.alternatives[i]?.text ?? '';
        const isCorrect = (corrections.respuesta_correcta ?? '').toUpperCase() === letter;
        const explanation = corrections.explicaciones?.[letter] ?? original.alternatives[i]?.explanation ?? null;
        await tx.alternative.create({
          data: {
            variationId: newVariation.id,
            text,
            isCorrect,
            explanation,
            order: i
          }
        });
      }

      // Desactivar original
      await tx.questionVariation.update({
        where: { id: original.id },
        data: { isVisible: false, modifiedAt: new Date() }
      });

      // Optional: update baseQuestion.aiAnalysis if corrections include new taxonomy
      // Validate against Specialty/Topic tables; apply only if valid
      const inferTaxonomy = (): { specialty?: string; topic?: string } => {
        const text = `${original.content} ${corrections?.enunciado_corregido || ''}`.toLowerCase();
        if (text.includes('citolog') && text.includes('anal')) {
          // Caso típico de VPH/citología anal
          return { specialty: 'Medicina Interna', topic: 'Infectologia' };
        }
        return {};
      };

      const desired: { specialty?: string; topic?: string } = {
        specialty: corrections?.specialty,
        topic: corrections?.topic,
        ...(!corrections?.specialty && !corrections?.topic ? inferTaxonomy() : {})
      };

      if (desired.specialty || desired.topic) {
        // Validate names against catalog
        let validSpecialtyName: string | undefined = undefined;
        let validTopicName: string | undefined = undefined;
        const norm = (s?: string) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

        if (desired.specialty) {
          let spec = await tx.specialty.findFirst({
            where: { name: { equals: desired.specialty, mode: 'insensitive' }, isActive: true }
          });
          if (!spec) {
            // Fallback: diacritic-insensitive match in JS
            const allSpecs = await tx.specialty.findMany({ where: { isActive: true } });
            spec = allSpecs.find(s => norm(s.name) === norm(desired.specialty));
          }
          if (spec) {
            validSpecialtyName = spec.name;
            if (desired.topic) {
              let t = await tx.topic.findFirst({
                where: { name: { equals: desired.topic, mode: 'insensitive' }, specialtyId: spec.id }
              });
              if (!t) {
                const allTopics = await tx.topic.findMany({ where: { specialtyId: spec.id } });
                t = allTopics.find(tp => norm(tp.name) === norm(desired.topic));
              }
              if (t) validTopicName = t.name;
            }
          }
        }

        // Apply only if at least specialty is valid; topic optional
        if (validSpecialtyName) {
          await tx.baseQuestion.update({
            where: { id: original.baseQuestionId },
            data: {
              aiAnalysis: {
                upsert: {
                  create: {
                    specialty: validSpecialtyName,
                    topic: validTopicName ?? original.baseQuestion?.aiAnalysis?.topic ?? 'Unknown',
                    difficulty: original.baseQuestion?.aiAnalysis?.difficulty ?? 'MEDIUM',
                    analysisResult: JSON.stringify({ source: 'QA_SWEEP_2', reason: 'AUTO_RECLASSIFIED' })
                  },
                  update: {
                    specialty: validSpecialtyName,
                    topic: validTopicName ?? original.baseQuestion?.aiAnalysis?.topic ?? 'Unknown',
                    difficulty: original.baseQuestion?.aiAnalysis?.difficulty ?? 'MEDIUM',
                    analysisResult: JSON.stringify({ source: 'QA_SWEEP_2', reason: 'AUTO_RECLASSIFIED' })
                  }
                }
              }
            }
          });
        }
      }

      return { newVariationId: newVariation.id };
    });
  }

  /**
   * Crea un nuevo run de QA Sweep 2.0
   */
  async createRun(config: QASweep2Config): Promise<string> {
    try {
      const run = await prisma.qASweep2Run.create({
        data: {
          name: config.name,
          description: config.description,
          status: 'PENDING',
          config: config as any
        }
      });

      logger.info('QA Sweep 2.0 run created', { runId: run.id, config });
      return run.id;
    } catch (error) {
      logger.error('Failed to create QA Sweep 2.0 run:', error);
      throw error;
    }
  }

  /**
   * Obtiene variaciones para análisis
   */
  private async getVariationsForAnalysis(
    specialty?: string,
    topic?: string,
    limit: number = 100,
    baseQuestionFrom?: number,
    baseQuestionTo?: number
  ): Promise<any[]> {
    try {
      let whereConditions: any = {};

      // Filtro por rango de ejercicios base (usando displaySequence)
      if (baseQuestionFrom !== undefined || baseQuestionTo !== undefined) {
        // Primero buscar los IDs de los ejercicios base en el rango
        const baseQuestions = await prisma.baseQuestion.findMany({
          where: {
            displaySequence: {
              ...(baseQuestionFrom !== undefined && { gte: baseQuestionFrom }),
              ...(baseQuestionTo !== undefined && { lte: baseQuestionTo })
            }
          },
          select: { id: true }
        });

        const baseQuestionIds = baseQuestions.map(bq => bq.id);
        
        if (baseQuestionIds.length === 0) {
          logger.warn('No base questions found in range', { baseQuestionFrom, baseQuestionTo });
          return [];
        }

        whereConditions.baseQuestionId = { in: baseQuestionIds };
        
        logger.info('Filtering by base question range', {
          from: baseQuestionFrom,
          to: baseQuestionTo,
          baseQuestionsFound: baseQuestionIds.length,
          expectedVariations: baseQuestionIds.length * 4
        });
      }

      // Filtro por especialidad/tema
      if (specialty || topic) {
        if (!whereConditions.baseQuestion) {
          whereConditions.baseQuestion = { aiAnalysis: {} };
        } else {
          whereConditions.baseQuestion.aiAnalysis = {};
        }
        
        if (specialty) {
          whereConditions.baseQuestion.aiAnalysis.specialty = specialty;
        }
        if (topic) {
          whereConditions.baseQuestion.aiAnalysis.topic = topic;
        }
      }

      const variations = await prisma.questionVariation.findMany({
        where: whereConditions,
        include: {
          alternatives: {
            orderBy: { order: 'asc' }
          },
          baseQuestion: {
            include: {
              aiAnalysis: true
            }
          }
        },
        take: limit,
        orderBy: { baseQuestion: { displaySequence: 'asc' }, variationNumber: 'asc' }
      });

      logger.info('Variations fetched for analysis', {
        total: variations.length,
        specialty,
        topic,
        baseQuestionFrom,
        baseQuestionTo
      });

      return variations;
    } catch (error) {
      logger.error('Failed to get variations for analysis:', error);
      throw error;
    }
  }

  /**
   * Convierte una variación a formato de ejercicio
   */
  private variationToExerciseData(variation: any): ExerciseData {
    const alternatives: { [key: string]: string } = {};
    const explanationsByAlt: { [key: string]: string } = {};
    let correctAnswer = '';

    variation.alternatives.forEach((alt: any, index: number) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, D
      alternatives[letter] = alt.text;
      if (alt.explanation) {
        explanationsByAlt[letter] = alt.explanation;
      }
      if (alt.isCorrect) {
        correctAnswer = letter;
      }
    });

    return {
      id: variation.id,
      displayCode: variation.displayCode,
      especialidad: variation.baseQuestion.aiAnalysis?.specialty || 'Unknown',
      tema: variation.baseQuestion.aiAnalysis?.topic || 'Unknown',
      nivel: variation.difficulty || 'medio',
      enunciado: variation.content,
      alternativas: alternatives,
      respuesta_correcta: correctAnswer,
      explicaciones: explanationsByAlt,
      explicacion_global: variation.explanation || ''
    };
  }

  /**
   * Inicia el análisis de variaciones
   */
  async startAnalysis(runId: string, variationIds?: string[]): Promise<void> {
    try {
      // Actualizar estado del run
      await prisma.qASweep2Run.update({
        where: { id: runId },
        data: { status: 'RUNNING' }
      });

      // Obtener configuración
      const run = await prisma.qASweep2Run.findUnique({
        where: { id: runId }
      });

      if (!run) {
        throw new Error('Run not found');
      }

      const config = run.config as unknown as QASweep2Config;

      // Obtener variaciones para análisis
      let variations;
      if (variationIds && variationIds.length > 0) {
        variations = await prisma.questionVariation.findMany({
          where: { id: { in: variationIds } },
          include: {
            alternatives: { orderBy: { order: 'asc' } },
            baseQuestion: { include: { aiAnalysis: true } }
          }
        });
      } else {
        variations = await this.getVariationsForAnalysis(
          config.specialty,
          config.topic,
          config.batchSize,
          config.baseQuestionFrom,
          config.baseQuestionTo
        );
      }

      logger.info(`Starting analysis of ${variations.length} variations`, { runId });

      // Procesar variaciones en lotes
      const batchSize = Math.min(config.maxConcurrency, 5); // Máximo 5 concurrentes
      for (let i = 0; i < variations.length; i += batchSize) {
        const batch = variations.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(variation => this.processVariation(runId, variation))
        );

        logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}`, {
          runId,
          processed: Math.min(i + batchSize, variations.length),
          total: variations.length
        });
      }

      // Completar el run
      await prisma.qASweep2Run.update({
        where: { id: runId },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      logger.info('QA Sweep 2.0 analysis completed', { runId });
    } catch (error) {
      logger.error('QA Sweep 2.0 analysis failed:', error);
      
      // Marcar como fallido
      await prisma.qASweep2Run.update({
        where: { id: runId },
        data: { status: 'FAILED' }
      }).catch(() => {}); // Ignorar errores al actualizar

      throw error;
    }
  }

  /**
   * Procesa una variación individual con aplicación automática de correcciones
   */
  private async processVariation(runId: string, variation: any): Promise<void> {
    try {
      // Convertir a formato de ejercicio
      const exerciseData = this.variationToExerciseData(variation);

      // Procesar con OpenAI
      const result = await this.openaiService.processExercise(exerciseData);

      // Calcular confidence score basado en la evaluación
      const confidenceScore = this.calculateConfidenceScore(result.evaluation);

      let newVariationId: string | undefined;
      let appliedTaxonomy: { specialty: string; topic: string } | undefined;

      // AUTO-APLICAR correcciones si existen
      if (result.correction) {
        try {
          // Preparar corrección con taxonomía sugerida
          const correctionWithTaxonomy = {
            ...result.correction,
            specialty: result.evaluation?.specialty_sugerida || undefined,
            topic: result.evaluation?.tema_sugerido || undefined
          };

          // Aplicar como nueva versión
          const applied = await this.applyCorrectionsAsNewVersion(
            variation.id,
            correctionWithTaxonomy
          );
          newVariationId = applied.newVariationId;

          // Obtener taxonomía aplicada
          const refreshed = await prisma.baseQuestion.findUnique({
            where: { id: variation.baseQuestionId },
            include: { aiAnalysis: true }
          });
          if (refreshed?.aiAnalysis) {
            appliedTaxonomy = {
              specialty: refreshed.aiAnalysis.specialty,
              topic: refreshed.aiAnalysis.topic
            };
          }

          logger.info('Correction auto-applied', {
            runId,
            originalVariationId: variation.id,
            newVariationId,
            result: result.result,
            taxonomyChanged: !!correctionWithTaxonomy.specialty
          });
        } catch (applyError) {
          logger.error('Failed to auto-apply correction:', {
            runId,
            variationId: variation.id,
            error: applyError.message
          });
          // Continuar para guardar el resultado aunque falle la aplicación
        }
      }

      // Guardar resultado con información de aplicación
      await prisma.qASweep2Result.create({
        data: {
          runId,
          variationId: variation.id,
          diagnosis: result.evaluation,
          corrections: result.correction,
          finalLabels: result.evaluation.etiquetas || [],
          status: newVariationId ? 'APPLIED' : (result.correction ? 'CORRECTED' : 'ANALYZED'),
          aiModelUsed: result.correction ? 'GPT-4o' : 'GPT-4o-mini',
          confidenceScore,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          latencyMs: result.latencyMs,
          metadata: {
            newVariationId,
            appliedTaxonomy,
            autoApplied: !!newVariationId
          }
        }
      });

      logger.info('Variation processed successfully', {
        runId,
        variationId: variation.id,
        result: result.result,
        confidenceScore,
        autoApplied: !!newVariationId
      });
    } catch (error) {
      logger.error('Failed to process variation:', {
        runId,
        variationId: variation.id,
        error: error.message
      });
      
      // Guardar resultado con error
      await prisma.qASweep2Result.create({
        data: {
          runId,
          variationId: variation.id,
          diagnosis: { error: error.message },
          finalLabels: ['error_procesamiento'],
          status: 'ANALYZED',
          aiModelUsed: 'error',
          confidenceScore: 0,
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: 0
        }
      }).catch(() => {}); // Ignorar errores al guardar
    }
  }

  /**
   * Calcula el score de confianza basado en la evaluación
   */
  private calculateConfidenceScore(evaluation: any): number {
    if (!evaluation.scorecard) return 0;

    const scores = Object.values(evaluation.scorecard) as number[];
    const maxScore = Math.max(...scores);
    
    // Invertir el score (0 = alta confianza, 3 = baja confianza)
    return Math.max(0, 1 - (maxScore / 3));
  }

  /**
   * Obtiene los resultados de un run
   */
  async getRunResults(runId: string): Promise<any> {
    try {
      const run = await prisma.qASweep2Run.findUnique({
        where: { id: runId },
        include: {
          results: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return run;
    } catch (error) {
      logger.error('Failed to get run results:', error);
      throw error;
    }
  }

  /**
   * Lista todos los runs
   */
  async listRuns(): Promise<any[]> {
    try {
      const runs = await prisma.qASweep2Run.findMany({
        include: {
          _count: {
            select: { results: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return runs;
    } catch (error) {
      logger.error('Failed to list runs:', error);
      throw error;
    }
  }

  /**
   * Aplica correcciones a la base de datos
   */
  async applyCorrections(resultId: string): Promise<void> {
    try {
      const result = await prisma.qASweep2Result.findUnique({
        where: { id: resultId }
      });

      if (!result || !result.corrections) {
        throw new Error('Result not found or no corrections available');
      }

      const corrections = result.corrections as any;

      // Actualizar la variación con las correcciones
      await prisma.questionVariation.update({
        where: { id: result.variationId },
        data: {
          content: corrections.enunciado_corregido,
          explanation: corrections.explicacion_global
        }
      });

      // Actualizar alternativas
      if (corrections.alternativas) {
        const alternatives = await prisma.alternative.findMany({
          where: { variationId: result.variationId },
          orderBy: { order: 'asc' }
        });

        for (let i = 0; i < alternatives.length; i++) {
          const letter = String.fromCharCode(65 + i);
          if (corrections.alternativas[letter]) {
            await prisma.alternative.update({
              where: { id: alternatives[i].id },
              data: {
                text: corrections.alternativas[letter],
                isCorrect: letter === corrections.respuesta_correcta,
                explanation: corrections.explicaciones?.[letter]
              }
            });
          }
        }
      }

      // Marcar como aplicado
      await prisma.qASweep2Result.update({
        where: { id: resultId },
        data: { status: 'APPLIED' }
      });

      logger.info('Corrections applied successfully', { resultId });
    } catch (error) {
      logger.error('Failed to apply corrections:', error);
      throw error;
    }
  }
}
