import { connectDatabase } from '../../config/db.js';
import { logger } from '../../shared/logger/logger.js';
import { DocumentTemplateModel } from './documentTemplate.model.js';
import { prepareTemplateHtml } from './merge.service.js';
import { PLACEHOLDER_TEMPLATES } from './placeholderTemplates.js';

/** Idempotent: inserts each placeholder template by name only if it does not exist; never overwrites edits. */
export async function seedDocumentTemplates() {
  let inserted = 0;
  for (const template of PLACEHOLDER_TEMPLATES) {
    const result = await DocumentTemplateModel.updateOne(
      { name: template.name },
      { $setOnInsert: { ...template, ...prepareTemplateHtml(template.html), version: 1 } },
      { upsert: true }
    );
    inserted += result.upsertedCount;
  }
  return inserted;
}

async function main() {
  await connectDatabase({ required: true });
  const inserted = await seedDocumentTemplates();
  logger.info({ inserted, total: PLACEHOLDER_TEMPLATES.length }, 'seeded document templates');
  await DocumentTemplateModel.db.close();
}

if (process.argv[1]?.endsWith('seed-templates.ts') || process.argv[1]?.endsWith('seed-templates.js')) {
  main().catch((error) => {
    logger.error({ error }, 'failed to seed document templates');
    process.exit(1);
  });
}
