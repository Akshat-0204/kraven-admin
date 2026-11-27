import type {
  PortalDocumentRecord,
  PortalFileRecord,
  PortalOverview,
  PortalPaymentRecord,
  PortalProjectRecord,
  PortalUpdateRecord
} from '@kraven/types';
import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { DocumentModel } from '../documents/document.model.js';
import { openDocumentPdf } from '../documents/document.service.js';
import { derivePaymentStatus } from '../finance/finance.calculations.js';
import { InvoiceModel } from '../finance/invoice.model.js';
import { FileMetadataModel, type FileMetadataDocument } from '../files/file.model.js';
import { PRESIGNED_URL_TTL_SECONDS, presignObject } from '../files/storage.service.js';
import { PayeeProfileModel } from '../payees/payeeProfile.model.js';
import { createPayeeResolver } from '../payees/payeeProfile.service.js';
import { ProjectUpdateModel } from '../projectUpdates/projectUpdate.model.js';
import { ProjectModel } from '../projects/project.model.js';

/*
 * Everything here is read through the portal cookie's clientId. Every query filters by that client
 * (directly or through its project ids), so ids belonging to another client resolve to 404.
 */

const LIST_LIMIT = 200;

async function clientProjects(clientId: string) {
  return ProjectModel.find({ client: clientId })
    .select('projectName status progressPercentage startDate expectedCompletionDate')
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();
}

async function clientProjectIds(clientId: string) {
  return (await clientProjects(clientId)).map((project) => project._id);
}

/** Files the client may download: client-visible and attached to the client or one of its projects. */
function visibleFilesFilter(clientId: string, projectIds: unknown[]) {
  return {
    clientVisible: true,
    $or: [
      { associatedEntityType: 'Client', associatedEntityId: clientId },
      { associatedEntityType: 'Project', associatedEntityId: { $in: projectIds } }
    ]
  };
}

function serializePortalFile(file: FileMetadataDocument & { _id: unknown }): PortalFileRecord {
  return {
    id: String(file._id),
    filename: file.filename,
    contentType: file.contentType,
    length: file.length,
    createdAt: new Date(file.createdAt).toISOString()
  };
}

function isoDate(value?: Date) {
  return value ? new Date(value).toISOString() : undefined;
}

export async function getPortalOverview(clientId: string): Promise<PortalOverview & { slug?: string }> {
  const client = await ClientModel.findById(clientId).select('companyName contactPerson portalAccess.slug').lean();
  if (!client) throw new HttpError(404, 'Not found');

  await ClientModel.updateOne({ _id: clientId }, { $set: { 'portalAccess.lastViewedAt': new Date() } });

  const projects: PortalProjectRecord[] = (await clientProjects(clientId)).map((project) => ({
    id: String(project._id),
    projectName: project.projectName,
    status: project.status,
    progressPercentage: project.progressPercentage ?? 0,
    startDate: isoDate(project.startDate),
    expectedCompletionDate: isoDate(project.expectedCompletionDate)
  }));

  return {
    slug: client.portalAccess?.slug,
    client: { companyName: client.companyName, contactPerson: client.contactPerson },
    projects
  };
}

export async function listPortalUpdates(clientId: string): Promise<PortalUpdateRecord[]> {
  const projects = await clientProjects(clientId);
  const projectNames = new Map(projects.map((project) => [String(project._id), project.projectName]));
  const projectIds = projects.map((project) => project._id);

  const updates = await ProjectUpdateModel.find({ project: { $in: projectIds }, clientVisible: true })
    .sort({ postedAt: -1 })
    .limit(LIST_LIMIT)
    .lean();

  const attachmentIds = updates.flatMap((update) => update.attachments ?? []);
  const files = attachmentIds.length
    ? await FileMetadataModel.find({ _id: { $in: attachmentIds }, ...visibleFilesFilter(clientId, projectIds) }).lean()
    : [];
  const filesById = new Map(files.map((file) => [String(file._id), serializePortalFile(file)]));

  return updates.map((update) => ({
    id: String(update._id),
    project: { id: String(update.project), projectName: projectNames.get(String(update.project)) ?? '' },
    title: update.title,
    body: update.body ?? '',
    postedAt: new Date(update.postedAt).toISOString(),
    attachments: (update.attachments ?? [])
      .map((id) => filesById.get(String(id)))
      .filter((file): file is PortalFileRecord => Boolean(file))
  }));
}

/** Drafts never reach the portal. */
const portalDocumentFilter = (clientId: string) => ({ client: clientId, status: { $ne: 'Draft' } });

export async function listPortalDocuments(clientId: string): Promise<PortalDocumentRecord[]> {
  const documents = await DocumentModel.find(portalDocumentFilter(clientId))
    .select('title status createdAt')
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();

  return documents.map((document) => ({
    id: String(document._id),
    title: document.title,
    status: document.status,
    createdAt: new Date(document.createdAt).toISOString()
  }));
}

/**
 * Opens a client's (non-draft) document snapshot PDF. The first open of a Sent
 * document marks it Viewed (atomic, so it is logged once) and records an activity event.
 */
export async function openPortalDocumentPdf(clientId: string, documentId: string) {
  if (!isValidObjectId(documentId)) throw new HttpError(404, 'Not found');
  const document = await DocumentModel.findOne({ _id: documentId, ...portalDocumentFilter(clientId) })
    .select('title status')
    .lean();
  if (!document) throw new HttpError(404, 'Not found');

  if (document.status === 'Sent') {
    const result = await DocumentModel.updateOne({ _id: documentId, status: 'Sent' }, { $set: { status: 'Viewed' } });
    if (result.modifiedCount > 0) {
      await logActivity({
        entityType: 'Client',
        entityId: clientId,
        action: 'document-viewed',
        description: `Client viewed document - ${document.title}`
      });
    }
  }

  return openDocumentPdf(documentId);
}

export async function listPortalPayments(clientId: string): Promise<PortalPaymentRecord[]> {
  const [invoices, payees] = await Promise.all([
    InvoiceModel.find({ client: clientId }).sort({ dueDate: -1 }).limit(LIST_LIMIT).lean(),
    PayeeProfileModel.find().limit(50).lean()
  ]);
  const resolvePayee = createPayeeResolver(payees);

  return invoices.map((invoice) => {
    const amountPaid = invoice.amountPaid ?? 0;
    return {
      id: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      amountPaid,
      remainingAmount: Math.max(invoice.amount - amountPaid, 0),
      invoiceDate: new Date(invoice.invoiceDate).toISOString(),
      dueDate: new Date(invoice.dueDate).toISOString(),
      // Derived at read time (overdue depends on today); the portal never writes invoices.
      paymentStatus: derivePaymentStatus(invoice.amount, amountPaid, new Date(invoice.dueDate)),
      payee: resolvePayee(invoice.payeeProfile)
    };
  });
}

export async function listPortalDownloads(clientId: string): Promise<PortalFileRecord[]> {
  const projectIds = await clientProjectIds(clientId);
  const files = await FileMetadataModel.find(visibleFilesFilter(clientId, projectIds))
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .lean();
  return files.map(serializePortalFile);
}

export async function getPortalDownloadUrl(clientId: string, fileId: string) {
  if (!isValidObjectId(fileId)) throw new HttpError(404, 'Not found');
  const projectIds = await clientProjectIds(clientId);
  const file = await FileMetadataModel.findOne({ _id: fileId, ...visibleFilesFilter(clientId, projectIds) }).lean();
  if (!file) throw new HttpError(404, 'Not found');

  return {
    url: await presignObject(file.bucketKey, { filename: file.filename }),
    expiresIn: PRESIGNED_URL_TTL_SECONDS
  };
}
