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
        orderBy: [
          { baseQuestion: { displaySequence: 'asc' } },
          { variationNumber: 'asc' }
        ]
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
    const 