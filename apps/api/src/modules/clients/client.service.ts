import type {
  AttachClientDocumentInput,
  ClientFilterInput,
  ClientInput,
  UpdateClientInput
} from '@kraven/validation';
import {
  attachClientDocumentSchema,
  clientFilterSchema,
  clientSchema,
  linkSchema,
  updateClientSchema
} from '@kraven/validation';
import { getEntityActivity, logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ProjectModel } from '../projects/project.model.js';
import { ClientModel } from './client.model.js';
import { assertObjectId, escapeRegExp } from '../../shared/utils/objectId.js';

export async function listClients(filters: ClientFilterInput) {
  const parsedFilters = clientFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};

  if (parsedFilters.search) {
    query.$or = [
      { companyName: new RegExp(escapeRegExp(parsedFilters.search), 'i') },
      { contactPerson: new RegExp(escapeRegExp(parsedFilters.search), 'i') },
      { email: new RegExp(escapeRegExp(parsedFilters.search), 'i') }
    ];
  }

  return ClientModel.find(query).sort({ companyName: 1 });
}

export async function getClientById(clientId: string) {
  assertObjectId(clientId, 'client');
  const client = await ClientModel.findById(clientId);

  if (!client) {
    throw new HttpError(404, 'Client not found');
  }

  return client;
}

export async function getClientDetail(clientId: string) {
  const client = await getClientById(clientId);
  const [projects, activity] = await Promise.all([
    ProjectModel.find({ client: client._id }).sort({ createdAt: -1 }),
    getEntityActivity('Client', clientId)
  ]);

  return { client, projects, activity };
}

export async function createClient(input: ClientInput) {
  const payload = clientSchema.parse(input);
  const client = await ClientModel.create(payload);

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'created',
    description: `Client created - ${client.companyName}`
  });

  return client;
}

export async function updateClient(clientId: string, input: UpdateClientInput) {
  const payload = updateClientSchema.parse(input);
  const client = await getClientById(clientId);

  Object.assign(client, payload);
  await client.save();

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'updated',
    description: `Client updated - ${client.companyName}`
  });

  return client;
}

export async function deleteClient(clientId: string) {
  const client = await getClientById(clientId);
  await ClientModel.deleteOne({ _id: client._id });

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'deleted',
    description: `Client deleted - ${client.companyName}`
  });
}

export async function addClientLink(clientId: string, input: unknown) {
  const link = linkSchema.parse(input);
  const client = await getClientById(clientId);

  client.links.push(link);
  await client.save();

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'link-added',
    description: `Link added - ${link.label}`
  });

  return client;
}

export async function removeClientLink(clientId: string, linkIndex: number) {
  const client = await getClientById(clientId);

  if (!Number.isInteger(linkIndex) || linkIndex < 0 || linkIndex >= client.links.length) {
    throw new HttpError(404, 'Link not found');
  }

  const [removed] = client.links.splice(linkIndex, 1);
  await client.save();

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'link-removed',
    description: `Link removed - ${(removed as { label?: string }).label ?? 'Client link'}`
  });

  return client;
}

export async function attachClientDocument(clientId: string, input: AttachClientDocumentInput) {
  const document = attachClientDocumentSchema.parse(input);
  const client = await getClientById(clientId);

  client.documents.push(document);
  await client.save();

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'document-attached',
    description: `Document attached - ${document.filename}`
  });

  return client;
}

export async function removeClientDocument(clientId: string, fileId: string) {
  assertObjectId(fileId, 'document');
  const client = await getClientById(clientId);
  const nextDocuments = client.documents.filter(
    (document) => String((document as { fileId: unknown }).fileId) !== fileId
  );

  if (nextDocuments.length === client.documents.length) {
    throw new HttpError(404, 'Document not found');
  }

  client.documents = nextDocuments;
  await client.save();

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'document-removed',
    description: 'Document removed'
  });

  return client;
}
