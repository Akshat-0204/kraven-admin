import { pinoHttp } from 'pino-http';
import { logger } from '../shared/logger/logger.js';

export const requestLogger = pinoHttp({ logger });
