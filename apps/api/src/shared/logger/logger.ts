import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Most call sites log `{ error }`; without this, Error objects serialize as `{}`.
  serializers: { err: pino.stdSerializers.err, error: pino.stdSerializers.err, cleanupError: pino.stdSerializers.err },
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true }
        }
      : undefined
});
