"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = require("winston");
const { combine, timestamp, errors, json, colorize, simple } = winston_1.format;
exports.logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), errors({ stack: true }), json()),
    defaultMeta: {
        service: 'eunacom-backend',
        environment: process.env.NODE_ENV || 'development',
    },
    transports: [
        new winston_1.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston_1.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 10,
        }),
    ],
});
exports.logger.add(new winston_1.transports.Console({
    format: combine(process.env.NODE_ENV === 'production' ? json() : colorize(), process.env.NODE_ENV === 'production' ? timestamp() : simple()),
}));
if (process.env.NODE_ENV === 'test') {
    exports.logger.level = 'error';
}
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map