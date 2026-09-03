import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';

async function bootstrap() {
  await connectDatabase();

  createApp().listen(env.port, () => {
    logger.info({ port: env.port }, 'Kraven API listening');
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, 'failed to start API');
  process.exit(1);
});
