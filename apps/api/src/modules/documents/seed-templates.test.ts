import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEMPLATES } from './defaultTemplates.js';
import { DocumentTemplateModel } from './documentTemplate.model.js';
import { prepareTemplateHtml } from './merge.service.js';
import { seedDocumentTemplates } from './seed-templates.js';
import { sanitizeTemplateHtml } from './template.sanitize.js';

describe('seedDocumentTemplates', () => {
  afterEach(() => vi.restoreAllMocks());

  it('seeds the four agency templates, insert-only so edits are never overwritten', async () => {
    const updateOne = vi.spyOn(DocumentTemplateModel, 'updateOne').mockResolvedValue({ upsertedCount: 1 } as never);

    expect((await seedDocumentTemplates()).inserted).toBe(4);
    expect(DEFAULT_TEMPLATES.map((template) => template.type)).toEqual([
      'Proposal',
      'Statement of Work',
      'Agreement',
      'Handover'
    ]);
    expect(updateOne).toHaveBeenCalledTimes(4);

    const [filter, update, options] = updateOne.mock.calls[0] as unknown as [
      Record<string, unknown>,
      { $setOnInsert: Record<string, unknown> },
      Record<string, unknown>
    ];
    expect(filter).toEqual({ name: DEFAULT_TEMPLATES[0].name });
    expect(Object.keys(update)).toEqual(['$setOnInsert']);
    expect(update.$setOnInsert).toMatchObject({ type: 'Proposal', version: 1 });
    expect(update.$setOnInsert.variables).toEqual(expect.arrayContaining(['client.company', 'agency.name', 'today']));
    expect(options).toEqual({ upsert: true });
  });

  it('reports nothing inserted when the templates already exist', async () => {
    vi.spyOn(DocumentTemplateModel, 'updateOne').mockResolvedValue({ upsertedCount: 0 } as never);
    expect((await seedDocumentTemplates()).inserted).toBe(0);
  });

  describe.each(DEFAULT_TEMPLATES.map((template) => [template.name, template] as const))('%s', (_name, template) => {
    it('uses only known variables and survives sanitizing unchanged', () => {
      const prepared = prepareTemplateHtml(template.html);
      expect(prepared.variables.length).toBeGreaterThan(0);
      expect(prepared.html).toBe(sanitizeTemplateHtml(prepared.html));
      // sanitizing keeps every highlighted free-text placeholder and the headings
      const highlights = (html: string) => (html.match(/background-color:\s*#fff3a3/g) ?? []).length;
      expect(highlights(prepared.html)).toBe(highlights(template.html));
      expect(highlights(prepared.html)).toBeGreaterThan(0);
      expect(prepared.html).toContain('<h2');
      expect(prepared.html).toContain('<table');
    });
  });
});
