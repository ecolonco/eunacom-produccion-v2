import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import {
  fetchQuestionsByRowRange,
  fetchVariationsByIds,
  runPrechecks,
  processItemsConcurrently,
  QAItem
} from '../services/qa-sweep.service';
import { callLLMEval } from '../services/qa-sweep-llm.service';

const router = Router();

interface RunParams {
  from: number;
  to: number;
  apply: boolean;
  useLLM: boolean;
  concurrency: number;
}

function parseParams(body: any): RunParams {
  const from = Number(body?.from);
  const to = Number(body?.to);
  const apply = Boolean(body?.apply);
  const useLLM = body?.useLLM === undefined ? true : Boolean(body.useLLM);
  const concurrency = Number(body?.concurrency ?? 4);

  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw new Error('Los parámetros "from" y "to" son requeridos y deben ser numéricos');
  }
  if (from > to) {
    throw new Error('"from" debe ser menor o igual a "to"');
  }

  return {
    from,
    to,
    apply,
    useLLM,
    concurrency: Math.max(1, Math.min(concurrency, 12))
  };
}

async function storePrecheckResult(runId: string, item: QAItem, labels: string[], scores: Record<string, number>, notes: string[]) {
  await prisma.qAResult.create({
    data: {
      runId,
      baseId: item.baseId,
      variationId: item.variationId,
      stage: 'PRECHECK',
      labels,
      scores,
      critique: notes.join(' • ')
    }
  });
}

router.post('/run', authenticate, async (req, res) => {
  let runId: string | null = null;

  try {
    const params = parseParams(req.body ?? {});

    const storedParams: Prisma.JsonObject = {
      from: params.from,
      to: params.to,
      apply: params.apply,
      useLLM: params.useLLM,
      concurrency: params.concurrency
    };

    const run = await prisma.qARun.create({
      data: {
        params: storedParams,
        status: 'RUNNING'
      }
    });
    runId = run.id;

    const items = await fetchQuestionsByRowRange({ from: params.from, to: params.to });

    if (items.length === 0) {
      await prisma.qARun.update({
        where: { id: run.id },
        data: {
          status: 'DONE',
          finishedAt: new Date(),
          summary: {
            total: 0,
            accepted: 0,
            fixed: 0,
            rejected: 0
          }
        }
      });

      return res.status(404).json({
        success: false,
        message: `No se encontraron ejercicios en el rango ${params.from}-${params.to}`
      });
    }

    let accepted = 0;
    let rejected = 0;

    await processItemsConcurrently(items, async (item) => {
      const precheck = runPrechecks(item);
      await storePrecheckResult(run.id, item, precheck.labels, precheck.scores, precheck.notes);
      if (precheck.ok) {
        accepted += 1;
      } else {
        rejected += 1;
      }
      if (params.useLLM) {
        const evalResult = await callLLMEval(item);
        if (evalResult) {
          await prisma.qAResult.create({
            data: {
              runId: run.id,
              baseId: item.baseId,
              variationId: item.variationId,
              stage: 'LLM_EVAL',
              labels: evalResult.labels,
              scores: evalResult.scores,
              critique: evalResult.critique,
              riskLevel: evalResult.confidence >= 0.75 ? 'LOW' : 'MEDIUM'
            }
          });
        }
      }
    }, params.concurrency);

    const summary = {
      total: items.length,
      accepted,
      fixed: 0,
      rejected
    };

    await prisma.qARun.update({
      where: { id: run.id },
      data: {
        status: 'DONE',
        finishedAt: new Date(),
        summary
      }
    });

    return res.json({
      success: true,
      runId: run.id,
      range: { from: params.from, to: params.to },
      apply: params.apply,
      useLLM: params.useLLM,
      concurrency: params.concurrency,
      ...summary
    });
  } catch (error: any) {
    if (runId) {
      await prisma.qARun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          summary: {
            message: error.message
          }
        }
      }).catch(() => undefined);
    }

    console.error('QA Sweep Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

router.get('/run/:id', authenticate, async (req, res) => {
  try {
    const run = await prisma.qARun.findUnique({
      where: { id: req.params.id }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Run no encontrado' });
    }

    return res.json({
      success: true,
      run: {
        id: run.id,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        status: run.status,
        params: run.params,
        summary: run.summary
      }
    });
  } catch (error: any) {
    console.error('QA Sweep run fetch error:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.get('/runs', authenticate, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 100) : 20;

    const runs = await prisma.qARun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit
    });

    return res.json({
      success: true,
      runs: runs.map((run) => ({
        id: run.id,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        status: run.status,
        summary: run.summary,
        params: run.params
      }))
    });
  } catch (error: any) {
    console.error('QA Sweep runs fetch error:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

router.get('/run/:id/results', authenticate, async (req, res) => {
  try {
    const stage = typeof req.query.stage === 'string' ? req.query.stage : undefined;
    const limitRaw = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;

    const run = await prisma.qARun.findUnique({
      where: { id: req.params.id }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Run no encontrado' });
    }

    const results = await prisma.qAResult.findMany({
      where: {
        runId: req.params.id,
        ...(stage ? { stage } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    if (results.length === 0) {
      return res.json({ success: true, runId: run.id, results: [] });
    }

    const variationIds = Array.from(new Set(results.map((r) => r.variationId)));
    const variationMap = await fetchVariationsByIds(variationIds);

    return res.json({
      success: true,
      runId: run.id,
      count: results.length,
      results: results.map((result) => ({
        id: result.id,
        baseId: result.baseId,
        variationId: result.variationId,
        stage: result.stage,
        labels: result.labels,
        scores: result.scores,
        critique: result.critique,
        patch: result.patch,
        riskLevel: result.riskLevel,
        applied: result.applied,
        createdAt: result.createdAt,
        variation: variationMap.get(result.variationId) ?? null
      }))
    });
  } catch (error: any) {
    console.error('QA Sweep results fetch error:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export default router;
