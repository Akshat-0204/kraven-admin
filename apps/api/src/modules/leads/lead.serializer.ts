import type { ActivityRecord, ClientRecord, LeadRecord } from '@kraven/types';
import type { ActivityDocument } from '../../shared/activity/activity.model.js';
import type { ClientDocument } from '../clients/client.model.js';
import type { LeadDocument } from './lead.model.js';

function dateToString(value?: Date) {
  return value ? value.toISOString() : undefined;
}

export function serializeLead(lead: LeadDocument & { _id: unknown }): LeadRecord {
  return {
    id: String(lead._id),
    name: lead.name,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    leadSource: lead.leadSource,
    serviceInterested: lead.serviceInterested,
    estimatedValue: lead.estimatedValue,
    assignedPerson: lead.assignedPerson,
    dateCreated: lead.dateCreated.toISOString(),
    lastContactedDate: dateToString(lead.lastContactedDate),
    nextFollowUpDate: dateToString(lead.nextFollowUpDate),
    status: lead.status,
    notes: lead.notes,
    convertedClient: lead.convertedClient ? String(lead.convertedClient) : undefined,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString()
  };
}

export function serializeActivity(activity: ActivityDocument & { _id: unknown }): ActivityRecord {
  return {
    id: String(activity._id),
    entityType: activity.entityType,
    entityId: String(activity.entityId),
    action: activity.action,
    description: activity.description,
    timestamp: activity.timestamp.toISOString()
  };
}

export function serializeClient(client: ClientDocument & { _id: unknown }): ClientRecord {
  return {
    id: String(client._id),
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone,
    links: [],
    documents: [],
    sourceLead: client.sourceLead ? String(client.sourceLead) : undefined
  };
}
