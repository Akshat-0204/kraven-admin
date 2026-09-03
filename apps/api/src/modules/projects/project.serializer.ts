import type { ActivityRecord, ClientRecord, ProjectRecord } from '@kraven/types';
import type { ActivityDocument } from '../../shared/activity/activity.model.js';
import type { ClientDocument } from '../clients/client.model.js';
import type { ProjectDocument } from './project.model.js';

function dateToString(value?: Date) {
  return value ? value.toISOString() : undefined;
}

function serializeClientId(client: ProjectDocument['client']) {
  return typeof client === 'object' && '_id' in client ? String(client._id) : String(client);
}

export function serializeProject(project: ProjectDocument & { _id: unknown }): ProjectRecord {
  return {
    id: String(project._id),
    client: serializeClientId(project.client),
    projectName: project.projectName,
    description: project.description,
    projectValue: project.projectValue,
    startDate: dateToString(project.startDate),
    expectedCompletionDate: dateToString(project.expectedCompletionDate),
    actualCompletionDate: dateToString(project.actualCompletionDate),
    status: project.status,
    progressPercentage: project.progressPercentage,
    assignedTeam: project.assignedTeam,
    priority: project.priority,
    notes: project.notes,
    deliverables: project.deliverables,
    links: (project.links as { label: string; url: string }[]).map((link) => ({
      label: link.label,
      url: link.url
    })),
    documents: (project.documents as { fileId: unknown; filename: string; contentType?: string; uploadedAt?: Date }[]).map(
      (document) => ({
        fileId: String(document.fileId),
        filename: document.filename,
        contentType: document.contentType,
        uploadedAt: dateToString(document.uploadedAt) ?? ''
      })
    ),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}

export function serializeProjectClient(client: ClientDocument & { _id: unknown }): ClientRecord {
  return {
    id: String(client._id),
    companyName: client.companyName,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone,
    website: client.website,
    address: client.address,
    industry: client.industry,
    taxInfo: client.taxInfo,
    notes: client.notes,
    requirements: client.requirements,
    importantInfo: client.importantInfo,
    internalNotes: client.internalNotes,
    links: [],
    documents: [],
    sourceLead: client.sourceLead ? String(client.sourceLead) : undefined,
    createdAt: dateToString(client.createdAt),
    updatedAt: dateToString(client.updatedAt)
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
