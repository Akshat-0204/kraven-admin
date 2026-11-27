import type { Request, Response } from 'express';
import { pipeStreamToResponse } from '../files/files.controller.js';
import { attachmentContentDisposition } from '../files/storage.service.js';
import { serializeDocumentDetail, serializeDocumentListItem } from './document.serializer.js';
import {
  createDocument,
  getDocument,
  getDocumentPdfUrl,
  getDocumentVariables,
  listDocuments,
  openDocumentPdf,
  shareDocument,
  updateDocument
} from './document.service.js';

export async function listDocumentsController(req: Request, res: Response) {
  const result = await listDocuments(req.query as Record<string, string | undefined>);
  res.json({ ...result, documents: result.documents.map(serializeDocumentListItem) });
}

export async function getDocumentVariablesController(req: Request, res: Response) {
  res.json({ variables: await getDocumentVariables(req.params.id) });
}

export async function getDocumentController(req: Request, res: Response) {
  res.json({ document: serializeDocumentDetail(await getDocument(req.params.id)) });
}

export async function createDocumentController(req: Request, res: Response) {
  const document = await createDocument(req.body, req.session.userId);
  res.status(201).json({ document: serializeDocumentDetail(document) });
}

/** Generates the PDF if needed and returns a 60s presigned URL. */
export async function generateDocumentPdfController(req: Request, res: Response) {
  res.json(await getDocumentPdfUrl(req.params.id));
}

/** Streams an already-generated PDF through the API (works when object storage is not publicly reachable). */
export async function downloadDocumentPdfController(req: Request, res: Response) {
  const { filename, stream } = await openDocumentPdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', attachmentContentDisposition(filename));
  await pipeStreamToResponse(stream, res, { documentId: req.params.id });
}

export async function shareDocumentController(req: Request, res: Response) {
  res.json({ document: serializeDocumentDetail(await shareDocument(req.params.id)) });
}

export async function updateDocumentController(req: Request, res: Response) {
  res.json({ document: serializeDocumentDetail(await updateDocument(req.params.id, req.body)) });
}
