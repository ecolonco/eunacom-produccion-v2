import { Router, Response } from 'express';
import { mockExamService } from '../services/mock-exam.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

router.get('/packages', async (req, res: Response) => {
  try {
    const packages = await mockExamService.listPackages();
    res.json({ success: true, data: packages });
  } catch (error: any) {
    logger.error('Error al obtener paquetes de ensayos:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener paquetes' });
  }
});

// ============================================================================
// RUTAS PROTEGIDAS
// ============================================================================

router.get('/my-purchases', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const purchases = await mockExamService.getUserPurchases(userId);
    res.json({ success: true, data: purchases });
  } catch (error: any) {
    logger.error('Error al obtener compras de ensayos:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener tus compras' });
  }
});

router.post('/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { purchaseId } = req.body;

    if (!purchaseId) {
      return res.status(400).json({ success: false, message: 'purchaseId es requerido' });
    }

    console.log(`🚀 Iniciando ensayo EUNACOM para usuario ${userId}, compra ${purchaseId}`);
    const mockExam = await mockExamService.startMockExam({ userId, purchaseId });
    res.json({ success: true, data: mockExam });
  } catch (error: any) {
    logger.error('Error al iniciar ensayo:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al iniciar el ensayo' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const mockExam = await mockExamService.getMockExam(id, userId);
    res.json({ success: true, data: mockExam });
  } catch (error: any) {
    logger.error('Error al obtener ensayo:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener el ensayo' });
  }
});

router.post('/:id/answer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { variationId, selectedAnswer } = req.body;

    if (!variationId || !selectedAnswer) {
      return res.status(400).json({ success: false, message: 'variationId y selectedAnswer son requeridos' });
    }

    const result = await mockExamService.answerQuestion({
      mockExamId: id,
      userId,
      variationId,
      selectedAnswer,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error al guardar respuesta:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al guardar la respuesta' });
  }
});

router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const results = await mockExamService.completeMockExam(id, userId);
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('Error al completar ensayo:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al completar el ensayo' });
  }
});

router.get('/:id/results', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const results = await mockExamService.getMockExamResults(id, userId);
    res.json({ success: true, data: results });
  } catch (error: any) {
    logger.error('Error al obtener resultados:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al obtener los resultados' });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mockExams = await mockExamService.listUserMockExams(userId);
    res.json({ success: true, data: mockExams });
  } catch (error: any) {
    logger.error('Error al listar ensayos:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al listar ensayos' });
  }
});

export default router;

