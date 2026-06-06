// =============================================================================
// server/src/utils/logger.ts
// Winston logger configuration
// =============================================================================

import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isDev = process.env['NODE_ENV'] !== 'production';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'meetmind-api' },
  transports: [
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
  ],
});

// Convenience child-logger factory
export function childLogger(context: string): winston.Logger {
  return logger.child({ context });
}
