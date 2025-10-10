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

export { router as adminPaymentsRoutes };

