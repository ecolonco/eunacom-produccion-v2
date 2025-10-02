"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.asyncHandler = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_ERROR';
    logger_1.logger.error(`Error ${statusCode}: ${message}`, {
        error: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        code = 'VALIDATION_ERROR';
    }
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }
    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }
    else if (err.name === 'PrismaClientKnownRequestError') {
        statusCode = 400;
        message = 'Database operation failed';
        code = 'DATABASE_ERROR';
    }
    const response = {
        success: false,
        error: {
            code,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    };
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const createError = (message, statusCode = 500, code) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code || 'GENERIC_ERROR';
    error.isOperational = true;
    return error;
};
exports.createError = createError;
//# sourceMappingURL=error.middleware.js.map