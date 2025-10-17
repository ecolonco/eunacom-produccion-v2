import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import quizRoutes from './routes/quiz.routes';
import { adminUsersRoutes } from './routes/admin-users.routes';
import { debugRoutes } from './routes/debug.routes';
import { exerciseFactoryRoutes } from './routes/exercise-factory.routes';
import { taxonomyAdminRoutes } from './routes/taxonomy-admin.routes';
import qaSweepRoutes from './routes/qa-sweep.routes';
import qaSweepFixRoutes from './routes/qa-sweep-fix.routes';
import debugTablesRoutes from './routes/debug-tables.routes';
import cleanupRoutes from './routes/cleanup.routes';
import backupRoutes from './routes/backup.routes';
import taxonomyInventoryRoutes from './routes/taxonomy-inventory.routes';
import adminCleanupRoutes from './routes/admin-cleanup.routes';
import { exerciseManagementRoutes } from './routes/exercise-management.routes';
import { creditsRoutes } from './routes/credits.routes';
import { paymentsRoutes } from './routes/payments.routes';
import { adminPaymentsRoutes } from './routes/admin-payments.routes';
import adminQaControlRoutes from './routes/admin-qa-control.routes';
import qaSweep2Routes, { qaSweep2Routes as qaSweep2NamedRoutes } from './routes/qa-sweep-2.routes';
import controlRoutes from './routes/control.routes';
import adminControlsRoutes from './routes/admin-controls.routes';
import examRoutes from './routes/exam.routes';
import adminExamsRoutes from './routes/admin-exams.routes';
import mockExamRoutes from './routes/mock-exam.routes';
import adminMockExamsRoutes from './routes/admin-mock-exams.routes';
import { adminTopicsRoutes } from './routes/admin-topics.routes';
import { aiAnalysisRoutes } from './routes/ai-analysis.routes';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();
// API server ready - Taxonomy Admin Routes Deployed

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for Render deployment
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
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

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

logger.info(`CORS Origins configured: ${JSON.stringify(corsOrigins)}`);

// Permitir CORS para Vercel, localhost y dominios configurados
app.use(cors({
  origin: (origin, callback) => {
    // Log para debugging
    logger.info(`CORS request from origin: ${origin}`);
    
    // Permitir sin origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Permitir localhost
    if (origin.includes('localhost')) return callback(null, true);
    
    // Permitir Vercel
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Permitir Flow.cl (sandbox y producción)
    if (origin.includes('flow.cl')) return callback(null, true);
    
    // Permitir eunacomtest.cl y sus subdominios
    if (origin.includes('eunacomtest.cl')) return callback(null, true);
    
    // Permitir orígenes configurados
    if (corsOrigins.includes(origin)) return callback(null, true);
    
    // Rechazar otros
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 1000 : 1000, // temporarily increased for testing
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check routes (no rate limiting)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminUsersRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin/payments', adminPaymentsRoutes);
app.use('/api/admin/qa-control', adminQaControlRoutes);
app.use('/api/admin/qa-sweep-2', qaSweep2Routes);
app.use('/api/admin/controls', adminControlsRoutes);
app.use('/api/controls', controlRoutes);
app.use('/api/admin/exams', adminExamsRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admin/mock-exams', adminMockExamsRoutes);
app.use('/api/mock-exams', mockExamRoutes);
app.use('/api/admin', adminTopicsRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/exercise-factory', exerciseFactoryRoutes);
app.use('/api/taxonomy-admin', taxonomyAdminRoutes);
app.use('/api/qa-sweep', qaSweepRoutes);
app.use('/api/qa-sweep-fix', qaSweepFixRoutes);
app.use('/api/debug', debugTablesRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/taxonomy-inventory', taxonomyInventoryRoutes);
app.use('/api/admin-cleanup', adminCleanupRoutes);
app.use('/api/exercise-management', exerciseManagementRoutes);

// Debug routes (temporal para diagnosticar BD)
app.use('/debug', debugRoutes);


// Additional routes will be added here
// app.use('/api/users', userRoutes);
// app.use('/api/taxonomy', taxonomyRoutes);
// app.use('/api/questions', questionRoutes);
// app.use('/api/practice', practiceRoutes);
// app.use('/api/credits', creditRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/analytics', analyticsRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'EUNACOM Learning Platform API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    documentation: '/api/docs',
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
if (NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // Use both console.log and logger to ensure visibility
    console.log('='.repeat(80));
    console.log('🆔 CODE VERSION: 2025-10-17-v14-AI-ANALYSIS');
    console.log('🤖 AI Student Analysis: Individual post-exam + Evolutionary performance analysis');
    console.log('🎯 Manual Topic Upload: Admin can select specialty/topic before CSV upload');
    console.log('📦 Exercise Factory: Both AI classification and manual classification available');
    console.log('='.repeat(80));

    logger.info(`🚀 EUNACOM API server running on port ${PORT}`);
    logger.info(`📚 Environment: ${NODE_ENV}`);
    logger.info(`🔧 Health check: http://localhost:${PORT}/health`);
    logger.info(`🆔 CODE VERSION: 2025-10-17-v14-AI-ANALYSIS - AI student performance analysis`);
  });
}

export default app;