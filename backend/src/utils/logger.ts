import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = format;

// Create logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: 'eunacom-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Write all logs with importance level of 'error' or less to error.log
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// Always log to console for visibility in cloud platforms like Render
logger.add(new transports.Console({
  format: combine(
    process.env.NODE_ENV === 'production' ? json() : colorize(),
    process.env.NODE_ENV === 'production' ? timestamp() : simple()
  ),
}));

// If we're in test environment, reduce logging
if (process.env.NODE_ENV === 'test') {
  logger.level = 'error';
}

export default logger;