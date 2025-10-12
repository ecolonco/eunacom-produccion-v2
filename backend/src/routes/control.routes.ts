import { Router, Response } from 'express';
import { controlService } from '../services/control.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// RUTAS PÚBLICAS (para ver paquetes)
// ============================================================================

// GET /api/controls/packages - Listar paquetes disponibles
router.get('/packages', async (req, res: Response) => {
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
      message: 'Error al listar paquetes de controles',
    });
  }
});

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// GET /api/controls/my-purchases - Obtener mis compras de controles
router.get('/my-purchases', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const purchases = await controlService.getUserPurchases(userId);
    
    res.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    logger.error('Error getting user purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tus compras',
    });
  }
});

// POST /api/controls/start - Iniciar un nuevo control
router.post('/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { purchaseId } = req.body;

    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'purchaseId es requerido',
      });
    }

    const control = await controlService.startControl({
      userId,
      purchaseId,
    });

    res.json({
      success: true,
      data: control,
      message: 'Control iniciado exitosamente',
    });
  } catch (error: any) {
    logger.error('Error starting control:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al iniciar el control',
    });
  }
});

// GET /api/controls/:id - Obtener un control específico
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const control = await controlService.getControl(id, userId);

    res.json({
      success: true,
      data: control,
    });
  } catch (error: any) {
    logger.error('Error getting control:', error);
    res.status(error.message === 'No autorizado' ? 403 : 404).json({
      success: false,
      message: error.message || 'Error al obtener el control',
    });
  }
});

// POST /api/controls/:id/answer - Responder una pregunta
router.post('/:id/answer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { variationId, selectedAnswer } = req.body;

    if (!variationId || !selectedAnswer) {
      return res.status(400).json({
        success: false,
        message: 'variationId y selectedAnswer son requeridos',
      });
    }

    const result = await controlService.submitAnswer(
      {
        controlId: id,
        variationId,
        selectedAnswer,
      },
      userId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error submitting answer:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al guardar la respuesta',
    });
  }
});

// POST /api/controls/:id/complete - Completar el control
router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const results = await controlService.completeControl(id, userId);

    res.json({
      success: true,
      data: results,
      message: 'Control completado exitosamente',
    });
  } catch (error: any) {
    logger.error('Error completing control:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al completar el control',
    });
  }
});

// GET /api/controls/:id/results - Ver resultados de un control
router.get('/:id/results', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const results = await controlService.getControlResults(id, userId);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    logger.error('Error getting control results:', error);
    res.status(error.message === 'No autorizado' ? 403 : 404).json({
      success: false,
      message: error.message || 'Error al obtener los resultados',
    });
  }
});

// GET /api/controls - Listar mis controles
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const controls = await controlService.listUserControls(userId);

    res.json({
      success: true,
      data: controls,
    });
  } catch (error) {
    logger.error('Error listing user controls:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar tus controles',
    });
  }
});

export default router;

