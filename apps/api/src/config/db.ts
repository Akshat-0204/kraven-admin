import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../shared/logger/logger.js';

interface ConnectDatabaseOptions {
  required?: boolean;
}

export async function connectDatabase(options: ConnectDatabaseOptions = {}) {
  const required = options.required ?? env.requireDatabase ?? env.nodeEnv === 'production';

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 2000 });
    logger.info({ mongoUri: env.mongoUri }, 'connected to MongoDB');
  } catch (error) {
    if (required) {
      throw error;
    }

    logger.warn({ error, mongoUri: env.mongoUri }, 'MongoDB unavailable; API started without DB');
  }
}
