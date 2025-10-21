import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Todas las rutas requieren autenticación y rol de ADMIN
router.use(authenticate);
router.use(requireRole(['ADMIN']));

// POST /api/admin/exams/packages - Crear un nuevo paquete de pruebas
router.post('/packages', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, examQty, isActive } = req.body;

    if (!name || !price || !examQty) {
      return res.status(400).json({
        success: false,
        message: 'name, price y examQty son requeridos',
      });
    }

    const newPackage = await prisma.examPackage.create({
      data: {
        name,
        description,
        price,
        examQty,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    logger.info(`Paquete de pruebas creado: ${newPackage.id} por admin ${req.user!.id}`);

    res.json({
      success: true,
      data: newPackage,
    });
  } catch (error: any) {
    logger.error('Error al crear paquete de pruebas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear paquete',
    });
  }
});

// GET /api/admin/exams/packages - Listar todos los paquetes de pruebas
router.get('/packages', async (req: AuthRequest, res: Response) => {
  try {
    const packages = await prisma.examPackage.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: packages,
    });
  } catch (error: any) {
    logger.error('Error al obtener paquetes de pruebas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener paquetes',
    });
  }
});

export default router;

