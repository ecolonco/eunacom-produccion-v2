/**
 * Servicio para generar reportes inteligentes de QA Sweep 2.0 usando GPT-4
 */

import { prisma } from '../lib/prisma';
import { OpenAIService } from './openai.service';
import { logger } from '../utils/logger';

interface RunReport {
  runNumber: number;
  summary: string;
  statistics: {
    totalVariations: number;
    correctedVariations: number;
    correctionRate: number;
    avgConfidence: number;
    totalTokens: number;
    totalCost: number;
  };
  severeCases: Array<{
    variationId: string;
    displayCode: string;
    severity: number;
    originalContent: string;
    correctedContent: string;
    justification: string;
  }>;
  recommendations: string[];
  taxonomyChanges: Array<{
    variationId: string;
    displayCode: string;
    from: { specialty: string; topic: string };
    to: { specialty: string; topic: string };
  }>;
}

export class QASweep2ReportService {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  /**
   * Obtener el número de run basado en la fecha de creación
   */
  private async getRunNumber(runId: string): Promise<number> {
    const run = await prisma.qASweep2Run.findUnique({
      where: { id: runId },
      select: { createdAt: true },
    });

    if (!run) throw new Error('Run not found');

    const olderRuns = await prisma.qASweep2Run.count({
      where: {
        createdAt: {
          lt: run.createdAt,
        },
      },
    });

    return olderRuns + 1;
  }

  /**
   * Generar reporte completo usando GPT-4
   */
  async generateReport(runId: string, regenerate: boolean = false): Promise<RunReport> {
    logger.info(`Generating report for run ${runId}`);

    // Verificar si ya existe un reporte
    const existingRun = await prisma.qASweep2Run.findUnique({
      where: { id: runId },
      select: { config: true },
    });

    if (!regenerate && existingRun?.config && typeof existingRun.config === 'object' && 'report' in existingRun.config) {
      logger.info('Returning cached report');
      return (existingRun.config as any).report as RunReport;
    }

    // Obtener número de run
    const runNumber = await this.getRunNumber(runId);

    // Obtener datos del run
    const run = await prisma.qASweep2Run.findUnique({
      where: { id: runId },
      include: {
        results: {
          include: {
            variation: {
              include: {
                baseQuestion: {
                  select: {
                    displaySequence: true,
                  },
                },
              },
            },
          },
          orderBy: {
            confidenceScore: 'desc',
          },
        },
      },
    });

    if (!run) throw new Error('Run not found');

    // Calcular estadísticas
    const totalVariations = run.results.length;
    const correctedVariations = run.results.filter((r) => r.status === 'APPLIED').length;
    const correctionRate = totalVariations > 0 ? (correctedVariations / totalVariations) * 100 : 0;
    const avgConfidence = totalVariations > 0
      ? run.results.reduce((sum, r) => sum + r.confidenceScore, 0) / totalVariations * 100
      : 0;
    const totalTokensIn = run.results.reduce((sum, r) => sum + r.tokensIn, 0);
    const totalTokensOut = run.results.reduce((sum, r) => sum + r.tokensOut, 0);
    const totalTokens = totalTokensIn + totalTokensOut;

    // Costo estimado (GPT-4o-mini: $0.15/$0.60 por 1M tokens, GPT-4o: $2.50/$10 por 1M tokens)
    const costInput = (totalTokensIn / 1000000) * 0.15; // Asumiendo GPT-4o-mini para eval
    const costOutput = (totalTokensOut / 1000000) * 10; // Asumiendo GPT-4o para fix
    const totalCost = costInput + costOutput;

    // Obtener casos severos (severidad 3)
    const severeCases: any[] = [];
    for (const result of run.results.filter(r => r.status === 'APPLIED')) {
      try {
        const diagnosis = result.diagnosis as any;
        if (diagnosis.severidad_global === 3 || diagnosis.severidad_global === '3') {
          // Obtener contenido original y corregido
          const originalVariation = await prisma.questionVariation.findUnique({
            where: { id: result.variationId },
            select: { content: true, displayCode: true },
          });

          let correctedContent = '';
          if (result.metadata && typeof result.metadata === 'object' && 'newVariationId' in result.metadata) {
            const newVariation = await prisma.questionVariation.findUnique({
              where: { id: (result.metadata as any).newVariationId },
              select: { content: true },
            });
            correctedContent = newVariation?.content || '';
          }

          if (originalVariation) {
            severeCases.push({
              variationId: result.variationId,
              displayCode: result.variation.displayCode || `${result.variation.baseQuestion.displaySequence}.?`,
              severity: diagnosis.severidad_global,
              originalContent: originalVariation.content,
              correctedContent,
              justification: diagnosis.resumen_global || 'No disponible',
            });
          }
        }
      } catch (e) {
        logger.warn(`Error processing severe case: ${e}`);
      }

      if (severeCases.length >= 10) break; // Limitar a 10 casos severos
    }

    // Obtener cambios de taxonomía
    const taxonomyChanges: any[] = [];
    for (const result of run.results.filter(r => r.status === 'APPLIED' && r.metadata)) {
      try {
        const metadata = result.metadata as any;
        if (metadata.appliedTaxonomy) {
          const originalVariation = await prisma.questionVariation.findUnique({
            where: { id: result.variationId },
            include: {
              baseQuestion: {
                include: {
                  aiAnalysis: {
                    select: {
                      specialty: true,
                      topic: true,
                    },
                  },
                },
              },
            },
          });

          if (originalVariation?.baseQuestion.aiAnalysis) {
            const from = originalVariation.baseQuestion.aiAnalysis;
            const to = metadata.appliedTaxonomy;

            if (from.specialty !== to.specialty || from.topic !== to.topic) {
              taxonomyChanges.push({
                variationId: result.variationId,
                displayCode: result.variation.displayCode || `${result.variation.baseQuestion.displaySequence}.?`,
                from: { specialty: from.specialty, topic: from.topic },
                to: { specialty: to.specialty, topic: to.topic },
              });
            }
          }
        }
      } catch (e) {
        logger.warn(`Error processing taxonomy change: ${e}`);
      }

      if (taxonomyChanges.length >= 20) break; // Limitar a 20 cambios
    }

    // Preparar datos para GPT-4
    const promptData = {
      runNumber,
      runName: run.name,
      config: run.config,
      statistics: {
        totalVariations,
        correctedVariations,
        correctionRate: correctionRate.toFixed(2),
        avgConfidence: avgConfidence.toFixed(2),
        totalTokens,
        totalCost: totalCost.toFixed(4),
      },
      severeCasesCount: severeCases.length,
      taxonomyChangesCount: taxonomyChanges.length,
      sampleSevereCases: severeCases.slice(0, 3),
      sampleTaxonomyChanges: taxonomyChanges.slice(0, 5),
    };

    const prompt = `Eres un experto en control de calidad de contenido médico. Analiza el siguiente reporte de procesamiento QA Sweep 2.0 y genera un resumen ejecutivo profesional en español.

DATOS DEL PROCESAMIENTO:
${JSON.stringify(promptData, null, 2)}

INSTRUCCIONES:
1. Genera un resumen ejecutivo conciso (2-3 párrafos) que explique:
   - Qué se procesó y cuál fue el resultado general
   - Tasa de corrección y nivel de confianza
   - Problemas principales encontrados
   
2. Lista 3-5 recomendaciones específicas basadas en los resultados

3. Para los casos severos mostrados, explica brevemente qué tipo de problemas se encontraron

Responde ÚNICAMENTE en formato JSON con esta estructura:
{
  "summary": "string (resumen ejecutivo)",
  "recommendations": ["string", "string", ...],
  "severeAnalysis": "string (análisis de casos severos)"
}`;

    let summary = 'Reporte generado automáticamente';
    let recommendations: string[] = ['Revisar manualmente los casos de severidad alta'];
    let severeAnalysis = 'No se pudo generar análisis detallado';

    try {
      const response = await this.openaiService.generateText(
        'gpt-5',
        prompt,
        8000
      );

      const parsed = JSON.parse(response.content);
      summary = parsed.summary || summary;
      recommendations = parsed.recommendations || recommendations;
      severeAnalysis = parsed.severeAnalysis || severeAnalysis;
    } catch (error) {
      logger.error('Error generating AI report:', error);
      summary = `Procesamiento de ${totalVariations} variaciones (${correctionRate.toFixed(1)}% corregidas). Confianza promedio: ${avgConfidence.toFixed(1)}%. Se encontraron ${severeCases.length} casos de severidad alta que requieren revisión.`;
      recommendations = [
        'Revisar manualmente los casos de severidad alta',
        'Verificar cambios de taxonomía',
        `Costo total del procesamiento: $${totalCost.toFixed(4)} USD`,
      ];
    }

    const report: RunReport = {
      runNumber,
      summary,
      statistics: {
        totalVariations,
        correctedVariations,
        correctionRate: parseFloat(correctionRate.toFixed(2)),
        avgConfidence: parseFloat(avgConfidence.toFixed(2)),
        totalTokens,
        totalCost: parseFloat(totalCost.toFixed(4)),
      },
      severeCases: severeCases.map(c => ({
        ...c,
        justification: severeAnalysis,
      })),
      recommendations,
      taxonomyChanges,
    };

    // Guardar reporte en config
    await prisma.qASweep2Run.update({
      where: { id: runId },
      data: {
        config: {
          ...(run.config as any),
          report,
        },
      },
    });

    logger.info(`Report generated for run ${runId}`);
    return report;
  }
}

export const qaSweep2ReportService = new QASweep2ReportService();

