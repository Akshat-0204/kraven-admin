import type { Request, Response } from 'express';
import { DOCUMENT_VARIABLES } from './document.variables.js';
import { serializeDocumentTemplate } from './document.serializer.js';
import {
  createDocumentTemplate,
  getDocumentTemplate,
  listDocumentTemplates,
  previewDocumentTemplate,
  updateDocumentTemplate
} from './documentTemplate.service.js';

export async function listDocumentVariablesController(_req: Request, res: Response) {
  res.json({ variables: DOCUMENT_VARIABLES });
}

export async function listDocumentTemplatesController(_req: Request, res: Response) {
  const templates = await listDocumentTemplates();
  res.json({ templates: templates.map(serializeDocumentTemplate) });
}

export async function getDocumentTemplateController(req: Request, res: Response) {
  res.json({ template: serializeDocumentTemplate(await getDocumentTemplate(req.params.id)) });
}

export async function createDocumentTemplateController(req: Request, res: Response) {
  res.status(201).json({ template: serializeDocumentTemplate(await createDocumentTemplate(req.body)) });
}

export async function updateDocumentTemplateController(req: Request, res: Response) {
  res.json({ template: serializeDocumentTemplate(await updateDocumentTemplate(req.params.id, req.body)) });
}

export async function previewDocumentTemplateController(req: Request, res: Response) {
  res.json({ html: await previewDocumentTemplate(req.params.id, req.body) });
}
