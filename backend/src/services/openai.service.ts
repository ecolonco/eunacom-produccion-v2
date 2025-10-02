import OpenAI from 'openai';
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

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || '';

    logger.info(`OpenAI API Key configured: ${apiKey ? 'YES' : 'NO'}`);

    if (!apiKey) {
      logger.warn('OPENAI_API_KEY not configured. AI features will be limited.');
      throw new Error('OpenAI API Key is required');
    } else {
      logger.info(`OpenAI API Key length: ${apiKey.length} characters`);
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze a question using OpenAI to classify it according to EUNACOM taxonomy
   */
  async analyzeQuestion(questionContent: string): Promise<AIAnalysisResult> {
    try {
      logger.info(`Starting OpenAI analysis for question: ${questionContent.substring(0, 100)}...`);

      const prompt = await this.buildAnalysisPrompt(questionContent);
      const response = await this.makeAIRequest(prompt, 'analysis');

      logger.info(`OpenAI analysis response received: ${response.substring(0, 200)}...`);

      const result = this.parseAnalysisResponse(response);
      logger.info(`Analysis successful: ${result.specialty} -> ${result.topic}`);

      return result;

    } catch (error) {
      logger.error('Error in OpenAI question analysis:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a question variation using OpenAI
   */
  async generateQuestionVariation(
    baseQuestion: string,
    analysis: QuestionClassification,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    variationNumber: number
  ): Promise<QuestionVariationResult> {
    try {
      logger.info(`Generating variation ${variationNumber} with difficulty ${difficulty}...`);

      const prompt = this.buildVariationPrompt(baseQuestion, analysis, difficulty, variationNumber);
      const response = await this.makeAIRequest(prompt, 'variation');

      logger.info(`OpenAI variation response received: ${response.substring(0, 200)}...`);

      const result = this.parseVariationResponse(response);
      logger.info(`Variation generated successfully with ${result.alternatives.length} alternatives`);

      return result;

    } catch (error) {
      logger.error('Error in OpenAI question variation:', error);
      throw new Error(`Variation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make a request to OpenAI API using GPT-5 Mini with Responses API
   */
  private async makeAIRequest(prompt: string, type: 'analysis' | 'variation'): Promise<string> {
    try {
      logger.info(`Making OpenAI GPT-5 Mini ${type} request...`);

      // Try GPT-5 Mini first with new Responses API
      try {
        const systemPrompt = "Eres un experto médico especializado en educación médica chilena y el examen EUNACOM. Responde siempre en español y en formato JSON válido.";
        const fullInput = `${systemPrompt}\n\n${prompt}`;

        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "gpt-5-mini",
            input: fullInput,
            reasoning: {
              effort: type === 'analysis' ? "low" : "minimal" // Low for analysis, minimal for variations
            },
            text: {
              verbosity: "medium" // Balanced output length
            },
            max_output_tokens: 2000
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          const result = data.output_text || data.choices?.[0]?.message?.content;
          
          if (result) {
            logger.info(`OpenAI GPT-5 Mini ${type} request completed successfully`);
            return result;
          }
        } else {
          const errorText = await response.text();
          logger.warn(`GPT-5 Mini failed (${response.status}): ${errorText}, falling back to GPT-4o`);
        }
      } catch (gpt5Error) {
        logger.warn(`GPT-5 Mini request failed: ${gpt5Error instanceof Error ? gpt5Error.message : 'Unknown error'}, falling back to GPT-4o`);
      }

      // Fallback to GPT-4o with Chat Completions API
      logger.info(`Using GPT-4o fallback for ${type} request...`);
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un experto médico especializado en educación médica chilena y el examen EUNACOM. Responde siempre en español y en formato JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: type === 'analysis' ? 0.1 : 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('No response from OpenAI');
      }

      logger.info(`OpenAI GPT-4o fallback ${type} request completed successfully`);
      return response;

    } catch (error) {
      logger.error(`OpenAI ${type} request failed:`, error);
      throw error;
    }
  }

  /**
   * Build prompt for question analysis
   */
  private async buildAnalysisPrompt(questionContent: string): Promise<string> {
    const taxonomyData = await EunacomTaxonomyDbService.getTaxonomyForAI();
    
    // Crear una representación más clara de la taxonomía
    const taxonomyText = taxonomyData.specialties
      .map(spec => {
        const topics = spec.topics.map(topic => `    • ${topic.name}`).join('\n');
        return `🏥 ${spec.name}\n${topics}`;
      })
      .join('\n\n');

    return `Clasifica esta pregunta médica según la taxonomía EUNACOM oficial.

PREGUNTA: "${questionContent}"

TAXONOMÍA EUNACOM (especialidades → temas):
${taxonomyText}

INSTRUCCIONES:
1. Lee la pregunta y identifica el concepto médico principal
2. Busca la ESPECIALIDAD exacta en la lista anterior
3. Busca el TEMA exacto dentro de esa especialidad
4. COPIA los nombres EXACTAMENTE como aparecen en la taxonomía
5. NO inventes nombres nuevos

FORMATO DE RESPUESTA (JSON únicamente):
{
  "specialty": "nombre exacto de especialidad",
  "topic": "nombre exacto de tema", 
  "confidence": 0.95,
  "keywords": ["término1", "término2"],
  "learningObjectives": ["objetivo educativo"],
  "questionType": "CLINICAL_CASE|CONCEPT|PROCEDURE|DIAGNOSIS|TREATMENT|PREVENTION",
  "baseDifficulty": "EASY|MEDIUM|HARD",
  "reviewNotes": "observaciones breves"
}

CRITERIOS DIFICULTAD:
• EASY: Conceptos básicos, definiciones
• MEDIUM: Aplicación clínica, diagnóstico
• HARD: Casos complejos, múltiples variables`;
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

    // Estrategias específicas de diversificación por número de variación
    const variationStrategies = {
      1: 'Cambia la presentación del caso (edad, género, comorbilidades diferentes)',
      2: 'Enfócate en un aspecto diagnóstico diferente (laboratorio vs imagen vs examen físico)',
      3: 'Modifica el contexto clínico (urgencias vs consulta vs hospitalización)',
      4: 'Cambia el enfoque temporal (agudo vs crónico vs seguimiento)',
      5: 'Varía las complicaciones o factores de riesgo presentes',
      6: 'Enfócate en manejo terapéutico o preventivo en lugar de diagnóstico'
    };

    const strategy = variationStrategies[variationNumber as keyof typeof variationStrategies] || 'Crea una variación única y diferente';

    return `
Eres un experto en educación médica y en el examen EUNACOM chileno. 
Recibirás una PREGUNTA BASE (solo el enunciado). 
Tu tarea es transformarla en un ejercicio completo con 4 variaciones de alta calidad, siguiendo las siguientes reglas.

PREGUNTA BASE: "${baseQuestion}"

CLASIFICACIÓN:
- Especialidad: ${analysis.specialty}
- Tema: ${analysis.topic}
- Dificultad: MEDIUM (aplicación clínica con foco en manejo inmediato)

GENERAR VARIACIÓN #${variationNumber}:
- Estrategia específica: ${strategy}

⚖️ REGLAS FUNDAMENTALES:
1. **ENFOQUE CLÍNICO**: Todas las variaciones deben formularse como casos clínicos breves y realistas.
2. **CONTEXTO COMPLETO**: Incluir edad, sexo, antecedentes relevantes y hallazgos clínicos/paraclínicos típicos del cuadro.
3. **URGENCIA Y MANEJO INMEDIATO**: El foco debe estar en la conducta más inmediata o crítica en contexto de urgencia.
   - ❌ No generar preguntas sobre confirmación diagnóstica, estudios de laboratorio, prevención o manejo crónico, salvo que la PREGUNTA BASE lo pida explícitamente.
   - Nunca dar a entender que debe "esperarse" un resultado antes de actuar en una urgencia vital.
4. **PRÁCTICA CHILENA**: Respuesta correcta alineada con guías clínicas del MINSAL y protocolos hospitalarios de Chile.
5. **ALTERNATIVAS**:
   - Exactamente 4 opciones plausibles.
   - 1 correcta (acción inmediata indicada).
   - 3 distractores clínicamente verosímiles, que representen errores comunes.
   - Variar los distractores entre variaciones (no repetir siempre los mismos).
   - ❌ Nunca incluir como distractores exámenes de laboratorio, medidas crónicas, preventivas o irreales.
6. **EXPLICACIONES**:
   - Explicar claramente por qué la opción correcta es la indicada.
   - Explicar por qué cada distractor es incorrecto (ej: efecto tardío, no corresponde en urgencia, es medida secundaria, es diagnóstico diferencial descartado).
   - Lenguaje claro, riguroso y didáctico.
7. **DIVERSIDAD**:
   - Cambiar en cada variación aspectos del caso: edad, sexo, comorbilidades, hallazgos clínicos, contexto (hospital rural, UCI, pediatría, postoperatorio, etc.).
   - Puede añadirse un factor de confusión frecuente (uso de fármacos, transfusión, rabdomiólisis, antecedentes sociales o laborales), pero debe quedar claro que la primera medida inmediata no cambia.

📦 FORMATO DE RESPUESTA (JSON):
{
  "content": "pregunta variada completa",
  "explanation": "explicación general del caso y la respuesta correcta",
  "alternatives": [
    {
      "text": "opción A",
      "isCorrect": true,
      "explanation": "por qué es la opción correcta"
    },
    {
      "text": "opción B",
      "isCorrect": false,
      "explanation": "por qué es incorrecta en este escenario"
    },
    {
      "text": "opción C",
      "isCorrect": false,
      "explanation": "por qué es incorrecta en este escenario"
    },
    {
      "text": "opción D",
      "isCorrect": false,
      "explanation": "por qué es incorrecta en este escenario"
    }
  ]
}

🛡️ ESTÁNDARES DE CALIDAD:
- Caso clínico realista con contexto de urgencia claro
- Distractores diversos y verosímiles entre variaciones
- Explicaciones completas para todas las alternativas
- Fidelidad a guías clínicas chilenas
- Máxima diversidad en escenarios y presentaciones
- Responder SOLO con JSON válido, sin texto adicional
`;
  }

  /**
   * Parse the analysis response from OpenAI
   */
  private parseAnalysisResponse(response: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(response);

      // Validate required fields
      const required = ['specialty', 'topic', 'confidence', 'questionType', 'baseDifficulty'];
      for (const field of required) {
        if (!parsed[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      return {
        specialty: parsed.specialty,
        topic: parsed.topic,
        subtopic: parsed.subtopic || '',
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        learningObjectives: Array.isArray(parsed.learningObjectives) ? parsed.learningObjectives : [],
        questionType: parsed.questionType,
        baseDifficulty: parsed.baseDifficulty,
        reviewNotes: parsed.reviewNotes || ''
      };

    } catch (error) {
      logger.error('Error parsing OpenAI analysis response:', error);
      logger.error('Raw response:', response);
      throw new Error(`Invalid analysis response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse the variation response from OpenAI
   */
  private parseVariationResponse(response: string): QuestionVariationResult {
    try {
      const parsed = JSON.parse(response);

      // Validate required fields
      if (!parsed.content || !parsed.explanation || !Array.isArray(parsed.alternatives)) {
        throw new Error('Missing required fields in variation response');
      }

      if (parsed.alternatives.length !== 4) {
        throw new Error('Variation must have exactly 4 alternatives');
      }

      const correctCount = parsed.alternatives.filter((alt: any) => alt.isCorrect).length;
      if (correctCount !== 1) {
        throw new Error('Variation must have exactly 1 correct alternative');
      }

      return {
        content: parsed.content,
        explanation: parsed.explanation,
        alternatives: parsed.alternatives.map((alt: any) => ({
          text: alt.text,
          isCorrect: Boolean(alt.isCorrect),
          explanation: alt.explanation || ''
        }))
      };

    } catch (error) {
      logger.error('Error parsing OpenAI variation response:', error);
      logger.error('Raw response:', response);
      throw new Error(`Invalid variation response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}