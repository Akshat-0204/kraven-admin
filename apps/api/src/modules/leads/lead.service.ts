import type { LeadFilterInput, LeadInput, UpdateLeadInput } from '@kraven/validation';
import { leadFilterSchema, leadSchema, updateLeadSchema } from '@kraven/validation';
import { ClientModel } from '../clients/client.model.js';
import { LeadModel } from './lead.model.js';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { getEntityActivity } from '../../shared/activity/activity.service.js';
import { assertObjectId, escapeRegExp } from '../../shared/utils/objectId.js';

export async function listLeads(filters: LeadFilterInput) {
  const parsedFilters = leadFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};

  if (parsedFilters.status) {
    query.status = parsedFilters.status;
  }

  if (parsedFilters.leadSource) {
    query.leadSource = parsedFilters.leadSource;
  }

  if (parsedFilters.assignedPerson) {
    query.assignedPerson = parsedFilters.assignedPerson;
  }

  if (parsedFilters.dateFrom || parsedFilters.dateTo) {
    query.dateCreated = {
      ...(parsedFilters.dateFrom ? { $gte: parsedFilters.dateFrom } : {}),
      ...(parsedFilters.dateTo ? { $lte: parsedFilters.dateTo } : {})
    };
  }

  if (parsedFilters.minValue !== undefined || parsedFilters.maxValue !== undefined) {
    query.estimatedValue = {
      ...(parsedFilters.minValue !== undefined ? { $gte: parsedFilters.minValue } : {}),
      ...(parsedFilters.maxValue !== undefined ? { $lte: parsedFilters.maxValue } : {})
    };
  }

  if (parsedFilters.search) {
    query.$or = [
      { name: new RegExp(escapeRegExp(parsedFilters.search), 'i') },
      { companyName: new RegExp(escapeRegExp(parsedFilters.search), 'i') },
      { email: new RegExp(escapeRegExp(parsedFilters.search), 'i') }
    ];
  }

  return LeadModel.find(query).sort({ dateCreated: -1, createdAt: -1 });
}

export async function getLeadById(leadId: string) {
  assertObjectId(leadId, 'lead');
  const lead = await LeadModel.findById(leadId);

  if (!lead) {
    throw new HttpError(404, 'Lead not found');
  }

  return lead;
}

export async function getLeadDetail(leadId: string) {
  const lead = await getLeadById(leadId);
  const activity = await getEntityActivity('Lead', leadId);

  return { lead, activity };
}

export async function createLead(input: LeadInput) {
  const payload = leadSchema.parse(input);
  const lead = await LeadModel.create(payload);

  await logActivity({
    entityType: 'Lead',
    entityId: String(lead._id),
    action: 'created',
    description: `Lead created - ${lead.companyName}`
  });

  return lead;
}

export async function updateLead(leadId: string, input: UpdateLeadInput) {
  const payload = updateLeadSchema.parse(input);
  const lead = await getLeadById(leadId);
  const previousStatus = lead.status;

  Object.assign(lead, payload);
  await lead.save();

  if (payload.status && payload.status !== previousStatus) {
    await logActivity({
      entityType: 'Lead',
      entityId: String(lead._id),
      action: 'status-changed',
      description: `Lead moved from ${previousStatus} to ${payload.status}`
    });
  } else {
    await logActivity({
      entityType: 'Lead',
      entityId: String(lead._id),
      action: 'updated',
      description: `Lead updated - ${lead.companyName}`
    });
  }

  return lead;
}

export async function deleteLead(leadId: string) {
  const lead = await getLeadById(leadId);
  await LeadModel.deleteOne({ _id: lead._id });

  await logActivity({
    entityType: 'Lead',
    entityId: String(lead._id),
    action: 'deleted',
    description: `Lead deleted - ${lead.companyName}`
  });
}

export async function convertLeadToClient(leadId: string) {
  const lead = await getLeadById(leadId);

  if (lead.convertedClient) {
    const existing = await ClientModel.findById(lead.convertedClient);

    if (!existing) {
      throw new HttpError(409, 'This lead was already converted, but its client no longer exists');
    }

    return existing;
  }

  const client = await ClientModel.create({
    companyName: lead.companyName,
    contactPerson: lead.name,
    email: lead.email,
    phone: lead.phone,
    requirements: lead.serviceInterested,
    notes: lead.notes,
    sourceLead: lead._id
  });

  lead.status = 'Won';
  lead.convertedClient = client._id;
  await lead.save();

  await logActivity({
    entityType: 'Lead',
    entityId: String(lead._id),
    action: 'converted',
    description: 'Lead converted to Client'
  });

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'created-from-lead',
    description: `Client created from lead - ${lead.companyName}`
  });

  return client;
}
