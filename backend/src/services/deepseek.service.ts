import { QuestionClassification } from './eunacom-taxonomy';
import { EunacomTaxonomyDbService } from './eunacom-taxonomy-db.service';
import { logger } from '../utils/logger';

export interface AIAnalysisResult extends QuestionClassification {
  baseDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  reviewNotes?: string;
}

export interface QuestionVariationResult {
  content: string;
  explanation: string;
  alternatives: {
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = 'https://api.deepseek.com/v1';

    logger.info(`DeepSeek API Key configured: ${this.apiKey ? 'YES' : 'NO'}`);

    if (!this.apiKey) {
      logger.warn('DEEPSEEK_API_KEY not configured. AI features will be limited.');
    } else {
      logger.info(`DeepSeek API Key length: ${this.apiKey.length} characters`);
    }
  }

  /**
   * Analyze a question using DeepSeek AI to classify it according to EUNACOM taxonomy
   */
  async analyzeQuestion(questionContent: string): Promise<AIAnalysisResult> {
    try {
      logger.info(`Starting DeepSeek analysis for question: ${questionContent.substring(0, 100)}...`);

      const prompt = await this.buildAnalysisPrompt(questionContent);
      const response = await this.makeAIRequest(prompt, 'analysis');

      logger.info(`DeepSeek analysis response received: ${response.substring(0, 200)}...`);

      const result = this.parseAnalysisResponse(response);
      logger.info(`Analysis successful: ${result.specialty} -> ${result.topic}`);

      return result;

    } catch (error) {
      logger.error('Error in DeepSeek analysis:', error);

      // Fallback to rule-based classification
      logger.info('Using fallback analysis');
      return await this.fallbackAnalysis(questionContent);
    }
  }

  /**
   * Generate a question variation with specific difficulty level
   */
  async generateQuestionVariation(
    baseQuestion: string,
    analysis: QuestionClassification,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    variationNumber: number
  ): Promise<QuestionVariationResult> {
    try {
      const prompt = this.buildVariationPrompt(baseQuestion, analysis, difficulty, variationNumber);
      const response = await this.makeAIRequest(prompt, 'variation');

      return this.parseVariationResponse(response);

    } catch (error) {
      logger.error('Error generating question variation:', error);

      // Fallback to template-based generation
      return this.fallbackVariation(baseQuestion, difficulty);
    }
  }

  /**
   * Build prompt for question analysis with dynamic taxonomy
   */
   private async buildAnalysisPrompt(questionContent: string): Promise<string> {
    // Get the current taxonomy from database
    const taxonomy = await EunacomTaxonomyDbService.getTaxonomyForAI();

    // Build specialties list with their topics
    const specialtiesList = taxonomy.specialties
      .map(spec => {
        const topicsList = spec.topics.map(topic => `    - ${topic.name}${topic.description ? ` (${topic.description})` : ''}`).join('\n');
        return `- ${spec.name}${spec.description ? ` - ${spec.description}` : ''}\n${topicsList}`;
      })
      .join('\n\n');
    return `
Eres un experto médico especializado en educación médica chilena y el examen EUNACOM.

Analiza la siguiente pregunta médica y clasifícala según la taxonomía EUNACOM:

PREGUNTA: "${questionContent}"

Debes responder en formato JSON con la siguiente estructura:
{
  "specialty": "especialidad médica principal",
  "topic": "tema específico",
  "subtopic": "subtema (opcional)",
  "confidence": número_entre_0_y_1,
  "keywords": ["palabra_clave_1", "palabra_clave_2"],
  "learningObjectives": ["objetivo_1", "objetivo_2"],
  "questionType": "CLINICAL_CASE|CONCEPT|PROCEDURE|DIAGNOSIS|TREATMENT|PREVENTION",
  "baseDifficulty": "EASY|MEDIUM|HARD",
  "reviewNotes": "observaciones sobre la calidad de la pregunta"
}

TAXONOMÍA EUNACOM OFICIAL:

${specialtiesList}

CRITERIOS DE DIFICULTAD:
- EASY: Conocimiento básico, conceptos fundamentales
- MEDIUM: Aplicación clínica, diagnóstico diferencial
- HARD: Casos complejos, múltiples variables, juicio clínico avanzado

Responde SOLO con el JSON, sin texto adicional.
`;
  }

  /**
   * Build prompt for question variation generation
   */
  private buildVariationPrompt(
    baseQuestion: string,
    analysis: QuestionClassification,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    variationNumber: number
  ): string {
    const difficultyDescriptions = {
      EASY: 'conocimiento básico y conceptos fundamentales',
      MEDIUM: 'aplicación clínica y diagnóstico diferencial',
      HARD: 'casos complejos con múltiples variables y juicio clínico avanzado'
    };

    return `
Eres un experto en educación médica creando preguntas de alta calidad para el examen EUNACOM.

PREGUNTA BASE: "${baseQuestion}"

CLASIFICACIÓN:
- Especialidad: ${analysis.specialty}
- Tema: ${analysis.topic}
- Subtema: ${analysis.subtopic || 'N/A'}
- Tipo: ${analysis.questionType}

TAREA: Crear la variación #${variationNumber} con dificultad ${difficulty}.

CRITERIOS PARA DIFICULTAD ${difficulty}:
${difficultyDescriptions[difficulty]}

REQUISITOS DE CALIDAD:
1. La pregunta debe ser clínicamente relevante y precisa
2. Crear exactamente 4 alternativas (A, B, C, D)
3. Solo UNA alternativa correcta
4. Las alternativas incorrectas deben ser plausibles pero claramente incorrectas
5. Explicación detallada de por qué la respuesta correcta es la mejor opción
6. Explicación de por qué las otras alternativas son incorrectas

Responde en formato JSON:
{
  "content": "texto de la pregunta variada",
  "explanation": "explicación detallada de la respuesta correcta y conceptos importantes",
  "alternatives": [
    {
      "text": "alternativa A",
      "isCorrect": true/false,
      "explanation": "por qué esta alternativa es correcta/incorrecta"
    },
    {
      "text": "alternativa B",
      "isCorrect": true/false,
      "explanation": "por qué esta alternativa es correcta/incorrecta"
    },
    {
      "text": "alternativa C",
      "isCorrect": true/false,
      "explanation": "por qué esta alternativa es correcta/incorrecta"
    },
    {
      "text": "alternativa D",
      "isCorrect": true/false,
      "explanation": "por qué esta alternativa es correcta/incorrecta"
    }
  ]
}

IMPORTANTE: La explicación debe ser exhaustiva, educativa y basada en evidencia médica actual.

Responde SOLO con el JSON, sin texto adicional.
`;
  }

  /**
   * Make request to DeepSeek API
   */
  private async makeAIRequest(prompt: string, type: 'analysis' | 'variation'): Promise<string> {
    logger.info(`Making AI request for ${type}...`);

    if (!this.apiKey) {
      logger.error('DeepSeek API key not configured');
      throw new Error('DeepSeek API key not configured');
    }

    logger.info(`Making request to: ${this.baseUrl}/chat/completions`);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: type === 'variation' ? 0.7 : 0.3, // More creativity for variations
        max_tokens: type === 'variation' ? 2000 : 1000
      })
    });

    logger.info(`API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`DeepSeek API error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logger.info(`API response received successfully`);
    return (data as any).choices[0].message.content;
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      // Clean the response (remove any markdown formatting)
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      return {
        specialty: parsed.specialty || 'Medicina General',
        topic: parsed.topic || 'General',
        subtopic: parsed.subtopic,
        confidence: parsed.confidence || 0.5,
        keywords: parsed.keywords || [],
        learningObjectives: parsed.learningObjectives || [],
        questionType: parsed.questionType || 'CONCEPT',
        baseDifficulty: parsed.baseDifficulty || 'MEDIUM',
        reviewNotes: parsed.reviewNotes
      };

    } catch (error) {
      logger.error('Error parsing AI analysis response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Parse AI variation response
   */
  private parseVariationResponse(response: string): QuestionVariationResult {
    try {
      // Clean the response (remove any markdown formatting)
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      // Validate structure
      if (!parsed.content || !parsed.explanation || !Array.isArray(parsed.alternatives)) {
        throw new Error('Missing required fields in variation response');
      }

      if (parsed.alternatives.length !== 4) {
        throw new Error('Must have exactly 4 alternatives');
      }

      const correctCount = parsed.alternatives.filter((alt: any) => alt.isCorrect).length;
      if (correctCount !== 1) {
        throw new Error('Must have exactly 1 correct alternative');
      }

      return {
        content: parsed.content,
        explanation: parsed.explanation,
        alternatives: parsed.alternatives.map((alt: any) => ({
          text: alt.text,
          isCorrect: alt.isCorrect,
          explanation: alt.explanation || ''
        }))
      };

    } catch (error) {
      logger.error('Error parsing AI variation response:', error);
      throw new Error('Invalid AI variation response format');
    }
  }

  /**
   * Fallback analysis when AI is not available
   */
  private async fallbackAnalysis(questionContent: string): Promise<AIAnalysisResult> {
    try {
      // Use the database taxonomy service for basic classification
      const classification = await EunacomTaxonomyDbService.classifyQuestionBasic(questionContent);

      return {
        specialty: classification.specialtyName,
        topic: classification.topicName || 'General',
        subtopic: undefined,
        confidence: classification.confidence,
        keywords: classification.keywords,
        learningObjectives: classification.learningObjectives,
        questionType: classification.questionType,
        baseDifficulty: 'MEDIUM',
        reviewNotes: 'Clasificación automática basada en palabras clave (AI no disponible)'
      };
    } catch (error) {
      logger.error('Error in fallback analysis:', error);

      // Ultimate fallback
      return {
        specialty: 'Medicina Interna',
        topic: 'General',
        subtopic: undefined,
        confidence: 0.1,
        keywords: [],
        learningObjectives: [],
        questionType: 'CONCEPT',
        baseDifficulty: 'MEDIUM',
        reviewNotes: 'Clasificación por defecto (error en análisis automático)'
      };
    }
  }

  /**
   * Fallback variation generation when AI is not available
   */
  private fallbackVariation(baseQuestion: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): QuestionVariationResult {
    return {
      content: `${baseQuestion} (Variación ${difficulty})`,
      explanation: 'Explicación generada automáticamente. Requiere revisión manual.',
      alternatives: [
        {
          text: 'Opción A (requiere completar)',
          isCorrect: true,
          explanation: 'Requiere completar explicación'
        },
        {
          text: 'Opción B (requiere completar)',
          isCorrect: false,
          explanation: 'Requiere completar explicación'
        },
        {
          text: 'Opción C (requiere completar)',
          isCorrect: false,
          explanation: 'Requiere completar explicación'
        },
        {
          text: 'Opción D (requiere completar)',
          isCorrect: false,
          explanation: 'Requiere completar explicación'
        }
      ]
    };
  }
}