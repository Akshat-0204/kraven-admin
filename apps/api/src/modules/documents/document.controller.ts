import type { Request, Response } from 'express';
import { pipeStreamToResponse } from '../files/files.controller.js';
import { attachmentContentDisposition } from '../files/storage.service.js';
import { serializeFileMetadata } from '../files/files.serializer.js';
import { serializeDocumentDetail, serializeDocumentListItem } from './document.serializer.js';
import {
  createDocument,
  deleteDocument,
  getDocument,
  getDocumentVariables,
  isPdfStale,
  listDocuments,
  openDocumentPdf,
  refillDocument,
  reviseDocument,
  saveDocumentPdf,
  setDocumentAccess,
  shareDocument,
  updateDocument
} from './document.service.js';

async function detail(document: Awaited<ReturnType<typeof getDocument>>) {
  return serializeDocumentDetail(document, await isPdfStale(document));
}

export async function listDocumentsController(req: Request, res: Response) {
  const { stale, ...result } = await listDocuments(req.query as Record<string, string | undefined>);
  res.json({
    ...result,
    documents: result.documents.map((document) => serializeDocumentListItem(document, stale.has(String(document._id))))
  });
}

export async function getDocumentVariablesController(req: Request, res: Response) {
  res.json({ variables: await getDocumentVariables(req.params.id) });
}

export async function getDocumentController(req: Request, res: Response) {
  res.json({ document: await detail(await getDocument(req.params.id)) });
}

export async function createDocumentController(req: Request, res: Response) {
  const document = await createDocument(req.body, req.session.userId);
  res.status(201).json({ document: await detail(document) });
}

/** "Save as PDF": exports the Google Doc to a categorized client file. */
export async function saveDocumentPdfController(req: Request, res: Response) {
  const { file, document } = await saveDocumentPdf(req.params.id, req.body, req.session.userId);
  res.status(201).json({ file: serializeFileMetadata(file), document: await detail(document) });
}

/** Streams the saved / snapshot PDF through the API. */
export async function downloadDocumentPdfController(req: Request, res: Response) {
  const { filename, stream } = await openDocumentPdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', attachmentContentDisposition(filename));
  await pipeStreamToResponse(stream, res, { documentId: req.params.id });
}

export async function shareDocumentController(req: Request, res: Response) {
  res.json({ document: await detail(await shareDocument(req.params.id)) });
}

export async function reviseDocumentController(req: Request, res: Response) {
  res.json({ document: await detail(await reviseDocument(req.params.id)) });
}

export async function refillDocumentController(req: Request, res: Response) {
  res.json({ document: await detail(await refillDocument(req.params.id)) });
}

export async function setDocumentAccessController(req: Request, res: Response) {
  const body = (req.body as { access?: unknown })?.access ?? req.body;
  res.json({ document: await detail(await setDocumentAccess(req.params.id, body)) });
}

export async function deleteDocumentController(req: Request, res: Response) {
  await deleteDocument(req.params.id);
  res.status(204).end();
}

export async function updateDocumentController(req: Request, res: Response) {
  res.json({ document: await detail(await updateDocument(req.params.id, req.body)) });
}
