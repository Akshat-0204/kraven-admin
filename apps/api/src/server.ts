import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { ensureBucket } from './modules/files/storage.service.js';
import { logger } from './shared/logger/logger.js';

async function ensureStorage() {
  try {
    await ensureBucket();
  } catch (error) {
    if (env.nodeEnv === 'production') throw error;
    logger.warn({ error, bucket: env.s3.bucket }, 'object storage unavailable; file uploads will fail');
  }
}

async function bootstrap() {
  await connectDatabase();
  await ensureStorage();

  createApp().listen(env.port, () => {
    logger.info({ port: env.port }, 'Kraven API listening');
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, 'failed to start API');
  process.exit(1);
});
