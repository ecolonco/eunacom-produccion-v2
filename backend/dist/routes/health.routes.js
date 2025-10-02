"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.healthRoutes = router;
router.get('/', (0, error_middleware_1.asyncHandler)(async (req, res) => {
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
router.get('/detailed', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const checks = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            database: { status: 'unknown', latency: null },
            redis: { status: 'unknown', latency: null },
            openai: { status: 'unknown', latency: null },
        },
    };
    try {
        checks.services.database.status = 'not_configured';
    }
    catch (error) {
        checks.services.database.status = 'unhealthy';
        logger_1.logger.error('Database health check failed:', error);
    }
    try {
        checks.services.redis.status = 'not_configured';
    }
    catch (error) {
        checks.services.redis.status = 'unhealthy';
        logger_1.logger.error('Redis health check failed:', error);
    }
    try {
        if (process.env.OPENAI_API_KEY) {
            checks.services.openai.status = 'configured';
        }
        else {
            checks.services.openai.status = 'not_configured';
        }
    }
    catch (error) {
        checks.services.openai.status = 'unhealthy';
        logger_1.logger.error('OpenAI health check failed:', error);
    }
    const hasUnhealthy = Object.values(checks.services).some(service => service.status === 'unhealthy');
    if (hasUnhealthy) {
        checks.status = 'degraded';
        res.status(503);
    }
    res.json(checks);
}));
router.get('/ready', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
    });
}));
router.get('/live', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
}));
//# sourceMappingURL=health.routes.js.map