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
      environment: apiBase.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION',
    };

    logger.info('Flow configuration test', config);

    res.json({ success: true, config });
  } catch (error) {
    logger.error('Error testing Flow config:', error);
    res.status(500).json({ success: false, message: 'Error al verificar configuración' });
  }
});

// GET /api/payments/flow/debug-latest - Debug latest payment creation
router.get('/flow/debug-latest', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Solo administradores' });
    }

    // Get latest payment
    const latestPayment = await prisma.payment.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    });

    if (!latestPayment) {
      return res.json({ success: true, message: 'No hay pagos en la base de datos' });
    }

    res.json({ 
      success: true, 
      latestPayment: {
        id: latestPayment.id,
        status: latestPayment.status,
        flowToken: latestPayment.flowToken,
        flowOrder: latestPayment.flowOrder,
        payUrl: latestPayment.payUrl,
        createdAt: latestPayment.createdAt,
        user: latestPayment.user
      }
    });
  } catch (error) {
    logger.error('Error getting latest payment:', error);
    res.status(500).json({ success: false, message: 'Error al obtener último pago' });
  }
});

// POST /api/payments/flow/test-create - Test payment creation without redirect
router.post('/flow/test-create', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Solo administradores' });
    }

    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const apiBase = process.env.API_BASE_URL || process.env.BACKEND_URL || 'https://eunacom-backend-v3.onrender.com';

    // URLs simplificadas para evitar problemas con caracteres especiales
    const urlReturn = `https://eunacom-backend-v3.onrender.com/api/payments/flow/return`;
    const urlConfirmation = `https://eunacom-backend-v3.onrender.com/api/payments/flow/webhook`;
    
    logger.info('Testing Flow payment creation', { 
      userEmail: user.email,
      urlReturn,
      urlConfirmation,
      appUrl,
      apiBase
    });

    const flow = await FlowService.createPayment({
      commerceOrder: `test-${Date.now()}`,
      subject: 'Test - Compra de 400 créditos',
      amount: PRICE_CLP,
      email: user.email,
      urlReturn,
      urlConfirmation,
    });

    logger.info('Flow test payment created', { flowToken: flow.token, flowOrder: flow.flowOrder, url: flow.url });

    res.json({ 
      success: true, 
      flowToken: flow.token, 
      flowOrder: flow.flowOrder,
      url: flow.url,
      test: true
    });
  } catch (error) {
    logger.error('Error testing Flow payment creation:', error);
    res.status(500).json({ success: false, message: 'Error al crear pago de prueba', error: error.message });
  }
});

// POST /api/payments/flow/create
router.post('/flow/create', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    // Validar email
    if (!user.email || !user.email.includes('@') || user.email.endsWith('.local')) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email del usuario no es válido para pagos. Debe usar un email real (ej: @gmail.com, @outlook.com, etc.)' 
      });
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

    // URLs simplificadas para evitar problemas con caracteres especiales
    const urlReturn = `https://eunacom-backend-v3.onrender.com/api/payments/flow/return`;
    const urlConfirmation = `https://eunacom-backend-v3.onrender.com/api/payments/flow/webhook`;
    
    logger.info('Creating Flow payment', { 
      paymentId: payment.id, 
      userEmail: user.email,
      urlReturn,
      urlConfirmation,
      appUrl,
      apiBase
    });

    const flow = await FlowService.createPayment({
      commerceOrder: payment.id,
      subject: 'Compra de 400 créditos',
      amount: PRICE_CLP,
      email: user.email,
      urlReturn,
      urlConfirmation,
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
      // Procesar según el tipo de paquete
      if (payment.packageType === 'CREDITS') {
        // Idempotente: si ya existe transacción con metadata.paymentId, no volver a cargar
        const existingTx = await prisma.creditTransaction.findFirst({
          where: { userId: payment.userId, type: 'PURCHASE', description: payment.id }
        });
        if (!existingTx) {
          await CreditsService.addCredits(payment.userId, payment.credits, 'PURCHASE', payment.id, {
            provider: 'FLOW', amount: payment.amount, flowOrder: flowOrder || payment.flowOrder
          });
        }
      } else if (payment.packageType === 'CONTROL' && payment.packageId) {
        // Verificar si ya existe la compra
        const existingPurchase = await prisma.controlPurchase.findFirst({
          where: { userId: payment.userId, paymentId: payment.id }
        });
        if (!existingPurchase) {
          const controlPackage = await prisma.controlPackage.findUnique({
            where: { id: payment.packageId }
          });
          if (controlPackage) {
            await prisma.controlPurchase.create({
              data: {
                userId: payment.userId,
                packageId: payment.packageId,
                paymentId: payment.id,
                controlsTotal: controlPackage.controlQty,
                controlsUsed: 0,
                status: 'ACTIVE'
              }
            });
            logger.info('Control package purchase created', { userId: payment.userId, paymentId: payment.id });
          }
        }
      } else if (payment.packageType === 'EXAM' && payment.packageId) {
        const existingPurchase = await prisma.examPurchase.findFirst({
          where: { userId: payment.userId, paymentId: payment.id }
        });
        if (!existingPurchase) {
          const examPackage = await prisma.examPackage.findUnique({
            where: { id: payment.packageId }
          });
          if (examPackage) {
            await prisma.examPurchase.create({
              data: {
                userId: payment.userId,
                packageId: payment.packageId,
                paymentId: payment.id,
                examsTotal: examPackage.examQty,
                examsUsed: 0,
                status: 'ACTIVE'
              }
            });
            logger.info('Exam package purchase created', { userId: payment.userId, paymentId: payment.id });
          }
        }
      } else if (payment.packageType === 'MOCK_EXAM' && payment.packageId) {
        const existingPurchase = await prisma.mockExamPurchase.findFirst({
          where: { userId: payment.userId, paymentId: payment.id }
        });
        if (!existingPurchase) {
          const mockExamPackage = await prisma.mockExamPackage.findUnique({
            where: { id: payment.packageId }
          });
          if (mockExamPackage) {
            await prisma.mockExamPurchase.create({
              data: {
                userId: payment.userId,
                packageId: payment.packageId,
                paymentId: payment.id,
                mockExamsTotal: mockExamPackage.mockExamQty,
                mockExamsUsed: 0,
                status: 'ACTIVE'
              }
            });
            logger.info('Mock exam package purchase created', { userId: payment.userId, paymentId: payment.id });
          }
        }
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
    
    // Solo el dueño puede consultar (o admin)
    if (payment.userId !== user?.id && user?.role !== 'ADMIN') {
      logger.warn('Unauthorized payment check', { 
        paymentId, 
        userId: user?.id, 
        userRole: user?.role,
        paymentUserId: payment.userId 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'No autorizado para verificar este pago. Solo el dueño o administrador pueden verificar pagos.' 
      });
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
        
        // Procesar según el tipo de paquete
        if (payment.packageType === 'CREDITS') {
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
        } else if (payment.packageType === 'CONTROL' && payment.packageId) {
          const existingPurchase = await prisma.controlPurchase.findFirst({
            where: { userId: payment.userId, paymentId: payment.id }
          });
          if (!existingPurchase) {
            const controlPackage = await prisma.controlPackage.findUnique({
              where: { id: payment.packageId }
            });
            if (controlPackage) {
              await prisma.controlPurchase.create({
                data: {
                  userId: payment.userId,
                  packageId: payment.packageId,
                  paymentId: payment.id,
                  controlsTotal: controlPackage.controlQty,
                  controlsUsed: 0,
                  status: 'ACTIVE'
                }
              });
              logger.info('Control package purchase created via check', { userId: payment.userId, paymentId });
            }
          }
        } else if (payment.packageType === 'EXAM' && payment.packageId) {
          const existingPurchase = await prisma.examPurchase.findFirst({
            where: { userId: payment.userId, paymentId: payment.id }
          });
          if (!existingPurchase) {
            const examPackage = await prisma.examPackage.findUnique({
              where: { id: payment.packageId }
            });
            if (examPackage) {
              await prisma.examPurchase.create({
                data: {
                  userId: payment.userId,
                  packageId: payment.packageId,
                  paymentId: payment.id,
                  examsTotal: examPackage.examQty,
                  examsUsed: 0,
                  status: 'ACTIVE'
                }
              });
              logger.info('Exam package purchase created via check', { userId: payment.userId, paymentId });
            }
          }
        } else if (payment.packageType === 'MOCK_EXAM' && payment.packageId) {
          const existingPurchase = await prisma.mockExamPurchase.findFirst({
            where: { userId: payment.userId, paymentId: payment.id }
          });
          if (!existingPurchase) {
            const mockExamPackage = await prisma.mockExamPackage.findUnique({
              where: { id: payment.packageId }
            });
            if (mockExamPackage) {
              await prisma.mockExamPurchase.create({
                data: {
                  userId: payment.userId,
                  packageId: payment.packageId,
                  paymentId: payment.id,
                  mockExamsTotal: mockExamPackage.mockExamQty,
                  mockExamsUsed: 0,
                  status: 'ACTIVE'
                }
              });
              logger.info('Mock exam package purchase created via check', { userId: payment.userId, paymentId });
            }
          }
        }
        
        return res.json({ success: true, status: 'PAID', packageType: payment.packageType });
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

// GET /api/payments/flow/return - Handle Flow return redirect
router.get('/flow/return', async (req: Request, res: Response) => {
  try {
    logger.info('Flow payment return', { 
      query: req.query,
      headers: req.headers,
      method: req.method,
      origin: req.headers.origin
    });

    // Flow puede enviar información del pago en query params
    const { token, flowOrder, status } = req.query;

    // Redirigir al frontend con parámetros de éxito
    const frontendUrl = 'https://eunacom-nuevo.vercel.app/?payment=success';
    
    // Enviar respuesta HTML que redirige al frontend
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Redirigiendo...</title>
        <meta http-equiv="refresh" content="0;url=${frontendUrl}">
      </head>
      <body>
        <p>Redirigiendo...</p>
        <script>
          window.location.href = '${frontendUrl}';
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in Flow return:', error);
    // En caso de error, redirigir de todas formas al frontend
    res.redirect('https://eunacom-nuevo.vercel.app/?payment=success');
  }
});

// POST /api/payments/flow/return - Handle Flow return redirect (POST method)
router.post('/flow/return', async (req: Request, res: Response) => {
  try {
    logger.info('Flow payment return (POST)', { 
      body: req.body,
      headers: req.headers,
      method: req.method,
      origin: req.headers.origin
    });

    // Redirigir al frontend con parámetros de éxito
    const frontendUrl = 'https://eunacom-nuevo.vercel.app/?payment=success';
    
    // Enviar respuesta HTML que redirige al frontend
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Redirigiendo...</title>
        <meta http-equiv="refresh" content="0;url=${frontendUrl}">
      </head>
      <body>
        <p>Redirigiendo...</p>
        <script>
          window.location.href = '${frontendUrl}';
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in Flow return (POST):', error);
    // En caso de error, redirigir de todas formas al frontend
    res.redirect('https://eunacom-nuevo.vercel.app/?payment=success');
  }
});

// POST /api/payments/flow/create-control-purchase - Create payment for control package
router.post('/flow/create-control-purchase', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { packageId } = req.body;
    if (!packageId) {
      return res.status(400).json({ success: false, message: 'packageId requerido' });
    }

    // Validar email
    if (!user.email || !user.email.includes('@') || user.email.endsWith('.local')) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email del usuario no es válido para pagos. Debe usar un email real (ej: @gmail.com, @outlook.com, etc.)' 
      });
    }

    // Obtener información del paquete
    const controlPackage = await prisma.controlPackage.findUnique({
      where: { id: packageId }
    });

    if (!controlPackage || !controlPackage.isActive) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado o inactivo' });
    }

    // Crear registro de pago
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: controlPackage.price,
        credits: 0, // No son créditos, es un paquete de controles
        packageType: 'CONTROL',
        packageId: controlPackage.id,
        status: 'CREATED',
      }
    });

    // Crear pago en Flow
    const urlReturn = `https://eunacom-backend-v3.onrender.com/api/payments/flow/return`;
    const urlConfirmation = `https://eunacom-backend-v3.onrender.com/api/payments/flow/webhook`;
    
    logger.info('Creating Flow payment for control package', { 
      paymentId: payment.id, 
      userEmail: user.email,
      packageName: controlPackage.name,
      price: controlPackage.price
    });

    const flow = await FlowService.createPayment({
      commerceOrder: payment.id,
      subject: `Compra: ${controlPackage.name}`,
      amount: controlPackage.price,
      email: user.email,
      urlReturn,
      urlConfirmation,
    });

    logger.info('Flow payment created for control package', { 
      paymentId: payment.id, 
      flowToken: flow.token, 
      flowOrder: flow.flowOrder 
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        flowToken: flow.token, 
        flowOrder: flow.flowOrder ? String(flow.flowOrder) : null, 
        payUrl: flow.url, 
        status: 'PENDING' 
      }
    });

    return res.json({ 
      success: true, 
      url: flow.url, 
      token: flow.token, 
      paymentId: payment.id,
      packageName: controlPackage.name
    });
  } catch (error) {
    logger.error('Error creating Flow payment for control package:', error);
    return res.status(500).json({ success: false, message: 'No se pudo crear el pago' });
  }
});

// POST /api/payments/flow/create-exam-purchase - Create payment for exam package
router.post('/flow/create-exam-purchase', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { packageId } = req.body;
    if (!packageId) {
      return res.status(400).json({ success: false, message: 'packageId requerido' });
    }

    // Validar email
    if (!user.email || !user.email.includes('@') || user.email.endsWith('.local')) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email del usuario no es válido para pagos. Debe usar un email real (ej: @gmail.com, @outlook.com, etc.)' 
      });
    }

    const examPackage = await prisma.examPackage.findUnique({
      where: { id: packageId }
    });

    if (!examPackage || !examPackage.isActive) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado o inactivo' });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: examPackage.price,
        credits: 0,
        packageType: 'EXAM',
        packageId: examPackage.id,
        status: 'CREATED',
      }
    });

    const urlReturn = `https://eunacom-backend-v3.onrender.com/api/payments/flow/return`;
    const urlConfirmation = `https://eunacom-backend-v3.onrender.com/api/payments/flow/webhook`;
    
    logger.info('Creating Flow payment for exam package', { 
      paymentId: payment.id, 
      userEmail: user.email,
      packageName: examPackage.name,
      price: examPackage.price
    });

    const flow = await FlowService.createPayment({
      commerceOrder: payment.id,
      subject: `Compra: ${examPackage.name}`,
      amount: examPackage.price,
      email: user.email,
      urlReturn,
      urlConfirmation,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        flowToken: flow.token, 
        flowOrder: flow.flowOrder ? String(flow.flowOrder) : null, 
        payUrl: flow.url, 
        status: 'PENDING' 
      }
    });

    return res.json({ 
      success: true, 
      url: flow.url, 
      token: flow.token, 
      paymentId: payment.id,
      packageName: examPackage.name
    });
  } catch (error) {
    logger.error('Error creating Flow payment for exam package:', error);
    return res.status(500).json({ success: false, message: 'No se pudo crear el pago' });
  }
});

// POST /api/payments/flow/create-mock-exam-purchase - Create payment for mock exam package
router.post('/flow/create-mock-exam-purchase', authenticate as any, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { packageId } = req.body;
    if (!packageId) {
      return res.status(400).json({ success: false, message: 'packageId requerido' });
    }

    // Validar email
    if (!user.email || !user.email.includes('@') || user.email.endsWith('.local')) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email del usuario no es válido para pagos. Debe usar un email real (ej: @gmail.com, @outlook.com, etc.)' 
      });
    }

    const mockExamPackage = await prisma.mockExamPackage.findUnique({
      where: { id: packageId }
    });

    if (!mockExamPackage || !mockExamPackage.isActive) {
      return res.status(404).json({ success: false, message: 'Paquete no encontrado o inactivo' });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: mockExamPackage.price,
        credits: 0,
        packageType: 'MOCK_EXAM',
        packageId: mockExamPackage.id,
        status: 'CREATED',
      }
    });

    const urlReturn = `https://eunacom-backend-v3.onrender.com/api/payments/flow/return`;
    const urlConfirmation = `https://eunacom-backend-v3.onrender.com/api/payments/flow/webhook`;
    
    logger.info('Creating Flow payment for mock exam package', { 
      paymentId: payment.id, 
      userEmail: user.email,
      packageName: mockExamPackage.name,
      price: mockExamPackage.price
    });

    const flow = await FlowService.createPayment({
      commerceOrder: payment.id,
      subject: `Compra: ${mockExamPackage.name}`,
      amount: mockExamPackage.price,
      email: user.email,
      urlReturn,
      urlConfirmation,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        flowToken: flow.token, 
        flowOrder: flow.flowOrder ? String(flow.flowOrder) : null, 
        payUrl: flow.url, 
        status: 'PENDING' 
      }
    });

    return res.json({ 
      success: true, 
      url: flow.url, 
      token: flow.token, 
      paymentId: payment.id,
      packageName: mockExamPackage.name
    });
  } catch (error) {
    logger.error('Error creating Flow payment for mock exam package:', error);
    return res.status(500).json({ success: false, message: 'No se pudo crear el pago' });
  }
});

export { router as paymentsRoutes };


