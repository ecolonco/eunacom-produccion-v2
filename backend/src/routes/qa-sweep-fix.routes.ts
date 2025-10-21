import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { 
  generateFixWithLLM, 
  isAutoFixable, 
  calculateRiskLevel,
  applyPatchToDB,
  PatchData 
} from '../services/qa-sweep-fix.service';
import { fetchVariationsByIds } from '../services/qa-sweep.service';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

// POST /api/qa-sweep/run/:id/fix
// Ejecuta fase LLM_FIX sobre un run completado
router.post('/run/:id/fix', authenticate, async (req, res) => {
  try {
    const { id: runId } = req.params;
    const { autoApply = true } = req.body;

    // Obtener resultados de LLM_EVAL
    const evalResults = await prisma.qAResult.findMany({
      where: { runId, stage: 'LLM_EVAL' }
    });

    if (evalResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No hay resultados de LLM_EVAL para este run' 
      });
    }

    let autoFixed = 0;
    let pendingReview = 0;
    let errors = 0;

    for (const result of evalResults) {
      try {
        const labels = (result.labels as string[]) || [];
        const critique = result.critique || '';
        const riskLevel = calculateRiskLevel(labels);
        const canAutoFix = isAutoFixable(labels) && riskLevel === 'LOW';

        // Obtener datos de la variación
        const variationMap = await fetchVariationsByIds([result.variationId]);
        const item = variationMap.get(result.variationId);
        
        if (!item) continue;

        // Generar fix con LLM
        const fixResult = await generateFixWithLLM(item, labels, critique);

        const shouldAutoApply = 
          autoApply && 
          canAutoFix && 
          fixResult.overallConfidence >= 0.85 &&
          !fixResult.requiresExpertReview;

        if (shouldAutoApply) {
          // Auto-aplicar fix
          const applied = await applyPatchToDB(result.variationId, fixResult.patches);
          
          await prisma.qAResult.create({
            data: {
              runId,
              baseId: result.baseId,
              variationId: result.variationId,
              stage: 'LLM_FIX',
              labels: ['auto_fixed'],
              scores: {},
              critique: 'Corrección automática aplicada',
              patch: fixResult.patches as any,
              riskLevel: 'LOW',
              applied: applied,
              fixStatus: 'auto_fixed',
              humanReviewRequired: false,
              patchConfidence: new Decimal(fixResult.overallConfidence)
            }
          });
          
          autoFixed++;
        } else {
          // Marcar para revisión humana
          await prisma.qAResult.create({
            data: {
              runId,
              baseId: result.baseId,
              variationId: result.variationId,
              stage: 'LLM_FIX',
              labels,
              scores: {},
              critique: fixResult.reviewNotes || 'Requiere revisión experta',
              patch: fixResult.patches as any,
              riskLevel,
              applied: false,
              fixStatus: 'pending_review',
              humanReviewRequired: true,
              patchConfidence: new Decimal(fixResult.overallConfidence)
            }
          });
          
          pendingReview++;
        }
      } catch (error) {
        console.error('Error processing result:', error);
        errors++;
      }
    }

    return res.json({
      success: true,
      runId,
      summary: {
        total: evalResults.length,
        autoFixed,
        pendingReview,
        errors
      }
    });
  } catch (error: any) {
    console.error('Error in LLM_FIX:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET /api/qa-sweep/review-queue
// Lista ejercicios pendientes de revisión
router.get('/review-queue', authenticate, requireRole(['ADMIN', 'REVIEWER']), async (req, res) => {
  try {
    const { status, priority, limit = 50 } = req.query;

    const where: any = {
      humanReviewRequired: true
    };

    if (status && typeof status === 'string') {
      where.fixStatus = status;
    }

    if (priority && typeof priority === 'string') {
      if (priority === 'critical' || priority === 'high') {
        where.riskLevel = 'HIGH';
      } else if (priority === 'medium') {
        where.riskLevel = 'MEDIUM';
      } else {
        where.riskLevel = 'LOW';
      }
    }

    const results = await prisma.qAResult.findMany({
      where,
      orderBy: [
        { riskLevel: 'desc' },
        { createdAt: 'desc' }
      ],
      take: Math.min(Number(limit), 100)
    });

    // Obtener variaciones
    const variationIds = results.map(r => r.variationId);
    const variationMap = await fetchVariationsByIds(variationIds);

    return res.json({
      success: true,
      count: results.length,
      items: results.map(r => ({
        ...r,
        variation: variationMap.get(r.variationId)
      }))
    });
  } catch (error: any) {
    console.error('Error fetching review queue:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/qa-sweep/review-queue/:id/approve
// Aprobar y aplicar fix sugerido
router.post('/review-queue/:id/approve', authenticate, requireRole(['ADMIN', 'REVIEWER']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await prisma.qAResult.findUnique({ where: { id } });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Resultado no encontrado' });
    }

    const patches = (result.patch as any) || [];
    const applied = await applyPatchToDB(result.variationId, patches);

    await prisma.qAResult.update({
      where: { id },
      data: {
        applied,
        fixStatus: 'human_approved',
        reviewedBy: userId,
        reviewedAt: new Date(),
        humanReviewRequired: false
      }
    });

    return res.json({ success: true, applied });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/qa-sweep/review-queue/:id/reject
// Rechazar fix sugerido
router.post('/review-queue/:id/reject', authenticate, requireRole(['ADMIN', 'REVIEWER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = (req as any).user.id;

    await prisma.qAResult.update({
      where: { id },
      data: {
        fixStatus: 'human_rejected',
        humanReviewNotes: notes,
        reviewedBy: userId,
        reviewedAt: new Date(),
        humanReviewRequired: false
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

