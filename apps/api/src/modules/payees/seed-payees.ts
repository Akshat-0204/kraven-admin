import { connectDatabase } from '../../config/db.js';
import { logger } from '../../shared/logger/logger.js';
import { PayeeProfileModel } from './payeeProfile.model.js';

export const SEED_PAYEE_PROFILES = [
  { name: 'Sanchit Jain', vpa: 'sanxhit@slc', isDefault: true },
  { name: 'Akshat Soni', vpa: 'soniakshat56@oksbi', isDefault: false }
] as const;

/** Insert-only: existing profiles (matched by UPI ID) are left untouched. */
export async function seedPayeeProfiles() {
  const hasDefault = Boolean(await PayeeProfileModel.exists({ isDefault: true }));
  let inserted = 0;

  for (const profile of SEED_PAYEE_PROFILES) {
    if (await PayeeProfileModel.exists({ vpa: profile.vpa })) continue;
    await PayeeProfileModel.create({ ...profile, isDefault: profile.isDefault && !hasDefault });
    inserted += 1;
  }
  return inserted;
}

async function main() {
  await connectDatabase({ required: true });
  const inserted = await seedPayeeProfiles();
  logger.info({ inserted, total: SEED_PAYEE_PROFILES.length }, 'seeded payee profiles');
  await PayeeProfileModel.db.close();
}

if (process.argv[1]?.endsWith('seed-payees.ts') || process.argv[1]?.endsWith('seed-payees.js')) {
  main().catch((error) => {
    logger.error({ error }, 'failed to seed payee profiles');
    process.exit(1);
  });
}
