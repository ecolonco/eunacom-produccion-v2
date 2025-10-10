import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { FlowService } from '../services/flow.service';
import { CreditsService } from '../services/credits.service';
import { logger } from '../utils/logger';

const router = Router();

const PRICE_CLP = 20000;
const CREDITS_PER_PURCHASE = 400;

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

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const apiBase = process.env.API_BASE_URL || process.env.BACKEND_URL || 'https://eunacom-backend-v3.onrender.com';

    const flow = await FlowService.createPayment({
      commerceOrder: payment.id,
      subject: 'Compra de 400 créditos',
      amount: PRICE_CLP,
      email: user.email,
      urlReturn: `${appUrl}/payment/return`,
      urlConfirmation: `${apiBase.replace(/\/$/, '')}/api/payments/flow/webhook`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { flowToken: flow.token, flowOrder: flow.flowOrder || null, payUrl: flow.url, status: 'PENDING' }
    });

    return res.json({ success: true, url: flow.url, token: flow.token });
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
      data: { status: String(status || 'PAID') as any, flowOrder: flowOrder || payment.flowOrder }
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

export { router as paymentsRoutes };


