import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocumentTemplateModel } from './documentTemplate.model.js';
import { PLACEHOLDER_TEMPLATES } from './placeholderTemplates.js';
import { seedDocumentTemplates } from './seed-templates.js';

describe('seedDocumentTemplates', () => {
  afterEach(() => vi.restoreAllMocks());

  it('seeds exactly one generic template, insert-only so edits are never overwritten', async () => {
    const updateOne = vi.spyOn(DocumentTemplateModel, 'updateOne').mockResolvedValue({ upsertedCount: 1 } as never);

    expect(await seedDocumentTemplates()).toBe(1);
    expect(PLACEHOLDER_TEMPLATES.map((template) => template.name)).toEqual(['Project Proposal']);

    const [filter, update, options] = updateOne.mock.calls[0] as unknown as [
      Record<string, unknown>,
      { $setOnInsert: Record<string, unknown> },
      Record<string, unknown>
    ];
    expect(filter).toEqual({ name: 'Project Proposal' });
    expect(Object.keys(update)).toEqual(['$setOnInsert']);
    expect(update.$setOnInsert).toMatchObject({ type: 'Proposal', version: 1 });
    expect(update.$setOnInsert.variables).toEqual(
      expect.arrayContaining(['client.company', 'project.name', 'agency.name', 'today'])
    );
    expect(options).toEqual({ upsert: true });
  });

  it('reports nothing inserted when the template already exists', async () => {
    vi.spyOn(DocumentTemplateModel, 'updateOne').mockResolvedValue({ upsertedCount: 0 } as never);
    expect(await seedDocumentTemplates()).toBe(0);
  });
});
