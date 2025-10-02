"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const health_routes_1 = require("./routes/health.routes");
const auth_routes_1 = require("./routes/auth.routes");
const quiz_routes_1 = __importDefault(require("./routes/quiz.routes"));
const debug_routes_1 = require("./routes/debug.routes");
const exercise_factory_routes_1 = require("./routes/exercise-factory.routes");
const taxonomy_admin_routes_1 = require("./routes/taxonomy-admin.routes");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];
logger_1.logger.info(`CORS Origins configured: ${JSON.stringify(corsOrigins)}`);
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: NODE_ENV === 'production' ? 1000 : 1000,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, compression_1.default)());
if (NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined', {
        stream: {
            write: (message) => logger_1.logger.info(message.trim())
        }
    }));
}
app.use('/health', health_routes_1.healthRoutes);
app.use('/api/auth', auth_routes_1.authRoutes);
app.use('/api/quiz', quiz_routes_1.default);
app.use('/api/exercise-factory', exercise_factory_routes_1.exerciseFactoryRoutes);
app.use('/api/taxonomy-admin', taxonomy_admin_routes_1.taxonomyAdminRoutes);
app.use('/debug', debug_routes_1.debugRoutes);
app.get('/', (req, res) => {
    res.json({
        message: 'EUNACOM Learning Platform API',
        version: '1.0.0',
        environment: NODE_ENV,
        timestamp: new Date().toISOString(),
        documentation: '/api/docs',
    });
});
app.use(notFound_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
if (NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger_1.logger.info(`🚀 EUNACOM API server running on port ${PORT}`);
        logger_1.logger.info(`📚 Environment: ${NODE_ENV}`);
        logger_1.logger.info(`🔧 Health check: http://localhost:${PORT}/health`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map