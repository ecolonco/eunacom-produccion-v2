/**
 * AI Chat Service
 *
 * Servicio de chat interactivo con IA para consultas sobre campañas y métricas.
 * Mantiene contexto de conversaciones y proporciona respuestas basadas en datos reales.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { getMarketingConfig } from '../utils/config';

const prisma = new PrismaClient();

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  campaigns?: any[];
  recentMetrics?: any[];
  recommendations?: any[];
  alerts?: any[];
  period?: {
    startDate: string;
    endDate: string;
  };
}

export interface ChatResponse {
  message: string;
  sessionId: string;
  tokensUsed?: number;
  contextUsed?: string[];
}

export class AIChatService {
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
   * Envía un mensaje al chat y obtiene respuesta
   */
  async chat(
    userMessage: string,
    sessionId: string,
    context?: ChatContext
  ): Promise<ChatResponse> {
    console.log(`💬 Chat mensaje recibido en sesión ${sessionId}`);
    console.log(`📝 Usuario: ${userMessage.substring(0, 100)}...`);

    // Verificar límite diario
    const canChat = await this.checkDailyLimit(sessionId);
    if (!canChat) {
      throw new Error('Límite diario de mensajes alcanzado');
    }

    // Obtener historial de conversación
    const history = await this.getConversationHistory(sessionId);

    // Obtener contexto actualizado si no se proporciona
    const chatContext = context || await this.buildContext();

    // Guardar mensaje del usuario
    await this.saveMessage(sessionId, 'user', userMessage);

    try {
      // Generar respuesta según proveedor
      let response: string;
      let tokensUsed = 0;

      if (this.config.ai.provider === 'openai' && this.openai) {
        const result = await this.chatWithOpenAI(userMessage, history, chatContext);
        response = result.message;
        tokensUsed = result.tokensUsed;
      } else if (this.anthropic) {
        const result = await this.chatWithClaude(userMessage, history, chatContext);
        response = result.message;
        tokensUsed = result.tokensUsed;
      } else {
        throw new Error('Proveedor de IA no configurado');
      }

      // Guardar respuesta del asistente
      await this.saveMessage(sessionId, 'assistant', response, {
        model: this.config.ai.model,
        tokensUsed,
        contextUsed: this.getContextSummary(chatContext),
      });

      console.log(`✅ Respuesta generada (${tokensUsed} tokens)`);

      return {
        message: response,
        sessionId,
        tokensUsed,
        contextUsed: this.getContextSummary(chatContext),
      };
    } catch (error) {
      console.error('❌ Error en chat:', error);
      throw error;
    }
  }

  /**
   * Chat con OpenAI
   */
  private async chatWithOpenAI(
    userMessage: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<{ message: string; tokensUsed: number }> {
    if (!this.openai) {
      throw new Error('OpenAI no está configurado');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context),
      },
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const response = await this.openai.chat.completions.create({
      model: this.config.ai.model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return {
      message: response.choices[0].message.content || 'No pude generar una respuesta.',
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }

  /**
   * Chat con Claude
   */
  private async chatWithClaude(
    userMessage: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<{ message: string; tokensUsed: number }> {
    if (!this.anthropic) {
      throw new Error('Anthropic no está configurado');
    }

    const messages: Anthropic.MessageParam[] = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const response = await this.anthropic.messages.create({
      model: this.config.ai.model,
      max_tokens: 1000,
      temperature: 0.7,
      system: this.buildSystemPrompt(context),
      messages,
    });

    const content = response.content[0];
    const message = content.type === 'text' ? content.text : 'No pude generar una respuesta.';

    return {
      message,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Construye el prompt de sistema con contexto de campañas
   */
  private buildSystemPrompt(context: ChatContext): string {
    const totalCampaigns = context.campaigns?.length || 0;
    const totalMetrics = context.recentMetrics?.length || 0;
    const pendingRecommendations = context.recommendations?.filter(r => r.status === 'pending').length || 0;
    const activeAlerts = context.alerts?.filter(a => a.status === 'active').length || 0;

    let contextData = '';

    if (context.campaigns && context.campaigns.length > 0) {
      contextData += `\n\n📊 CAMPAÑAS ACTIVAS:\n`;
      contextData += context.campaigns.map((c, idx) =>
        `${idx + 1}. ${c.name} (${c.status})\n` +
        `   - Presupuesto: $${c.budget?.toLocaleString('es-CL')} CLP\n` +
        `   - Plataforma: ${c.platform}`
      ).join('\n');
    }

    if (context.recentMetrics && context.recentMetrics.length > 0) {
      const latest = context.recentMetrics[0];
      contextData += `\n\n📈 MÉTRICAS RECIENTES (últimos 7 días):\n`;
      contextData += `- Impresiones: ${latest.impressions?.toLocaleString()}\n`;
      contextData += `- Clicks: ${latest.clicks?.toLocaleString()}\n`;
      contextData += `- CTR: ${latest.ctr?.toFixed(2)}%\n`;
      contextData += `- Conversiones: ${latest.conversions}\n`;
      contextData += `- Costo: $${latest.cost?.toLocaleString('es-CL')} CLP\n`;
      contextData += `- ROI: ${latest.roi?.toFixed(1)}%\n`;
    }

    if (context.recommendations && context.recommendations.length > 0) {
      contextData += `\n\n💡 RECOMENDACIONES PENDIENTES:\n`;
      contextData += context.recommendations.slice(0, 5).map((r, idx) =>
        `${idx + 1}. [${r.priority.toUpperCase()}] ${r.title}`
      ).join('\n');
    }

    if (context.alerts && context.alerts.length > 0) {
      contextData += `\n\n🚨 ALERTAS ACTIVAS:\n`;
      contextData += context.alerts.slice(0, 3).map((a, idx) =>
        `${idx + 1}. [${a.severity.toUpperCase()}] ${a.title}`
      ).join('\n');
    }

    return `Eres un asistente experto en marketing digital especializado en análisis de campañas publicitarias.

Tu trabajo es ayudar al usuario a:
- Entender el rendimiento de sus campañas
- Responder preguntas sobre métricas y tendencias
- Explicar recomendaciones y alertas
- Sugerir optimizaciones
- Interpretar datos de marketing

CONTEXTO ACTUAL:
- Campañas activas: ${totalCampaigns}
- Métricas disponibles: ${totalMetrics} registros
- Recomendaciones pendientes: ${pendingRecommendations}
- Alertas activas: ${activeAlerts}
${context.period ? `- Período: ${context.period.startDate} a ${context.period.endDate}` : ''}

DATOS ACTUALES:${contextData}

INSTRUCCIONES:
- Sé conversacional, amigable y conciso
- Usa los datos proporcionados para dar respuestas específicas
- Si no tienes información suficiente, pregunta al usuario
- Proporciona números concretos cuando estén disponibles
- Sugiere acciones accionables cuando sea relevante
- Si el usuario pregunta por una campaña específica, busca en los datos
- Si preguntan sobre rendimiento, compara con métricas históricas
- Usa emojis ocasionalmente para hacer más amigable la conversación

CONTEXTO DEL NEGOCIO:
- Plataforma educativa EUNACOM (preparación examen médico)
- Modelo freemium: Control gratis + paquetes de pago
- Objetivo: Convertir médicos interesados en usuarios de pago
- Mercado: Chile
- Moneda: CLP (Peso Chileno)`;
  }

  /**
   * Construye contexto actualizado de campañas
   */
  private async buildContext(): Promise<ChatContext> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [campaigns, metrics, recommendations, alerts] = await Promise.all([
      // Campañas activas
      prisma.campaign.findMany({
        where: {
          status: { in: ['ENABLED', 'PAUSED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Métricas recientes agregadas
      prisma.campaignMetric.findMany({
        where: {
          date: { gte: sevenDaysAgo },
        },
        include: {
          campaign: {
            select: { name: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 50,
      }),

      // Recomendaciones pendientes
      prisma.recommendation.findMany({
        where: {
          status: 'pending',
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
        take: 10,
      }),

      // Alertas activas
      prisma.alert.findMany({
        where: { status: 'active' },
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'desc' },
        ],
        take: 5,
      }),
    ]);

    return {
      campaigns,
      recentMetrics: metrics,
      recommendations,
      alerts,
      period: {
        startDate: sevenDaysAgo.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
    };
  }

  /**
   * Obtiene historial de conversación
   */
  private async getConversationHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  /**
   * Guarda un mensaje en la base de datos
   */
  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: {
      model?: string;
      tokensUsed?: number;
      contextUsed?: string[];
    }
  ) {
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role,
        content,
        model: metadata?.model,
        tokensUsed: metadata?.tokensUsed,
        contextUsed: metadata?.contextUsed || [],
      },
    });
  }

  /**
   * Verifica límite diario de mensajes
   */
  private async checkDailyLimit(sessionId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.chatMessage.count({
      where: {
        sessionId,
        role: 'user',
        createdAt: { gte: today },
      },
    });

    const limit = this.config.features.aiChatMaxMessagesPerDay;
    return count < limit;
  }

  /**
   * Obtiene resumen de contexto usado
   */
  private getContextSummary(context: ChatContext): string[] {
    const summary: string[] = [];

    if (context.campaigns && context.campaigns.length > 0) {
      summary.push(`${context.campaigns.length} campaigns`);
    }
    if (context.recentMetrics && context.recentMetrics.length > 0) {
      summary.push(`${context.recentMetrics.length} metrics`);
    }
    if (context.recommendations && context.recommendations.length > 0) {
      summary.push(`${context.recommendations.length} recommendations`);
    }
    if (context.alerts && context.alerts.length > 0) {
      summary.push(`${context.alerts.length} alerts`);
    }

    return summary;
  }

  /**
   * Limpia conversaciones antiguas
   */
  async cleanupOldConversations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.chatMessage.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`🧹 ${result.count} mensajes antiguos eliminados`);
    return result.count;
  }

  /**
   * Obtiene estadísticas de uso del chat
   */
  async getChatStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalMessages, totalSessions, avgMessagesPerSession] = await Promise.all([
      prisma.chatMessage.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.chatMessage.findMany({
        where: { createdAt: { gte: since } },
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      prisma.chatMessage.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    const avgMessages = avgMessagesPerSession.length > 0
      ? avgMessagesPerSession.reduce((sum, s) => sum + s._count, 0) / avgMessagesPerSession.length
      : 0;

    return {
      totalMessages,
      totalSessions: totalSessions.length,
      avgMessagesPerSession: avgMessages.toFixed(1),
      period: {
        days,
        since: since.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Obtiene sesiones recientes
   */
  async getRecentSessions(limit: number = 10) {
    const sessions = await prisma.chatMessage.findMany({
      select: {
        sessionId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['sessionId'],
      take: limit,
    });

    return sessions;
  }
}

export default AIChatService;
