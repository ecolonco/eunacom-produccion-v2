import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate as any);
router.use(authorize('ADMIN') as any);

// GET /api/admin/payments
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    res.json({
      success: true,
      data: {
        payments: payments.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      }
    });
  } catch (error) {
    logger.error('Error listing payments:', error);
    res.status(500).json({ success: false, message: 'Error al listar pagos' });
  }
});

// PUT /api/admin/payments/:paymentId/flowOrder
router.put('/:paymentId/flowOrder', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { flowOrder } = req.body;

    if (!flowOrder || typeof flowOrder !== 'string') {
      return res.status(400).json({ success: false, message: 'flowOrder es requerido' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { flowOrder: flowOrder.trim() }
    });

    logger.info('FlowOrder updated by admin', { paymentId, flowOrder, adminId: (req as any).user?.id });

    res.json({ success: true, message: 'FlowOrder actualizado exitosamente' });
  } catch (error) {
    logger.error('Error updating flowOrder:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar flowOrder' });
  }
});

export { router as adminPaymentsRoutes };

