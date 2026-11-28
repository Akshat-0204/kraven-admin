import type { Request, Response } from 'express';
import {
  convertLeadToClient,
  createLead,
  deleteLead,
  getLeadDetail,
  listLeads,
  updateLead
} from './lead.service.js';
import { serializeActivity, serializeClient, serializeLead } from './lead.serializer.js';

export async function listLeadsController(req: Request, res: Response) {
  const leads = await listLeads(req.query as Record<string, string | undefined>);

  res.json({ leads: leads.map(serializeLead) });
}

export async function getLeadController(req: Request, res: Response) {
  const { lead, activity } = await getLeadDetail(req.params.id);

  res.json({
    lead: serializeLead(lead),
    activity: activity.map(serializeActivity)
  });
}

export async function createLeadController(req: Request, res: Response) {
  const lead = await createLead(req.body);

  res.status(201).json({ lead: serializeLead(lead) });
}

export async function updateLeadController(req: Request, res: Response) {
  const lead = await updateLead(req.params.id, req.body);

  res.json({ lead: serializeLead(lead) });
}

export async function deleteLeadController(req: Request, res: Response) {
  await deleteLead(req.params.id);

  res.status(204).send();
}

export async function convertLeadController(req: Request, res: Response) {
  const client = await convertLeadToClient(req.params.id);

  res.status(201).json({ client: serializeClient(client) });
}
