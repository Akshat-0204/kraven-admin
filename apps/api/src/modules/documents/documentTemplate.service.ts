import type { UpdateDocumentTemplateInput, DocumentTemplateInput } from '@kraven/validation';
import { documentTemplateSchema, updateDocumentTemplateSchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { HttpError } from '../../shared/errors/httpError.js';
import { getConnection } from '../google/google.client.js';
import { getFile, parseDocId } from '../google/drive.service.js';
import { DocumentTemplateModel } from './documentTemplate.model.js';

export async function listDocumentTemplates() {
  return DocumentTemplateModel.find({ active: { $ne: false } }).sort({ name: 1 });
}

export async function getDocumentTemplate(templateId: string) {
  const template = isValidObjectId(templateId) ? await DocumentTemplateModel.findById(templateId) : null;
  if (!template) {
    throw new HttpError(404, 'Template not found');
  }
  return template;
}

/** Parses the link and confirms the connected account can read it. Returns the file id and Drive title. */
async function resolveLink(googleDocUrl: string) {
  const fileId = parseDocId(googleDocUrl);
  if (!fileId) throw new HttpError(400, 'That does not look like a Google Doc link');
  try {
    const file = await getFile(fileId);
    return { fileId, title: file.name };
  } catch (error) {
    if (error instanceof HttpError && (error.statusCode === 404 || error.statusCode === 403)) {
      const connection = await getConnection();
      const who = connection?.email ?? 'the connected Google account';
      throw new HttpError(403, `Share this doc with ${who} so the app can copy it`);
    }
    throw error;
  }
}

export async function createDocumentTemplate(input: DocumentTemplateInput) {
  const payload = documentTemplateSchema.parse(input);
  const { fileId, title } = await resolveLink(payload.googleDocUrl);
  return DocumentTemplateModel.create({
    name: payload.name || title,
    type: payload.type,
    googleDocUrl: payload.googleDocUrl,
    googleFileId: fileId,
    active: true
  });
}

export async function updateDocumentTemplate(templateId: string, input: UpdateDocumentTemplateInput) {
  const payload = updateDocumentTemplateSchema.parse(input);
  const template = await getDocumentTemplate(templateId);

  if (payload.type !== undefined) template.type = payload.type;
  if (payload.googleDocUrl !== undefined && payload.googleDocUrl !== template.googleDocUrl) {
    const { fileId, title } = await resolveLink(payload.googleDocUrl);
    template.googleDocUrl = payload.googleDocUrl;
    template.googleFileId = fileId;
    if (!payload.name && !template.name) template.name = title;
  }
  if (payload.name) template.name = payload.name;

  await template.save();
  return template;
}

export async function deleteDocumentTemplate(templateId: string) {
  const template = await getDocumentTemplate(templateId);
  await template.deleteOne();
}
