import type { Readable } from 'node:stream';
import { SIGNATURE_IMAGE_MAX_BYTES } from '@kraven/config';
import { signDocumentSchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { DocumentModel } from '../documents/document.model.js';
import { documentPdfFilename } from '../documents/document.service.js';
import { FileMetadataModel } from '../files/file.model.js';
import { putObject, streamObject } from '../files/storage.service.js';
import { documentInLivePack } from './pack.service.js';
import { SignatureModel } from './signature.model.js';
import { sealPdf } from './seal.service.js';

async function toBuffer(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export const sealedPdfKey = (documentId: string, sealedSha256: string) => `documents/${documentId}-signed-${sealedSha256.slice(0, 12)}.pdf`;

export interface SignRequestMeta {
  ip: string;
  userAgent: string;
}

/**
 * Signs a document in one of the client's live packs. Other clients' documents, drafts and documents
 * outside a live pack all answer 404; an already signed document answers 409 and is never re-sealed.
 */
export async function signPortalDocument(clientId: string, documentId: string, body: unknown, meta: SignRequestMeta) {
  const input = signDocumentSchema.parse(body);
  if (!isValidObjectId(documentId)) throw new HttpError(404, 'Not found');
  const document = await DocumentModel.findOne({ _id: documentId, client: clientId });
  if (!document || document.status === 'Draft' || !(await documentInLivePack(clientId, documentId))) {
    throw new HttpError(404, 'Not found');
  }
  if (document.status === 'Signed') throw new HttpError(409, 'This document has already been signed');

  let signaturePng: Buffer | undefined;
  if (input.method === 'drawn') {
    signaturePng = Buffer.from((input.signatureImage as string).split(',')[1], 'base64');
    if (signaturePng.length > SIGNATURE_IMAGE_MAX_BYTES || signaturePng.subarray(1, 4).toString() !== 'PNG') {
      throw new HttpError(400, 'Invalid signature image');
    }
  }

  // Sign the snapshot taken at share time.
  const snapshot = document.pdfFile ? await FileMetadataModel.findById(document.pdfFile) : null;
  if (!snapshot) throw new HttpError(409, 'This document has no PDF snapshot; revise and share it again');
  const original = await toBuffer(await streamObject(snapshot.bucketKey));
  const signedAt = new Date();
  const { sealed, originalSha256, sealedSha256 } = await sealPdf({
    pdf: original,
    documentId,
    title: document.title,
    signerName: input.signerName,
    method: input.method,
    signaturePng,
    signedAt,
    ip: meta.ip,
    userAgent: meta.userAgent
  });

  // Store first under a hash-derived key (a losing racer cannot overwrite the winner's file), then claim.
  const key = sealedPdfKey(documentId, sealedSha256);
  await putObject(key, sealed, 'application/pdf');
  // Atomic claim: only one concurrent request moves the document to Signed.
  const claim = await DocumentModel.updateOne({ _id: documentId, status: { $in: ['Sent', 'Viewed'] } }, { $set: { status: 'Signed' } });
  if (claim.modifiedCount === 0) throw new HttpError(409, 'This document has already been signed');
  await SignatureModel.create({
    document: documentId,
    client: clientId,
    signerName: input.signerName,
    method: input.method,
    consent: true,
    signedAt,
    ip: meta.ip,
    userAgent: meta.userAgent,
    originalSha256,
    sealedSha256,
    sealedKey: key
  });
  await logActivity({
    entityType: 'Client',
    entityId: clientId,
    action: 'document-signed',
    description: `Document signed by ${input.signerName} - ${document.title}`
  });

  return { id: documentId, status: 'Signed' as const, signedAt: signedAt.toISOString(), sealedSha256 };
}

/** Streams the sealed PDF of a signed document the client owns. */
export async function openSealedPdf(clientId: string, documentId: string) {
  if (!isValidObjectId(documentId)) throw new HttpError(404, 'Not found');
  const signature = await SignatureModel.findOne({ document: documentId, client: clientId }).lean();
  const document = signature ? await DocumentModel.findOne({ _id: documentId, client: clientId }).select('title').lean() : null;
  if (!signature || !document) throw new HttpError(404, 'Not found');
  return {
    filename: documentPdfFilename(`${document.title} (signed)`),
    stream: await streamObject(signature.sealedKey)
  };
}
