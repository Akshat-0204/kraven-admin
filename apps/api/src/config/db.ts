import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../shared/logger/logger.js';

/** Mongo URI with any password masked, safe for logs. */
export function redactMongoUri(uri: string) {
  return uri.replace(/(\/\/[^:/@]+:)[^@]*@/, '$1****@');
}

interface ConnectDatabaseOptions {
  required?: boolean;
}

export async function connectDatabase(options: ConnectDatabaseOptions = {}) {
  const required = options.required ?? env.requireDatabase ?? env.nodeEnv === 'production';

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 2000 });
    logger.info({ mongoUri: redactMongoUri(env.mongoUri) }, 'connected to MongoDB');
  } catch (error) {
    if (required) {
      throw error;
    }

    logger.warn({ error, mongoUri: redactMongoUri(env.mongoUri) }, 'MongoDB unavailable; API started without DB');
  }
}
