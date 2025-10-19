import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

// Endpoint para verificar configuración JWT (solo para debugging)
router.get('/jwt-config', (req: Request, res: Response) => {
  const config = {
    JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m (default)',
    JWT_REFRESH_SECRET_EXISTS: !!process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d (default)',

    // Crear un token de prueba para ver su expiración real
    test_token_info: (() => {
      try {
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
        const testToken = jwt.sign(
          { userId: 'test', email: 'test@test.com', role: 'test' },
          secret,
          { expiresIn: expiresIn as any }
        );

        const decoded: any = jwt.decode(testToken);
        const now = Math.floor(Date.now() / 1000);
        const expiresInSeconds = decoded.exp - now;
        const expiresInMinutes = Math.floor(expiresInSeconds / 60);

        return {
          expires_in_seconds: expiresInSeconds,
          expires_in_minutes: expiresInMinutes,
          issued_at: new Date(decoded.iat * 1000).toISOString(),
          expires_at: new Date(decoded.exp * 1000).toISOString(),
        };
      } catch (error) {
        return { error: 'Failed to create test token' };
      }
    })()
  };

  res.json({
    success: true,
    data: config,
    message: 'JWT configuration details'
  });
});

export default router;
