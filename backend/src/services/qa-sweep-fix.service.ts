import { OpenAI } from 'openai';
import { prisma } from '../lib/prisma';
import { QAItem } from './qa-sweep.service';
import { Decimal } from '@prisma/client/runtime/library';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PatchData {
  type: 'stem' | 'alternative' | 'explanation' | 'difficulty';
  field: string;
  originalValue: any;
  proposedValue: any;
  reason: string;
  confidence: number;
}

export interface FixResult {
  variationId: string;
  patches: PatchData[];
  overallConfidence: number;
  requiresExpertReview: boolean;
  reviewNotes?: string;
}

// Determina si el error es auto-corregible
export function isAutoFixable(labels: string[]): boolean {
  const autoFixableLabels = [
    'sin_interrogacion',
    'pregunta_corta',
    'dificultad_invalida',
    'explicacion_correcta_insuficiente',
    'explicaciones_incorrectas_insuficientes',
    'explicacion_global_insuficiente',
    'alternativas_cortas'
  ];

  const criticalLabels = [
    'sin_contenido',
    'sin_alternativas',
    'sin_alternativa_correcta',
    'multiples_correctas',
    'pregunta_muy_larga',
    'alternativas_vacias',
    'clave_incorrecta',
    'clinica_inconsistente',
    'error_contenido'
  ];

  // Si tiene errores críticos, NO es auto-fixable
  if (labels.some(l => criticalLabels.includes(l))) {
    return false;
  }

  // Si solo tiene errores auto-fixables u 'ok'
  return labels.every(l => autoFixableLabels.includes(l) || l === 'ok');
}

export function calculateRiskLevel(labels: string[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const criticalLabels = ['sin_contenido', 'sin_alternativa_correcta', 'multiples_correctas', 
                          'clave_incorrecta', 'clinica_inconsistente', 'error_contenido'];
  const mediumLabels = ['pregunta_larga', 'sin_contexto_medico', 'distractores_debiles'];

  if (labels.some(l => criticalLabels.includes(l))) return 'HIGH';
  if (labels.some(l => mediumLabels.includes(l))) return 'MEDIUM';
  return 'LOW';
}

// Genera fix con LLM
export async function generateFixWithLLM(item: QAItem, labels: string[], critique: string): Promise<FixResult> {
  const prompt = buildFixPrompt(item, labels, critique);

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No se recibió contenido de la API para el fix');
    const parsed = JSON.parse(content);

    return {
      variationId: item.variationId,
      patches: parsed.patches || [],
      overallConfidence: parsed.overallConfidence || 0,
      requiresExpertReview: parsed.requiresExpertReview || false,
      reviewNotes: parsed.reviewNotes
    };
  } catch (error) {
    console.error('Error generating fix:', error);
    
    // Retornar resultado vacío en caso de error
    return {
      variationId: item.variationId,
      patches: [],
      overallConfidence: 0,
      requiresExpertReview: true,
      reviewNotes: `Error al generar fix: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Aplica el patch a la base de datos
export async function applyPatchToDB(variationId: string, patches: PatchData[]): Promise<boolean> {
  try {
    for (const patch of patches) {
      if (patch.type === 'stem') {
        await prisma.questionVariation.update({
          where: { id: variationId },
          data: { content: patch.proposedValue }
        });
      } else if (patch.type === 'explanation') {
        if (patch.field === 'explanation') {
          await prisma.questionVariation.update({
            where: { id: variationId },
            data: { explanation: patch.proposedValue }
          });
        } else if (patch.field.startsWith('alternatives[')) {
          // Extraer ID de alternativa del field
          const altIdMatch = patch.field.match(/alternatives\[(\d+)\]/);
          if (altIdMatch) {
            const altIndex = parseInt(altIdMatch[1]);
            const alternatives = await prisma.alternative.findMany({
              where: { variationId },
              orderBy: { order: 'asc' }
            });
            if (alternatives[altIndex]) {
              await prisma.alternative.update({
                where: { id: alternatives[altIndex].id },
                data: { explanation: patch.proposedValue }
              });
            }
          }
        }
      } else if (patch.type === 'difficulty') {
        await prisma.questionVariation.update({
          where: { id: variationId },
          data: { difficulty: patch.proposedValue }
        });
      } else if (patch.type === 'alternative') {
        // Similar logic for alternatives text
        const altIdMatch = patch.field.match(/alternatives\[(\d+)\]\.text/);
        if (altIdMatch) {
          const altIndex = parseInt(altIdMatch[1]);
          const alternatives = await prisma.alternative.findMany({
            where: { variationId },
            orderBy: { order: 'asc' }
          });
          if (alternatives[altIndex]) {
            await prisma.alternative.update({
              where: { id: alternatives[altIndex].id },
              data: { text: patch.proposedValue }
            });
          }
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error applying patch:', error);
    return false;
  }
}

function buildFixPrompt(item: QAItem, labels: string[], critique: string): string {
  return `Eres un experto en mejorar preguntas clínicas EUNACOM.

PROBLEMAS DETECTADOS:
${labels.join(', ')}

EVALUACIÓN:
${critique}

PREGUNTA ACTUAL:
${item.stem}

ALTERNATIVAS:
${item.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.text} ${o.isCorrect ? '✓' : ''}\n   Explicación: ${o.explanation || 'N/A'}`).join('\n')}

EXPLICACIÓN GLOBAL:
${item.explanation || 'N/A'}

INSTRUCCIONES:
Genera correcciones específicas en formato JSON:

{
  "patches": [
    {
      "type": "stem|alternative|explanation|difficulty",
      "field": "nombre_campo",
      "originalValue": "valor_actual",
      "proposedValue": "valor_mejorado",
      "reason": "por_qué_este_cambio",
      "confidence": 0.0-1.0
    }
  ],
  "overallConfidence": 0.0-1.0,
  "requiresExpertReview": boolean,
  "reviewNotes": "notas_opcionales"
}

REGLAS:
1. Solo corrige lo necesario para resolver los problemas
2. Mantén precisión clínica
3. confidence > 0.85 para cambios menores (formato, ortografía)
4. confidence < 0.7 para contenido clínico
5. requiresExpertReview=true si hay duda clínica seria
6. Si el problema es "sin_interrogacion", agrega "¿" al inicio y "?" al final
7. Si el problema es "dificultad_invalida", asigna "MEDIUM" como default
8. Si el problema es explicación insuficiente, expande con contexto médico relevante`;
}

function extractJSON(raw: any): string {
  if (!raw) throw new Error('Empty response');
  
  if (typeof raw === 'string') {
    const cleaned = raw.trim();
    // Remove markdown code blocks
    if (cleaned.startsWith('```')) {
      return cleaned.replace(/```json?/gi, '').replace(/```$/g, '').trim();
    }
    return cleaned;
  }
  
  if (typeof raw === 'object') {
    if (raw.output_text) return String(raw.output_text);
    if (Array.isArray(raw.output)) {
      for (const item of raw.output) {
        if (item?.type === 'message' && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part?.type === 'text' && part.text) {
              if (typeof part.text === 'string') return part.text;
              if (part.text?.value) return String(part.text.value);
            }
            if (part?.type === 'output_text' && part.text) return String(part.text);
          }
        }
      }
    }
  }
  
  throw new Error('Could not extract JSON from response');
}

