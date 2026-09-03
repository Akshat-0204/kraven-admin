import { hash } from 'bcrypt';
import { connectDatabase } from '../../config/db.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger/logger.js';
import { UserModel } from './user.model.js';

async function seedUsers() {
  if (env.adminUsers.length !== 2) {
    throw new Error(
      'Set ADMIN_EMAIL_1, ADMIN_PASSWORD_1, ADMIN_EMAIL_2, and ADMIN_PASSWORD_2 before seeding users.'
    );
  }

  await connectDatabase({ required: true });

  for (const admin of env.adminUsers) {
    const hashedPassword = await hash(admin.password, 12);

    await UserModel.updateOne(
      { email: admin.email.toLowerCase().trim() },
      { $set: { email: admin.email.toLowerCase().trim(), hashedPassword } },
      { upsert: true }
    );
  }

  logger.info({ count: env.adminUsers.length }, 'seeded Kraven admin users');
  await UserModel.db.close();
}

seedUsers().catch((error) => {
  logger.error({ error }, 'failed to seed users');
  process.exit(1);
});
