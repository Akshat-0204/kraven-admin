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

export async function createDocumentTemplate(input: DocumentTemplateInput) {
  const payload = documentTemplateSchema.parse(input);
  return DocumentTemplateModel.create({ ...payload, ...prepareTemplateHtml(payload.html), version: 1 });
}

/** Applies an edit and bumps `version` when anything changed. Existing documents keep their snapshots. */
export async function updateDocumentTemplate(templateId: string, input: UpdateDocumentTemplateInput) {
  const payload = updateDocumentTemplateSchema.parse(input);
  const template = await getDocumentTemplate(templateId);

  if (payload.name !== undefined) template.name = payload.name;
  if (payload.type !== undefined) template.type = payload.type;
  if (payload.html !== undefined) {
    const prepared = prepareTemplateHtml(payload.html);
    template.html = prepared.html;
    template.variables = prepared.variables;
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
