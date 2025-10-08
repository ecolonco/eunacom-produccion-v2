import { logger } from './logger';

const NUMERIC_ID_REGEX = /^\d+(?:\.\d+)?$/;
const NUMERIC_ID_KEYS = [
  'formattedId',
  'formatted_id',
  'displayId',
  'display_id',
  'displayCode',
  'display_code',
  'code',
  'referenceId',
  'reference_id',
  'questionNumber',
  'question_number',
  'originalId',
  'original_id',
  'numericId',
  'numeric_id',
  'number',
  'identifier',
  'baseCode',
  'base_code',
  'baseNumber',
  'base_number',
  'motherId',
  'mother_id',
  'parentId',
  'parent_id',
  'parentCode',
  'parent_code',
  'caseId',
  'case_id',
  'scenarioId',
  'scenario_id',
];

type FindOptions = {
  visited?: WeakSet<object>;
  ignoreKeys?: string[];
  ignoreValues?: string[];
};

const parseJsonSafe = (value: unknown): any | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.debug?.('Failed to parse JSON while extracting formatted ID', { value, error });
      return undefined;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return undefined;
};

const valueToString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

const findNumericIdInObject = (
  source: unknown,
  { visited = new WeakSet<object>(), ignoreKeys = [], ignoreValues = [] }: FindOptions = {}
): string | undefined => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  if (visited.has(source)) {
    return undefined;
  }

  visited.add(source);

  for (const key of NUMERIC_ID_KEYS) {
    if (key in (source as Record<string, unknown>)) {
      const candidate = valueToString((source as Record<string, unknown>)[key]);
      if (candidate && !ignoreValues.includes(candidate) && NUMERIC_ID_REGEX.test(candidate)) {
        return candidate;
      }
    }
  }

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    const loweredKey = key.toLowerCase();
    if (ignoreKeys.some((ignored) => loweredKey.includes(ignored))) {
      continue;
    }

    const candidate = valueToString(value);
    if (candidate && !ignoreValues.includes(candidate) && NUMERIC_ID_REGEX.test(candidate)) {
      return candidate;
    }
  }

  for (const value of Object.values(source as Record<string, unknown>)) {
    if (value && typeof value === 'object') {
      const nested = findNumericIdInObject(value, {
        visited,
        ignoreKeys,
        ignoreValues,
      });
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
};

export const extractFormattedIdentifier = (question: any): string | undefined => {
  if (!question) {
    return undefined;
  }

  const storedValue = valueToString((question as any)?.displayCode);
  if (storedValue && NUMERIC_ID_REGEX.test(storedValue)) {
    return storedValue;
  }

  const sources: any[] = [question];
  const variationNumber = question?.variationNumber ?? question?.variation_number;
  const ignoreValues: string[] = [];
  if (typeof variationNumber === 'number') {
    ignoreValues.push(String(variationNumber));
  }

  const ignoreKeys = ['variation', 'order', 'count', 'index'];

  const baseQuestion = question?.baseQuestion ?? question?.base_question;

  const baseSequence = valueToString(
    baseQuestion?.displaySequence ??
    baseQuestion?.display_sequence ??
    (question as any)?.displaySequence ??
    (question as any)?.display_sequence
  );

  if (baseSequence && NUMERIC_ID_REGEX.test(baseSequence) && typeof variationNumber === 'number') {
    return `${baseSequence}.${variationNumber}`;
  }

  const metadata = parseJsonSafe(question?.metadata);
  if (metadata) {
    sources.push(metadata);
  }

  if (baseQuestion) {
    sources.push(baseQuestion);
    const baseMetadata = parseJsonSafe(baseQuestion?.metadata);
    if (baseMetadata) {
      sources.push(baseMetadata);
    }
  }

  const aiAnalysis = baseQuestion?.aiAnalysis ?? baseQuestion?.ai_analysis ?? question?.aiAnalysis ?? question?.ai_analysis;
  if (aiAnalysis) {
    sources.push(aiAnalysis);
    const analysisData = parseJsonSafe(aiAnalysis.analysisResult ?? aiAnalysis.analysis_result);
    if (analysisData) {
      sources.push(analysisData);
    }
  }

  let baseIdentifier: string | undefined;

  for (const source of sources) {
    const result = findNumericIdInObject(source, {
      ignoreKeys,
      ignoreValues,
    });
    if (result) {
      baseIdentifier = result;
      break;
    }
  }

  if (baseIdentifier && typeof variationNumber === 'number') {
    return `${baseIdentifier}.${variationNumber}`;
  }

  return (
    baseIdentifier ??
    (typeof variationNumber === 'number' ? String(variationNumber) : undefined)
  );
};

export const buildDisplayCode = (question: any): string | null => {
  const identifier = extractFormattedIdentifier(question);
  return identifier ?? null;
};
