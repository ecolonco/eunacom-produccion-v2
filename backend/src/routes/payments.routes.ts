import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { FlowService } from '../services/flow.service';
import { CreditsService } from '../services/credits.service';
import { logger } from '../utils/logger';

const router = Router();

const PRICE_CLP = 20000;
const CREDITS_PER_PURCHASE = 400;

// GET /api/payments/flow/test-config - Test Flow configuration
router.get('/flow/test-config', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Solo administradores' });
    }

    const { apiKey, apiSecret, apiBase } = FlowService['getConfig']();
    
    // Test basic configuration
    const config = {
      hasApiKey: Boolean(apiKey),
      hasApiSecret: Boolean(apiSecret),
      apiBase,
      apiKeyLength: apiKey?.length || 0,
      apiSecretLength: apiSecret?.length || 0,
    };

    logger.info('Flow configuration test', config);

    res.json({ success: true, config });
  } catch (error) {
    logger.error('Error testing Flow config:', error);
    res.status(500).json({ success: false, message: 'Error al verificar configuración' });
  }
});

// POST /api/payments/flow/create
router.post('/flow/create', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: PRICE_CLP,
        credits: CREDITS_PER_PURCHASE,
        status: 'CREATED',
      }
    });

    // Siempre usar la API de Flow para crear pagos específicos con flowOrder
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const apiBase = process.env.API_BASE_URL || process.env.BACKEND_URL || 'https://eunacom-backend-v3.onrender.com';

    logger.info('Creating Flow payment', { paymentId: payment.id, userEmail: user.email });

    const flow = await FlowService.createPayment({
      commerceOrder: payment.id,
      subject: 'Compra de 400 créditos',
      amount: PRICE_CLP,
      email: user.email,
      urlReturn: `${appUrl}/?payment=success`,
      urlConfirmation: `${apiBase.replace(/\/$/, '')}/api/payments/flow/webhook`,
    });

    logger.info('Flow payment created', { paymentId: payment.id, flowToken: flow.token, flowOrder: flow.flowOrder });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        flowToken: flow.token, 
        flowOrder: flow.flowOrder ? String(flow.flowOrder) : null, 
        payUrl: flow.url, 
        status: 'PENDING' 
      }
    });

    logger.info('Payment updated in database', { paymentId: payment.id, flowOrder: flow.flowOrder });

    return res.json({ success: true, url: flow.url, token: flow.token, paymentId: payment.id });
  } catch (error) {
    logger.error('Error creating Flow payment:', error);
    return res.status(500).json({ success: false, message: 'No se pudo crear el pago' });
  }
});

// POST /api/payments/flow/webhook
router.post('/flow/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = JSON.stringify(req.body || {});
    const signature = req.header('X-Flow-Signature') || req.header('x-flow-signature');
    // Si Flow no usa header, saltar verificación o implementar formato específico de Flow
    if (signature && !FlowService.verifySignatureFromHeaders(rawBody, signature)) {
      return res.status(400).json({ success: false, message: 'Firma inválida' });
    }

    const { commerceOrder, status, flowOrder } = req.body || {};
    if (!commerceOrder) {
      return res.status(400).json({ success: false, message: 'commerceOrder requerido' });
    }

    const payment = await prisma.payment.findUnique({ where: { id: String(commerceOrder) } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    }

    if (payment.status === 'PAID') {
      return res.json({ success: true, message: 'Pago ya procesado' });
    }

    // Actualizar estado
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: String(status || 'PAID') as any, 
        flowOrder: flowOrder ? String(flowOrder) : payment.flowOrder 
      }
    });

    if ((status || 'PAID') === 'PAID') {
      // Idempotente: si ya existe transacción con metadata.paymentId, no volver a cargar
      const existingTx = await prisma.creditTransaction.findFirst({
        where: { userId: payment.userId, type: 'PURCHASE', description: payment.id }
      });
      if (!existingTx) {
        await CreditsService.addCredits(payment.userId, payment.credits, 'PURCHASE', payment.id, {
          provider: 'FLOW', amount: payment.amount, flowOrder: flowOrder || payment.flowOrder
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Error in Flow webhook:', error);
    return res.status(500).json({ success: false });
  }
});

// GET /api/payments/flow/check/:paymentId - Check and process payment status
router.get('/flow/check/:paymentId', authenticate as any, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const user = (req as any).user;
    
    logger.info('Checking payment status', { paymentId, userId: user?.id, userRole: user?.role });
    
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    }
    
    logger.info('Payment found', { 
      paymentId, 
      status: payment.status, 
      flowToken: payment.flowToken, 
      flowOrder: payment.flowOrder 
    });
    
    // Solo el dueño puede consultar
    if (payment.userId !== user?.id && user?.role !== 'ADMIN') {
      logger.warn('Unauthorized payment check', { paymentId, userId: user?.id, paymentUserId: payment.userId });
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    
    // Si ya está pagado, retornar
    if (payment.status === 'PAID') {
      logger.info('Payment already paid', { paymentId });
      return res.json({ success: true, status: 'PAID', payment });
    }
    
    // Consultar estado en Flow (por token o por flowOrder)
    let flowStatus: any;
    
    try {
      if (payment.flowToken) {
        logger.info('Checking payment by token', { paymentId, flowToken: payment.flowToken });
        flowStatus = await FlowService.getPaymentStatus(payment.flowToken);
      } else if (payment.flowOrder) {
        logger.info('Checking payment by flowOrder', { paymentId, flowOrder: payment.flowOrder });
        flowStatus = await FlowService.getPaymentStatusByFlowOrder(payment.flowOrder);
      } else {
        logger.warn('No flowToken or flowOrder available', { paymentId });
        return res.status(400).json({ success: false, message: 'No se puede verificar este pago (falta flowToken o flowOrder)' });
      }
      
      logger.info('Flow payment status response', { paymentId, flowStatus });
      
      // Flow status: 1=pendiente, 2=pagado, 3=rechazado, 4=anulado
      if (flowStatus.status === 2) {
        logger.info('Payment confirmed as paid, updating status and crediting', { paymentId });
        
        // Marcar como pagado y acreditar (idempotente)
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID' }
        });
        
        const existingTx = await prisma.creditTransaction.findFirst({
          where: { userId: payment.userId, type: 'PURCHASE', description: payment.id }
        });
        
        if (!existingTx) {
          logger.info('Crediting user', { userId: payment.userId, credits: payment.credits, paymentId });
          await CreditsService.addCredits(payment.userId, payment.credits, 'PURCHASE', payment.id, {
            provider: 'FLOW', amount: payment.amount, flowOrder: payment.flowOrder
          });
        } else {
          logger.info('Credits already added for this payment', { paymentId });
        }
        
        return res.json({ success: true, status: 'PAID', credited: !existingTx });
      }
      
      // Otros estados
      logger.info('Payment not yet paid', { paymentId, flowStatus: flowStatus.status });
      return res.json({ success: true, status: flowStatus.status === 1 ? 'PENDING' : 'FAILED', flowStatus });
    } catch (flowError) {
      logger.error('Error checking Flow payment status', { paymentId, error: flowError });
      return res.status(500).json({ success: false, message: 'Error al verificar el pago con Flow' });
    }
  } catch (error) {
    logger.error('Error checking Flow payment:', error);
    return res.status(500).json({ success: false, message: 'Error al verificar el pago' });
  }
});

export { router as paymentsRoutes };


