"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            suggestion: 'Please check the API documentation for available endpoints',
        },
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=notFound.middleware.js.map