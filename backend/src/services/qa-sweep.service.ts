import pLimit from 'p-limit';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface QAOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
  explanation: string | null;
}

export interface QAItem {
  baseId: string;
  variationId: string;
  sequenceNumber?: number | null;
  variationNumber: number;
  baseContent: string;
  stem: string;
  difficulty: string | null;
  explanation: string | null;
  options: QAOption[];
}

export interface FetchRangeParams {
  from: number;
  to: number;
}

export async function fetchQuestionsByRowRange(params: FetchRangeParams): Promise<QAItem[]> {
  const { from, to } = params;

  const rows = await prisma.$queryRaw<{ base_id: string; base_content: string; sequence_number: number; variation_id: string; variation_number: number; variation_content: string; difficulty: string | null; explanation: string | null; }[]>`
    WITH numbered_questions AS (
      SELECT
        id,
        content,
        "createdAt",
        ROW_NUMBER() OVER (ORDER BY "createdAt" ASC)::integer AS sequence_number
      FROM "base_questions"
      WHERE status IN ('COMPLETED', 'REVIEW_REQUIRED', 'APPROVED')
    )
    SELECT
      nq.id      AS base_id,
      nq.content AS base_content,
      nq.sequence_number,
      qv.id      AS variation_id,
      qv.variation_number,
      qv.content AS variation_content,
      qv.difficulty,
      qv.explanation
    FROM numbered_questions nq
    JOIN "question_variations" qv ON qv.base_question_id = nq.id
    WHERE nq.sequence_number BETWEEN ${from} AND ${to}
    ORDER BY nq.sequence_number ASC, qv.variation_number ASC
  `;

  if (rows.length === 0) {
    return [];
  }

  const variationIds = rows.map((row) => row.variation_id);

  const alternatives = await prisma.alternative.findMany({
    where: { variationId: { in: variationIds } },
    orderBy: { order: 'asc' }
  });

  const alternativesByVariation = new Map<string, QAOption[]>();
  for (const alt of alternatives) {
    const entry = alternativesByVariation.get(alt.variationId) ?? [];
    entry.push({
      id: alt.id,
      text: alt.text,
      isCorrect: alt.isCorrect,
      order: alt.order,
      explanation: alt.explanation ?? null
    });
    alternativesByVariation.set(alt.variationId, entry);
  }

  return rows.map((row) => ({
    baseId: row.base_id,
    variationId: row.variation_id,
    sequenceNumber: row.sequence_number,
    variationNumber: row.variation_number,
    baseContent: row.base_content,
    stem: row.variation_content,
    difficulty: row.difficulty,
    explanation: row.explanation ?? null,
    options: alternativesByVariation.get(row.variation_id) ?? []
  }));
}

export async function fetchVariationsByIds(ids: string[]): Promise<Map<string, QAItem>> {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  const variationRows = await prisma.$queryRaw<Array<{
    variation_id: string;
    base_id: string;
    base_content: string;
    sequence_number: number | null;
    variation_number: number;
    variation_content: string;
    difficulty: string | null;
    explanation: string | null;
  }>>(Prisma.sql`
    WITH numbered_questions AS (
      SELECT
        id,
        content,
        ROW_NUMBER() OVER (ORDER BY "created_at" ASC)::integer AS sequence_number
      FROM "base_questions"
    )
    SELECT
      qv.id AS variation_id,
      qv.base_question_id AS base_id,
      nq.content AS base_content,
      nq.sequence_number,
      qv.variation_number,
      qv.content AS variation_content,
      qv.difficulty,
      qv.explanation
    FROM "question_variations" qv
    LEFT JOIN numbered_questions nq ON nq.id = qv.base_question_id
    WHERE qv.id IN (${Prisma.join(ids)})
  `);

  const map = new Map<string, QAItem>();

  for (const row of variationRows) {
    map.set(row.variation_id, {
      baseId: row.base_id,
      variationId: row.variation_id,
      sequenceNumber: row.sequence_number ?? null,
      variationNumber: row.variation_number,
      baseContent: row.base_content,
      stem: row.variation_content,
      difficulty: row.difficulty,
      explanation: row.explanation ?? null,
      options: []
    });
  }

  const variationIds = variationRows.map((row) => row.variation_id);

  const alternatives = await prisma.alternative.findMany({
    where: { variationId: { in: variationIds } },
    orderBy: { order: 'asc' }
  });

  for (const alt of alternatives) {
    const entry = map.get(alt.variationId);
    if (!entry) {
      continue;
    }
    entry.options.push({
      id: alt.id,
      text: alt.text,
      isCorrect: alt.isCorrect,
      order: alt.order,
      explanation: alt.explanation ?? null
    });
  }

  return map;
}

export interface PrecheckResult {
  ok: boolean;
  labels: string[];
  scores: Record<string, number>;
  notes: string[];
}

const MEDICAL_KEYWORDS = ['años', 'paciente', 'consulta', 'examen', 'diagnóstico', 'tratamiento', 'mg/dl', 'síntomas', 'historia', 'clínica'];

export function runPrechecks(item: QAItem): PrecheckResult {
  const labels: string[] = [];
  const notes: string[] = [];
  const scores: Record<string, number> = {};

  const stem = item.stem?.trim() ?? '';
  if (stem.length === 0) {
    labels.push('sin_contenido');
  }
  const endsWithEsColon = /\bes\s*:\s*$/i.test(stem);
  if (stem && !stem.includes('?') && !endsWithEsColon) {
    labels.push('sin_interrogacion');
  }
  if (stem.length < 60) {
    labels.push('pregunta_corta');
  }
  const baseLength = item.baseContent?.trim()?.length ?? 0;
  const twentyFivePercentAboveBase = baseLength > 0 ? baseLength * 1.25 : Infinity;
  const longQuestionMinLength = 700;
  const veryLongQuestionMinLength = 1000;
  if (stem.length >= veryLongQuestionMinLength && stem.length > twentyFivePercentAboveBase) {
    labels.push('pregunta_muy_larga');
  } else if (stem.length >= longQuestionMinLength && stem.length > twentyFivePercentAboveBase) {
    labels.push('pregunta_larga');
  }
  const hasContext = MEDICAL_KEYWORDS.some((keyword) => stem.toLowerCase().includes(keyword));
  if (!hasContext) {
    labels.push('sin_contexto_medico');
  }

  const options = item.options ?? [];
  if (options.length === 0) {
    labels.push('sin_alternativas');
  } else {
    if (options.length !== 4) {
      labels.push('alternativas_distintas_de_4');
    }
    const emptyOptions = options.filter((opt) => !opt.text || opt.text.trim().length === 0);
    if (emptyOptions.length > 0) {
      labels.push('alternativas_vacias');
    }
    const shortOptions = options.filter((opt) => opt.text.trim().length < 8);
    if (shortOptions.length > 0) {
      labels.push('alternativas_cortas');
    }
    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount === 0) {
      labels.push('sin_alternativa_correcta');
    }
    if (correctCount > 1) {
      labels.push('multiples_correctas');
    }
    const correctOption = options.find((opt) => opt.isCorrect);
    if (correctOption && (!correctOption.explanation || correctOption.explanation.trim().length < 20)) {
      labels.push('explicacion_correcta_insuficiente');
    }
    const incorrectExpl = options
      .filter((opt) => !opt.isCorrect)
      .some((opt) => !opt.explanation || opt.explanation.trim().length < 15);
    if (incorrectExpl) {
      labels.push('explicaciones_incorrectas_insuficientes');
    }
  }

  if (!item.explanation || item.explanation.trim().length < 40) {
    labels.push('explicacion_global_insuficiente');
  }

  if (!item.difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(item.difficulty)) {
    labels.push('dificultad_invalida');
  }

  scores.structure = labels.length === 0 ? 1 : Math.max(0, 1 - labels.length * 0.1);
  const ok = !labels.some((label) => ['sin_contenido', 'sin_alternativas', 'sin_alternativa_correcta', 'multiples_correctas', 'pregunta_muy_larga'].includes(label));

  if (ok) {
    notes.push('Pasa precheck heurístico');
  }

  return { ok, labels, scores, notes };
}

export async function processItemsConcurrently<T>(items: T[], handler: (item: T) => Promise<void>, concurrency: number) {
  const limit = pLimit(Math.max(1, Math.min(concurrency, 12)));
  await Promise.all(items.map((item) => limit(() => handler(item))));
}
