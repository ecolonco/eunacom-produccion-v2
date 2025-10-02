import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
    },
    pid: process.pid,
  };

  res.status(200).json(healthCheck);
}));

// Detailed health check with dependencies
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unknown', latency: null as number | null },
      redis: { status: 'unknown', latency: null as number | null },
      openai: { status: 'unknown', latency: null as number | null },
    },
  };

  // Database health check (will implement when Prisma is set up)
  try {
    // const start = Date.now();
    // await prisma.$queryRaw`SELECT 1`;
    // checks.services.database = {
    //   status: 'healthy',
    //   latency: Date.now() - start,
    // };
    checks.services.database.status = 'not_configured';
  } catch (error) {
    checks.services.database.status = 'unhealthy';
    logger.error('Database health check failed:', error);
  }

  // Redis health check (will implement when Redis is set up)
  try {
    // const start = Date.now();
    // await redis.ping();
    // checks.services.redis = {
    //   status: 'healthy',
    //   latency: Date.now() - start,
    // };
    checks.services.redis.status = 'not_configured';
  } catch (error) {
    checks.services.redis.status = 'unhealthy';
    logger.error('Redis health check failed:', error);
  }

  // OpenAI health check
  try {
    if (process.env.OPENAI_API_KEY) {
      checks.services.openai.status = 'configured';
    } else {
      checks.services.openai.status = 'not_configured';
    }
  } catch (error) {
    checks.services.openai.status = 'unhealthy';
    logger.error('OpenAI health check failed:', error);
  }

  // Overall status
  const hasUnhealthy = Object.values(checks.services).some(
    service => service.status === 'unhealthy'
  );

  if (hasUnhealthy) {
    checks.status = 'degraded';
    res.status(503);
  }

  res.json(checks);
}));

// Readiness probe (for Kubernetes/Docker deployments)
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  // Add readiness checks here (e.g., database connection, required services)
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}));

// Liveness probe (for Kubernetes/Docker deployments)
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}));

export { router as healthRoutes };