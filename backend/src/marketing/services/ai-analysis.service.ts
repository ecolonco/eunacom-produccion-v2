/**
 * AI Analysis Service
 *
 * Servicio de análisis inteligente de métricas de marketing usando
 * OpenAI GPT-4 o Anthropic Claude para generar insights y recomendaciones.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { getMarketingConfig } from '../utils/config';

const prisma = new PrismaClient();

export interface AIAnalysisInput {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    metrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      cost: number;
      revenue?: number;
      ctr: number;
      cpc: number;
      roi?: number;
    };
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  historicalData?: {
    avgROI: number;
    avgCTR: number;
    avgConversionRate: number;
    avgCost: number;
  };
  context?: string;
}

export interface AIInsight {
  type: 'positive' | 'negative' | 'neutral' | 'opportunity' | 'warning';
  title: string;
  description: string;
  metrics?: Record<string, number | string>;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface AIRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'budget' | 'targeting' | 'creative' | 'bidding' | 'keywords' | 'schedule' | 'general';
  title: string;
  description: string;
  action: string;
  estimatedImpact?: string;
  confidence: number; // 0.0 to 1.0
  aiReasoning?: string;
}

export interface AIAnalysisResult {
  summary: string;
  insights: AIInsight[];
  recommendations: AIRecommendation[];
  predictions?: {
    nextWeek?: {
      conversions: number;
      cost: number;
      revenue?: number;
    };
    nextMonth?: {
      conversions: number;
      cost: number;
      revenue?: number;
    };
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
  };
  anomalies?: Array<{
    metric: string;
    currentValue: number;
    expectedValue: number;
    deviation: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    possibleCauses: string[];
  }>;
}

export class AIAnalysisService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private config: ReturnType<typeof getMarketingConfig>;

  constructor() {
    this.config = getMarketingConfig();

    if (this.config.ai.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.config.ai.apiKey,
      });
    } else {
      this.anthropic = new Anthropic({
        apiKey: this.config.ai.apiKey,
      });
    }
  }

  /**
   * Analiza métricas de campañas y genera insights y recomendaciones
   */
  async analyzeMetrics(input: AIAnalysisInput): Promise<AIAnalysisResult> {
    console.log('🤖 Iniciando análisis de IA...');
    console.log(`📊 Analizando ${input.campaigns.length} campañas`);
    console.log(`📅 Período: ${input.dateRange.startDate} - ${input.dateRange.endDate}`);

    const prompt = this.buildAnalysisPrompt(input);
    const startTime = Date.now();

    try {
      let result: AIAnalysisResult;

      if (this.config.ai.provider === 'openai') {
        result = await this.analyzeWithOpenAI(prompt);
      } else {
        result = await this.analyzeWithClaude(prompt);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Análisis completado en ${processingTime}ms`);
      console.log(`📝 Insights generados: ${result.insights.length}`);
      console.log(`💡 Recomendaciones generadas: ${result.recommendations.length}`);

      // Guardar análisis en base de datos
      await this.saveAnalysis(input, result, processingTime);

      return result;
    } catch (error) {
      console.error('❌ Error en análisis de IA:', error);
      throw error;
    }
  }

  /**
   * Analiza con OpenAI GPT-4
   */
  private async analyzeWithOpenAI(prompt: string): Promise<AIAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI no está configurado');
    }

    const response = await this.openai.chat.completions.create({
      model: this.config.ai.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No se recibió respuesta del modelo');
    }

    return JSON.parse(content);
  }

  /**
   * Analiza con Anthropic Claude
   */
  private async analyzeWithClaude(prompt: string): Promise<AIAnalysisResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic no está configurado');
    }

    const response = await this.anthropic.messages.create({
      model: this.config.ai.model,
      max_tokens: 2500,
      temperature: 0.7,
      system: this.getSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Respuesta inesperada del modelo');
    }

    // Claude puede devolver el JSON directamente o con explicación
    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON en la respuesta');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Construye el prompt de sistema para el análisis
   */
  private getSystemPrompt(): string {
    return `Eres un experto analista de marketing digital especializado en optimización de campañas publicitarias.

Tu trabajo es:
1. Analizar datos de rendimiento de campañas de Google Ads
2. Identificar tendencias, patrones, anomalías y oportunidades
3. Generar recomendaciones accionables, específicas y priorizadas
4. Estimar el impacto potencial de cada recomendación
5. Predecir tendencias futuras basado en datos históricos

IMPORTANTE:
- Sé ESPECÍFICO con números, porcentajes y nombres de campañas
- Menciona campañas concretas en tus recomendaciones
- Da acciones CLARAS y APLICABLES paso a paso
- Estima el impacto de cada recomendación en términos cuantificables
- Prioriza por ROI potencial
- Considera el contexto del negocio (educación médica)

FORMATO DE RESPUESTA:
Responde SIEMPRE en formato JSON válido con esta estructura exacta:

{
  "summary": "Resumen ejecutivo en 2-3 frases sobre el estado general de las campañas",
  "insights": [
    {
      "type": "positive|negative|neutral|opportunity|warning",
      "title": "Título corto y descriptivo",
      "description": "Descripción detallada con números específicos",
      "metrics": {
        "metricName": value
      },
      "priority": "critical|high|medium|low"
    }
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "category": "budget|targeting|creative|bidding|keywords|schedule|general",
      "title": "Título de la recomendación",
      "description": "Explicación detallada del problema u oportunidad",
      "action": "Pasos específicos a seguir para implementar la recomendación",
      "estimatedImpact": "Impacto esperado (ej: +20% conversiones, -15% CPA)",
      "confidence": 0.85,
      "aiReasoning": "Explicación del razonamiento detrás de esta recomendación"
    }
  ],
  "predictions": {
    "nextWeek": {
      "conversions": number,
      "cost": number,
      "revenue": number
    },
    "nextMonth": {
      "conversions": number,
      "cost": number,
      "revenue": number
    },
    "trend": "improving|declining|stable",
    "confidence": 0.75
  },
  "anomalies": [
    {
      "metric": "nombre_metrica",
      "currentValue": number,
      "expectedValue": number,
      "deviation": number,
      "severity": "critical|high|medium|low",
      "possibleCauses": ["causa 1", "causa 2", "causa 3"]
    }
  ]
}

CONTEXTO DEL NEGOCIO:
- Negocio: Plataforma educativa de preparación para examen EUNACOM (medicina)
- Objetivo: Convertir médicos interesados en usuarios de pago
- Modelo: Freemium (control gratis + paquetes de pago)
- Ticket promedio: $4,990 - $49,990 CLP`;
  }

  /**
   * Construye el prompt de análisis con los datos de entrada
   */
  private buildAnalysisPrompt(input: AIAnalysisInput): string {
    const totalCost = input.campaigns.reduce((sum, c) => sum + c.metrics.cost, 0);
    const totalConversions = input.campaigns.reduce((sum, c) => sum + c.metrics.conversions, 0);
    const totalRevenue = input.campaigns.reduce((sum, c) => sum + (c.metrics.revenue || 0), 0);
    const avgCTR = input.campaigns.reduce((sum, c) => sum + c.metrics.ctr, 0) / input.campaigns.length;

    let prompt = `
PERÍODO DE ANÁLISIS: ${input.dateRange.startDate} a ${input.dateRange.endDate}

RESUMEN GENERAL:
- Total de campañas: ${input.campaigns.length}
- Gasto total: $${totalCost.toLocaleString('es-CL')} CLP
- Conversiones totales: ${totalConversions}
- Revenue total: $${totalRevenue.toLocaleString('es-CL')} CLP
- CTR promedio: ${avgCTR.toFixed(2)}%
- ROI general: ${totalRevenue > 0 ? (((totalRevenue - totalCost) / totalCost) * 100).toFixed(1) : 'N/A'}%

DATOS DE CAMPAÑAS:
${input.campaigns.map((campaign, idx) => `
${idx + 1}. CAMPAÑA: "${campaign.name}" (${campaign.status})
   - ID: ${campaign.id}
   - Impresiones: ${campaign.metrics.impressions.toLocaleString()}
   - Clicks: ${campaign.metrics.clicks.toLocaleString()}
   - CTR: ${campaign.metrics.ctr.toFixed(2)}%
   - Conversiones: ${campaign.metrics.conversions}
   - Costo: $${campaign.metrics.cost.toLocaleString('es-CL')} CLP
   - CPC promedio: $${campaign.metrics.cpc.toLocaleString('es-CL')} CLP
   ${campaign.metrics.revenue ? `- Revenue: $${campaign.metrics.revenue.toLocaleString('es-CL')} CLP` : ''}
   ${campaign.metrics.roi !== undefined ? `- ROI: ${campaign.metrics.roi.toFixed(1)}%` : ''}
`).join('\n')}
`;

    if (input.historicalData) {
      prompt += `
DATOS HISTÓRICOS (Promedio últimos 30 días):
- ROI promedio: ${input.historicalData.avgROI.toFixed(1)}%
- CTR promedio: ${input.historicalData.avgCTR.toFixed(2)}%
- Tasa de conversión promedio: ${input.historicalData.avgConversionRate.toFixed(2)}%
- Costo promedio diario: $${input.historicalData.avgCost.toLocaleString('es-CL')} CLP
`;
    }

    if (input.context) {
      prompt += `\nCONTEXTO ADICIONAL:\n${input.context}\n`;
    }

    prompt += `
Por favor analiza estos datos y genera tu reporte completo en formato JSON, siguiendo exactamente la estructura especificada en las instrucciones del sistema.

Asegúrate de:
1. Identificar las campañas con mejor y peor rendimiento
2. Detectar anomalías significativas (desviaciones >20%)
3. Priorizar recomendaciones por impacto potencial
4. Ser específico con nombres de campañas y números
5. Proporcionar predicciones realistas basadas en tendencias`;

    return prompt.trim();
  }

  /**
   * Guarda el análisis en la base de datos
   */
  private async saveAnalysis(
    input: AIAnalysisInput,
    result: AIAnalysisResult,
    processingTime: number
  ): Promise<void> {
    try {
      await prisma.marketingAIAnalysis.create({
        data: {
          type: this.determineAnalysisType(input.dateRange),
          startDate: new Date(input.dateRange.startDate),
          endDate: new Date(input.dateRange.endDate),
          summary: result.summary,
          insights: result.insights as any,
          recommendations: result.recommendations as any,
          predictions: result.predictions as any,
          anomalies: result.anomalies as any,
          model: this.config.ai.model,
          provider: this.config.ai.provider,
          processingTimeMs: processingTime,
        },
      });

      console.log('💾 Análisis guardado en base de datos');
    } catch (error) {
      console.error('❌ Error guardando análisis:', error);
      // No throw - el análisis fue exitoso aunque no se guardó
    }
  }

  /**
   * Determina el tipo de análisis basado en el rango de fechas
   */
  private determineAnalysisType(dateRange: { startDate: string; endDate: string }): 'DAILY' | 'WEEKLY' | 'MONTHLY' {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 2) return 'DAILY';
    if (daysDiff <= 10) return 'WEEKLY';
    return 'MONTHLY';
  }

  /**
   * Detecta anomalías comparando métricas actuales con históricas
   */
  async detectAnomalies(
    currentMetrics: Array<{
      metric: string;
      value: number;
    }>,
    historicalMetrics: Array<{
      metric: string;
      avgValue: number;
      stdDev?: number;
    }>
  ): Promise<AIAnalysisResult['anomalies']> {
    console.log('🔍 Detectando anomalías...');

    const prompt = `
Analiza estas métricas actuales comparadas con datos históricos y detecta anomalías significativas:

MÉTRICAS ACTUALES:
${currentMetrics.map(m => `- ${m.metric}: ${m.value}`).join('\n')}

MÉTRICAS HISTÓRICAS (Promedio):
${historicalMetrics.map(h => `- ${h.metric}: ${h.avgValue}${h.stdDev ? ` (±${h.stdDev})` : ''}`).join('\n')}

Identifica:
1. Cambios significativos (>20% de desviación)
2. Patrones inusuales o preocupantes
3. Posibles causas raíz
4. Nivel de severidad (critical, high, medium, low)

Responde en formato JSON:
{
  "anomalies": [
    {
      "metric": "nombre_metrica",
      "currentValue": number,
      "expectedValue": number,
      "deviation": percentage,
      "severity": "critical|high|medium|low",
      "possibleCauses": ["causa 1", "causa 2", "causa 3"]
    }
  ]
}`;

    try {
      let response: any;

      if (this.config.ai.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.config.ai.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.5,
        });
        response = JSON.parse(completion.choices[0].message.content || '{}');
      } else if (this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: this.config.ai.model,
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        });
        const content = message.content[0];
        if (content.type === 'text') {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          response = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        }
      }

      console.log(`✅ Detectadas ${response.anomalies?.length || 0} anomalías`);
      return response.anomalies || [];
    } catch (error) {
      console.error('❌ Error detectando anomalías:', error);
      return [];
    }
  }

  /**
   * Obtiene el último análisis guardado
   */
  async getLatestAnalysis(type?: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<any> {
    const where = type ? { type } : {};

    const analysis = await prisma.marketingAIAnalysis.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return analysis;
  }

  /**
   * Obtiene análisis históricos
   */
  async getAnalysisHistory(
    days: number = 30,
    type?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = {
      createdAt: { gte: since },
    };
    if (type) where.type = type;

    const analyses = await prisma.marketingAIAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return analyses;
  }
}

export default AIAnalysisService;
