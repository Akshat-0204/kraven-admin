import type { Request, Response } from 'express';
import {
  addClientLink,
  attachClientDocument,
  createClient,
  deleteClient,
  getClientDetail,
  listClients,
  removeClientDocument,
  removeClientLink,
  updateClient
} from './client.service.js';
import { serializeActivity, serializeClient, serializeProjectSummary } from './client.serializer.js';

export async function listClientsController(req: Request, res: Response) {
  const clients = await listClients(req.query as Record<string, string | undefined>);

  res.json({ clients: clients.map(serializeClient) });
}

export async function getClientController(req: Request, res: Response) {
  const { client, projects, activity } = await getClientDetail(req.params.id);

  res.json({
    client: serializeClient(client),
    projects: projects.map(serializeProjectSummary),
    activity: activity.map(serializeActivity)
  });
}

export async function createClientController(req: Request, res: Response) {
  const client = await createClient(req.body);

  res.status(201).json({ client: serializeClient(client) });
}

export async function updateClientController(req: Request, res: Response) {
  const client = await updateClient(req.params.id, req.body);

  res.json({ client: serializeClient(client) });
}

export async function deleteClientController(req: Request, res: Response) {
  await deleteClient(req.params.id);

  res.status(204).send();
}

export async function addClientLinkController(req: Request, res: Response) {
  const client = await addClientLink(req.params.id, req.body);

  res.status(201).json({ client: serializeClient(client) });
}

export async function removeClientLinkController(req: Request, res: Response) {
  const client = await removeClientLink(req.params.id, Number(req.params.linkIndex));

  res.json({ client: serializeClient(client) });
}

export async function attachClientDocumentController(req: Request, res: Response) {
  const client = await attachClientDocument(req.params.id, req.body);

  res.status(201).json({ client: serializeClient(client) });
}

export async function removeClientDocumentController(req: Request, res: Response) {
  const client = await removeClientDocument(req.params.id, req.params.fileId);

  res.json({ client: serializeClient(client) });
}
