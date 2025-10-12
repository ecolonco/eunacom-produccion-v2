import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN']));

router.post('/packages', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, mockExamQty, isActive } = req.body;

    if (!name || !price || !mockExamQty) {
      return res.status(400).json({
        success: false,
        message: 'name, price y mockExamQty son requeridos',
      });
    }

    const newPackage = await prisma.mockExamPackage.create({
      data: {
        name,
        description,
        price,
        mockExamQty,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    logger.info(`Paquete de ensayos creado: ${newPackage.id} por admin ${req.user!.id}`);
    res.json({ success: true, data: newPackage });
  } catch (error: any) {
    logger.error('Error al crear paquete de ensayos:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al crear paquete' });
  }
});

router.get('/packages', async (req: AuthRequest, res: Response) => {
  try {
    const packages = await prisma.mockExamPackage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: packages });
  } catch (error: any) {
    logger.error('Error al obtener paquetes de ensayos:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener paquetes' });
  }
});

export default router;

