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

const EVAL_PROMPT = `Eres un médico experto evaluador del examen EUNACOM de Chile.

Evalúa esta pregunta de opción múltiple con MÁXIMA ATENCIÓN a inconsistencias clínicas, errores fácticos y errores de contenido.

🔴 **PRIORIDAD MÁXIMA: DETECTAR INCONSISTENCIAS CLÍNICAS GRAVES**
Busca activamente errores como:
- Hombres embarazados, amamantando, con parto, etc.
- Niños de 2 años con "40 años de tabaquismo"
- Pacientes con órganos que no corresponden a su anatomía
- Enfermedades imposibles para la edad o sexo del paciente
- Contradicciones entre síntomas y diagnóstico
- Medicamentos contraindicados para la condición del paciente
- Dosis absurdas o peligrosas

Devuelve SOLO JSON estricto (sin markdown):
{
  "labels": ["etiqueta1", "etiqueta2"],
  "scores": {
    "claridad": 0.0-1.0,
    "plausibilidad": 0.0-1.0,
    "explicaciones": 0.0-1.0
  },
  "critique": "Descripción específica del problema, citando el texto exacto que causa el error",
  "confidence": 0.0-1.0
}

**Etiquetas válidas** (usa TODAS las que apliquen):
- "clinica_inconsistente": Inconsistencia clínica GRAVE (ej: hombre embarazado, edad imposible, anatomía incorrecta)
- "error_contenido": Error fáctico en contenido médico
- "clave_incorrecta": La alternativa marcada como correcta NO es la mejor opción
- "distractores_debiles": Los distractores son obviamente incorrectos o poco plausibles
- "explicacion_correcta_pobre": La explicación de la alternativa correcta es insuficiente
- "ok": La pregunta cumple con todos los criterios de calidad

**IMPORTANTE:**
- Si detectas UN SOLO error grave (ej: hombre embarazado), marca "clinica_inconsistente" con confidence > 0.95
- NO marques "ok" si hay algún problema detectado
- Sé CRÍTICO y RIGUROSO. Es mejor reportar un falso positivo que dejar pasar un error grave

---

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

