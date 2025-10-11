import OpenAI from 'openai';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export class OpenAIService {
  private client: OpenAI;
  private modelEval: string;
  private modelFix: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    this.modelEval = process.env.MODEL_EVAL || 'gpt-4o-mini';
    this.modelFix = process.env.MODEL_FIX || 'gpt-4o';
  }

  /**
   * Llama a la API de OpenAI con el modelo especificado
   */
  private async callOpenAI(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2
  ): Promise<{ content: any; tokensIn: number; tokensOut: number; latencyMs: number }> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat.completions.create({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000
      });

      const latencyMs = Date.now() - startTime;
      const content = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        content,
        tokensIn: response.usage?.prompt_tokens || 0,
        tokensOut: response.usage?.completion_tokens || 0,
        latencyMs
      };
    } catch (error) {
      logger.error('OpenAI API call failed:', error);
      throw new Error(`OpenAI API call failed: ${error}`);
    }
  }

  /**
   * Carga un prompt desde archivo
   */
  private async loadPrompt(filename: string): Promise<string> {
    try {
      const promptPath = path.join(__dirname, '../../prompts', filename);
      return await fs.readFile(promptPath, 'utf-8');
    } catch (error) {
      logger.error(`Failed to load prompt ${filename}:`, error);
      throw new Error(`Failed to load prompt: ${filename}`);
    }
  }

  /**
   * Evalúa un ejercicio usando GPT-4o Mini
   */
  async evaluateExercise(exerciseJson: any): Promise<{
    evaluation: any;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  }> {
    try {
      const systemPrompt = 'Eres un auditor clínico multi-especialidad y corrector pedagógico.';
      const userPrompt = (await this.loadPrompt('evaluacion_gpt4o_mini.txt'))
        .replace('{{EJERCICIO_ORIGINAL}}', JSON.stringify(exerciseJson, null, 2));

      const result = await this.callOpenAI(this.modelEval, systemPrompt, userPrompt);
      
      logger.info('Exercise evaluation completed', {
        model: this.modelEval,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs
      });

      return {
        evaluation: result.content,
        ...result
      };
    } catch (error) {
      logger.error('Exercise evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Pule un ejercicio usando GPT-4o
   */
  async polishExercise(exerciseJson: any, evaluation: any): Promise<{
    correction: any;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  }> {
    try {
      const systemPrompt = 'Eres un médico revisor y redactor pedagógico.';
      const userPrompt = (await this.loadPrompt('pulido_gpt4o.txt'))
        .replace('{{EJERCICIO_ORIGINAL}}', JSON.stringify(exerciseJson, null, 2))
        .replace('{{SALIDA_EVALUACION}}', JSON.stringify(evaluation, null, 2));

      const result = await this.callOpenAI(this.modelFix, systemPrompt, userPrompt);
      
      logger.info('Exercise polishing completed', {
        model: this.modelFix,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs
      });

      return {
        correction: result.content,
        ...result
      };
    } catch (error) {
      logger.error('Exercise polishing failed:', error);
      throw error;
    }
  }

  /**
   * Reescribe profundamente un ejercicio usando GPT-4o
   */
  async rewriteExercise(exerciseJson: any, evaluation: any): Promise<{
    correction: any;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  }> {
    try {
      const systemPrompt = 'Eres un revisor clínico experto (todas las especialidades) y redactor pedagógico.';
      const userPrompt = (await this.loadPrompt('reescritura_profunda_gpt4o.txt'))
        .replace('{{EJERCICIO_ORIGINAL}}', JSON.stringify(exerciseJson, null, 2))
        .replace('{{SALIDA_EVALUACION}}', JSON.stringify(evaluation, null, 2));

      const result = await this.callOpenAI(this.modelFix, systemPrompt, userPrompt);
      
      logger.info('Exercise deep rewrite completed', {
        model: this.modelFix,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs
      });

      return {
        correction: result.content,
        ...result
      };
    } catch (error) {
      logger.error('Exercise deep rewrite failed:', error);
      throw error;
    }
  }

  /**
   * Analiza una pregunta para determinar especialidad y tema
   */
  async analyzeQuestion(questionContent: string): Promise<{
    specialty: string;
    topic: string;
    difficulty: string;
  }> {
    try {
      const systemPrompt = 'Eres un experto en medicina que clasifica preguntas médicas por especialidad, tema y dificultad.';
      const userPrompt = `Analiza esta pregunta médica y determina:
1. Especialidad médica (ej: OBSTETRICIA Y GINECOLOGÍA, PEDIATRÍA, etc.)
2. Tema específico (ej: Ginecología, Neumonía, etc.)
3. Nivel de dificultad (facil, medio, dificil)

Pregunta: ${questionContent}

Responde en formato JSON:
{
  "specialty": "ESPECIALIDAD",
  "topic": "TEMA",
  "difficulty": "NIVEL"
}`;

      const result = await this.callOpenAI('gpt-4o-mini', systemPrompt, userPrompt);
      return result.content;
    } catch (error) {
      logger.error('Question analysis failed:', error);
      throw error;
    }
  }

  /**
   * Genera una variación de pregunta
   */
  async generateQuestionVariation(originalQuestion: string, variationNumber: number): Promise<{
    content: string;
    explanation: string;
    alternatives: Array<{
      text: string;
      isCorrect: boolean;
      explanation: string;
    }>;
  }> {
    try {
      const systemPrompt = 'Eres un experto en medicina que crea variaciones de preguntas médicas manteniendo la misma competencia pero cambiando el contexto.';
      const userPrompt = `Crea la variación ${variationNumber} de esta pregunta médica:

Pregunta original: ${originalQuestion}

Mantén:
- La misma competencia médica
- El mismo nivel de dificultad
- Una sola respuesta correcta
- Distractores plausibles

Responde en formato JSON:
{
  "content": "NUEVA_PREGUNTA",
  "explanation": "EXPLICACION_GLOBAL",
  "alternatives": [
    {"text": "Alternativa A", "isCorrect": false, "explanation": "Explicación A"},
    {"text": "Alternativa B", "isCorrect": true, "explanation": "Explicación B"},
    {"text": "Alternativa C", "isCorrect": false, "explanation": "Explicación C"},
    {"text": "Alternativa D", "isCorrect": false, "explanation": "Explicación D"}
  ]
}`;

      const result = await this.callOpenAI('gpt-4o', systemPrompt, userPrompt);
      return result.content;
    } catch (error) {
      logger.error('Question variation generation failed:', error);
      throw error;
    }
  }

  /**
   * Procesa un ejercicio completo según la política de decisión
   */
  async processExercise(exerciseJson: any): Promise<{
    evaluation: any;
    correction?: any;
    result: 'NO_CAMBIOS' | 'PULIDO' | 'REESCRITO';
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  }> {
    // 1. Evaluación
    const evaluationResult = await this.evaluateExercise(exerciseJson);
    const evaluation = evaluationResult.evaluation;

    // 2. Decisión basada en severidad
    const severity = evaluation.severidad_global || 0;
    const safetyRisk = evaluation.scorecard?.riesgo_seguridad || 0;

    let correction: any = undefined;
    let result: 'NO_CAMBIOS' | 'PULIDO' | 'REESCRITO' = 'NO_CAMBIOS';

    // 3. Aplicar política de decisión
    if (severity === 0) {
      result = 'NO_CAMBIOS';
    } else if (severity === 1 && safetyRisk < 2) {
      // Pulido
      const polishResult = await this.polishExercise(exerciseJson, evaluation);
      correction = polishResult.correction;
      result = 'PULIDO';
    } else {
      // Reescritura profunda
      const rewriteResult = await this.rewriteExercise(exerciseJson, evaluation);
      correction = rewriteResult.correction;
      result = 'REESCRITO';
    }

    const totalTokensIn = evaluationResult.tokensIn + (correction ? 0 : 0);
    const totalTokensOut = evaluationResult.tokensOut + (correction ? 0 : 0);
    const totalLatencyMs = evaluationResult.latencyMs + (correction ? 0 : 0);

    return {
      evaluation,
      correction,
      result,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      latencyMs: totalLatencyMs
    };
  }
}