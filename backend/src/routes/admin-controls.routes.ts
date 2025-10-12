import { Router, Response } from 'express';
import { controlService } from '../services/control.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Todas las rutas requieren autenticación de ADMIN
router.use(authenticate);
router.use(requireRole(['ADMIN']));

// POST /api/admin/controls/packages - Crear un paquete de controles
router.post('/packages', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, controlQty } = req.body;

    if (!name || !price || !controlQty) {
      return res.status(400).json({
        success: false,
        message: 'name, price y controlQty son requeridos',
      });
    }

    const pkg = await controlService.createPackage({
      name,
      description,
      price: parseInt(price),
      controlQty: parseInt(controlQty),
    });

    logger.info(`Paquete de controles creado: ${pkg.id} by admin ${req.user!.userId}`);

    res.json({
      success: true,
      data: pkg,
      message: 'Paquete creado exitosamente',
    });
  } catch (error) {
    logger.error('Error creating control package:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el paquete',
    });
  }
});

// GET /api/admin/controls/packages - Listar todos los paquetes (incluidos inactivos)
router.get('/packages', async (req: AuthRequest, res: Response) => {
  try {
    const packages = await controlService.listPackages();
    
    res.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    logger.error('Error listing control packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar paquetes',
    });
  }
});

export default router;

