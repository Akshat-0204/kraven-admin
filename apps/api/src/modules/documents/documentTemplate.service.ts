import type { DocumentContextInput, DocumentTemplateInput, UpdateDocumentTemplateInput } from '@kraven/validation';
import { documentContextSchema, documentTemplateSchema, updateDocumentTemplateSchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { HttpError } from '../../shared/errors/httpError.js';
import { loadMergeSource } from './document.context.js';
import { DocumentTemplateModel } from './documentTemplate.model.js';
import { prepareTemplateHtml, renderDocumentHtml } from './merge.service.js';

export async function listDocumentTemplates() {
  return DocumentTemplateModel.find().sort({ name: 1 });
}

export async function getDocumentTemplate(templateId: string) {
  const template = isValidObjectId(templateId) ? await DocumentTemplateModel.findById(templateId) : null;
  if (!template) {
    throw new HttpError(404, 'Template not found');
  }
  return template;
}

/** Sanitizes body/header/footer and records the variables used across all three. */
function prepareTemplateParts(html: string, headerHtml: string, footerHtml: string) {
  const body = prepareTemplateHtml(html);
  const header = prepareTemplateHtml(headerHtml, { allowPageTokens: true });
  const footer = prepareTemplateHtml(footerHtml, { allowPageTokens: true });
  return {
    html: body.html,
    headerHtml: header.html,
    footerHtml: footer.html,
    variables: [...new Set([...body.variables, ...header.variables, ...footer.variables])]
  };
}

export async function createDocumentTemplate(input: DocumentTemplateInput) {
  const payload = documentTemplateSchema.parse(input);
  const prepared = prepareTemplateParts(payload.html, payload.headerHtml ?? '', payload.footerHtml ?? '');
  return DocumentTemplateModel.create({ name: payload.name, type: payload.type, ...prepared, version: 1 });
}

/** Applies an edit and bumps `version` when anything changed. Existing documents keep their snapshots. */
export async function updateDocumentTemplate(templateId: string, input: UpdateDocumentTemplateInput) {
  const payload = updateDocumentTemplateSchema.parse(input);
  const template = await getDocumentTemplate(templateId);

  if (payload.name !== undefined) template.name = payload.name;
  if (payload.type !== undefined) template.type = payload.type;
  if (payload.html !== undefined || payload.headerHtml !== undefined || payload.footerHtml !== undefined) {
    const prepared = prepareTemplateParts(
      payload.html ?? template.html,
      payload.headerHtml ?? template.headerHtml ?? '',
      payload.footerHtml ?? template.footerHtml ?? ''
    );
    // Assign only real changes so a no-op save does not bump the version.
    if (prepared.html !== template.html) template.html = prepared.html;
    if (prepared.headerHtml !== (template.headerHtml ?? '')) template.headerHtml = prepared.headerHtml;
    if (prepared.footerHtml !== (template.footerHtml ?? '')) template.footerHtml = prepared.footerHtml;
    if (prepared.variables.join() !== template.variables.join()) template.variables = prepared.variables;
  }

  if (template.isModified()) {
    template.version += 1;
    await template.save();
  }
  return template;
}

export async function previewDocumentTemplate(templateId: string, input: DocumentContextInput) {
  const context = documentContextSchema.parse(input);
  const template = await getDocumentTemplate(templateId);
  const source = await loadMergeSource(context.client, context.project);
  return renderDocumentHtml(template.html, template.name, source);
}
