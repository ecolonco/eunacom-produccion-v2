import { Router, Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        username,
        credits: parseInt(process.env.FREE_CREDITS_ON_SIGNUP || '50'),
        profile: {
          create: {
            preferredLanguage: 'es',
            theme: 'light',
            notifications: true
          }
        }
      },
      include: {
        profile: true
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
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
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
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