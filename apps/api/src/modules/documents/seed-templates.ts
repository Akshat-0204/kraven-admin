import { connectDatabase } from '../../config/db.js';
import { logger } from '../../shared/logger/logger.js';
import { DocumentTemplateModel } from './documentTemplate.model.js';
import { prepareTemplateHtml } from './merge.service.js';
import { DEFAULT_TEMPLATES } from './defaultTemplates.js';

/**
 * Inserts each default template by name if missing. With `update`, existing templates with the same
 * name are overwritten with the default HTML and their version is bumped (documents keep their snapshot).
 */
export async function seedDocumentTemplates({ update = false }: { update?: boolean } = {}) {
  let inserted = 0;
  let updated = 0;
  for (const template of DEFAULT_TEMPLATES) {
    const prepared = { ...template, ...prepareTemplateHtml(template.html) };
    if (update) {
      const result = await DocumentTemplateModel.updateOne(
        { name: template.name },
        { $set: prepared, $inc: { version: 1 } },
        { upsert: true }
      );
      inserted += result.upsertedCount;
      updated += result.upsertedCount ? 0 : result.modifiedCount;
    } else {
      const result = await DocumentTemplateModel.updateOne(
        { name: template.name },
        { $setOnInsert: { ...prepared, version: 1 } },
        { upsert: true }
      );
      inserted += result.upsertedCount;
    }
  }
  return { inserted, updated };
}

async function main() {
  await connectDatabase({ required: true });
  const update = process.argv.includes('--update');
  const result = await seedDocumentTemplates({ update });
  logger.info({ ...result, update, total: DEFAULT_TEMPLATES.length }, 'seeded document templates');
  await DocumentTemplateModel.db.close();
}

if (process.argv[1]?.endsWith('seed-templates.ts') || process.argv[1]?.endsWith('seed-templates.js')) {
  main().catch((error) => {
    logger.error({ error }, 'failed to seed document templates');
    process.exit(1);
  });
}
