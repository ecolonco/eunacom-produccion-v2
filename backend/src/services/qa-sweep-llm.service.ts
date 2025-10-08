import { OpenAI } from 'openai';
import { QAItem } from './qa-sweep.service';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface LLMScoreMap {
  [key: string]: number;
}

export interface LLMEvaluationResult {
  labels: string[];
  scores: LLMScoreMap;
  critique: string;
  confidence: number;
}

const EVAL_PROMPT = `Eres un experto clínico del examen EUNACOM. Evalúa esta pregunta de opción múltiple.
Devuelve JSON estricto con el formato:
{
  "labels": ["etiqueta"...],
  "scores": {"claridad": 0-1, "plausibilidad": 0-1, "explicaciones": 0-1},
  "critique": "texto breve",
  "confidence": 0-1
}

Etiquetas válidas: "clave_incorrecta", "clínica_inconsistente", "explicacion_correcta_pobre", "distractores_debiles", "error_contenido", "ok".

Pregunta base:
{{baseContent}}

Variación #{{variationNumber}} (dificultad {{difficulty}}):
{{stem}}

Alternativas:
{{alternatives}}

Explicación global:
{{explanation}}
`;

function buildAlternativesForPrompt(item: QAItem): string {
  return item.options
    .map((opt, idx) => {
      const letter = String.fromCharCode(65 + idx);
      const marker = opt.isCorrect ? ' (correcta)' : '';
      const explanation = opt.explanation ? ` -> ${opt.explanation}` : '';
      return `${letter}) ${opt.text}${marker}${explanation}`;
    })
    .join('\n');
}

function buildEvalPrompt(item: QAItem): string {
  return EVAL_PROMPT
    .replace('{{baseContent}}', item.baseContent)
    .replace('{{variationNumber}}', String(item.variationNumber))
    .replace('{{difficulty}}', item.difficulty ?? 'N/A')
    .replace('{{stem}}', item.stem)
    .replace('{{alternatives}}', buildAlternativesForPrompt(item))
    .replace('{{explanation}}', item.explanation ?? '');
}

function extractJSON(raw: any): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object') {
    if (raw.output_text) return String(raw.output_text);
    if (Array.isArray(raw.output)) {
      for (const item of raw.output) {
        if (item?.type === 'message' && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part?.type === 'output_text' && part.text) return String(part.text);
            if (part?.type === 'text' && part.text) {
              if (typeof part.text === 'string') return part.text;
              if (part.text?.value) return String(part.text.value);
            }
          }
        }
      }
    }
  }
  return null;
}

function safeParse(jsonString: string | null): LLMEvaluationResult | null {
  if (!jsonString) return null;
  let cleaned = jsonString.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?/gi, '').replace(/```$/g, '').trim();
  }
  try {
    const parsed = JSON.parse(cleaned);
    const result: LLMEvaluationResult = {
      labels: Array.isArray(parsed.labels) ? parsed.labels.map((l: any) => String(l)) : [],
      scores: typeof parsed.scores === 'object' && parsed.scores !== null ? parsed.scores : {},
      critique: typeof parsed.critique === 'string' ? parsed.critique : '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0
    };
    return result;
  } catch (error) {
    return null;
  }
}

export async function callLLMEval(item: QAItem): Promise<LLMEvaluationResult | null> {
  const prompt = buildEvalPrompt(item);

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No se recibió contenido de la API');
    return safeParse(content);
  } catch (error) {
    console.error('QA Sweep LLM eval error:', error);
    return null;
  }
}

