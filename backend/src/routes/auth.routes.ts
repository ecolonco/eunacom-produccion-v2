import { Router, Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { VerificationService } from '../services/verification.service';
import { EmailService, buildVerificationEmail } from '../services/email.service';
import { CreditsService } from '../services/credits.service';
import { redis } from '../config/redis';

const router = Router();

// JWT Helper functions
const generateAccessToken = (userId: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign({ userId, email, role }, secret, options);
};

const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign({ userId }, secret, options);
};

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }).trim()
], async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    });

    if (!user || !user.isActive) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Check password
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn(`Invalid password for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Block login if email not verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Debes verificar tu correo antes de iniciar sesión.'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    logger.info(`User logged in successfully: ${user.email}`);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        credits: user.credits,
        profile: user.profile
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').isLength({ min: 1 }).trim(),
  body('lastName').isLength({ min: 1 }).trim()
], async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, username } = req.body;
    const cleanUsername = typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : undefined;

    // Check if user already exists (neutral response to avoid enumeration)
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      // Si el usuario existe y NO está verificado, reemitimos el enlace sin revelar existencia
      if (!existingUser.isVerified && existingUser.isActive) {
        try {
          const ttl = parseInt(process.env.EMAIL_TOKEN_TTL_HOURS || '24', 10);
          const token = await VerificationService.createOrReplaceToken(
            existingUser.id,
            ttl,
            req.ip,
            req.get('user-agent') || undefined
          );
          const appUrl = process.env.APP_URL || 'http://localhost:5173';
          const verifyUrl = `${appUrl}/verify?token=${token}`;
          const { subject, html } = buildVerificationEmail(existingUser.email, verifyUrl);
          logger.info('Verification link reissued (register existing)', { userId: existingUser.id, email: existingUser.email, verifyUrl });
          await EmailService.sendEmail({ to: existingUser.email, subject, html });
        } catch (reissueError) {
          logger.warn('Could not reissue verification for existing unverified user during register', reissueError);
        }
      }
      // Respuesta neutra en todos los casos
      return res.status(200).json({
        success: true,
        message: 'Si el correo es válido, recibirás un enlace de verificación.'
      });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 12);

    // Create user with zero credits until verification
    const createData: any = {
      email,
      passwordHash,
      firstName,
      lastName,
      credits: 0,
      profile: {
        create: {
          preferredLanguage: 'es',
          theme: 'light',
          notifications: true
        }
      }
    };
    if (cleanUsername) {
      createData.username = cleanUsername;
    }

    const user = await prisma.user.create({
      data: createData,
      include: { profile: true }
    });

    // Generate verification token and send email
    const ttl = parseInt(process.env.EMAIL_TOKEN_TTL_HOURS || '24', 10);
    const token = await VerificationService.createOrReplaceToken(
      user.id,
      ttl,
      req.ip,
      req.get('user-agent') || undefined
    );
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const verifyUrl = `${appUrl}/verify?token=${token}`;
    const { subject, html } = buildVerificationEmail(user.email, verifyUrl);
    logger.info('Verification link generated', { userId: user.id, email: user.email, verifyUrl });
    await EmailService.sendEmail({ to: user.email, subject, html });

    logger.info(`New user registered (verification required): ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Revisa tu correo para confirmar tu cuenta.'
    });

  } catch (error: any) {
    if (error?.code === 'P2002' && Array.isArray(error?.meta?.target) && error.meta.target.includes('username')) {
      return res.status(409).json({ success: false, message: 'Nombre de usuario ya está en uso' });
    }
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Token de actualización requerido'
      });
    }

    // Verify refresh token
    const secret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    const decoded = jwt.verify(refreshToken, secret) as any;

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Token de actualización inválido'
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    );

    res.json({
      success: true,
      accessToken: newAccessToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token de actualización inválido'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke refresh token
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true }
      });
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorización requerido'
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

export { router as authRoutes };

// GET /api/auth/verify
router.get('/verify', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const token = (req.query.token as string) || '';
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token requerido' });
    }

    const consumed = await VerificationService.consumeToken(token);
    if (!consumed) {
      return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
    }

    const user = await prisma.user.findUnique({ where: { id: consumed.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (!user.isVerified) {
      // Mark verified and grant 1 free control idempotently
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { isVerified: true } });
      });

      // Check if user already has a free control purchase
      const existingFreeControl = await prisma.controlPurchase.findFirst({
        where: {
          userId: user.id,
          paymentId: null // Free controls have no payment ID
        }
      });

      if (!existingFreeControl) {
        // Find or create a free control package (1 control, price 0)
        let freeControlPackage = await prisma.controlPackage.findFirst({
          where: {
            controlQty: 1,
            price: 0,
            name: 'Control Gratis de Bienvenida'
          }
        });

        // Create the package if it doesn't exist
        if (!freeControlPackage) {
          freeControlPackage = await prisma.controlPackage.create({
            data: {
              name: 'Control Gratis de Bienvenida',
              description: 'Control gratuito de 15 preguntas al verificar tu email',
              price: 0,
              controlQty: 1,
              isActive: true
            }
          });
        }

        // Create the free control purchase for the user
        await prisma.controlPurchase.create({
          data: {
            userId: user.id,
            packageId: freeControlPackage.id,
            controlsTotal: 1,
            controlsUsed: 0,
            status: 'ACTIVE',
            paymentId: null // No payment for free control
          }
        });

        logger.info(`Free control granted to user ${user.id} upon email verification`);
      }
    }

    return res.json({ success: true, message: 'Email verificado correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    logger.error('Email verification error:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', [body('email').isEmail().normalizeEmail()], async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos' });
    }

    const { email } = req.body as { email: string };

    // Rate limit by email and IP
    const ip = req.ip || 'unknown';
    const emailKey = `verify_resend:email:${email}`;
    const ipKey = `verify_resend:ip:${ip}`;
    const limit = parseInt(process.env.RESEND_VERIFY_LIMIT || '3', 10);
    const windowSec = parseInt(process.env.RESEND_VERIFY_WINDOW_SEC || '3600', 10);

    const [emailCount, ipCount] = await Promise.all([
      redis.incr(emailKey),
      redis.incr(ipKey),
    ]);
    if (emailCount === 1) await redis.expire(emailKey, windowSec);
    if (ipCount === 1) await redis.expire(ipKey, windowSec);

    if (emailCount > limit || ipCount > limit * 3) {
      return res.status(429).json({ success: true, message: 'Si el correo es válido, recibirás un enlace de verificación.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.isVerified) {
      // Neutral response
      return res.json({ success: true, message: 'Si el correo es válido, recibirás un enlace de verificación.' });
    }

    const ttl = parseInt(process.env.EMAIL_TOKEN_TTL_HOURS || '24', 10);
    const token = await VerificationService.createOrReplaceToken(
      user.id,
      ttl,
      ip,
      req.get('user-agent') || undefined
    );
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const verifyUrl = `${appUrl}/verify?token=${token}`;
    const { subject, html } = buildVerificationEmail(user.email, verifyUrl);
    logger.info('Verification link reissued', { userId: user.id, email: user.email, verifyUrl });
    await EmailService.sendEmail({ to: user.email, subject, html });

    return res.json({ success: true, message: 'Si el correo es válido, recibirás un enlace de verificación.' });
  } catch (error) {
    logger.error('Resend verification error:', error);
    return res.json({ success: true, message: 'Si el correo es válido, recibirás un enlace de verificación.' });
  }
});