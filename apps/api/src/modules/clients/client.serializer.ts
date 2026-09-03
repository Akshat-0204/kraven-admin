import type { ActivityRecord, ClientRecord, ProjectSummaryRecord } from '@kraven/types';
import type { ActivityDocument } from '../../shared/activity/activity.model.js';
import type { ProjectDocument } from '../projects/project.model.js';
import type { ClientDocument } from './client.model.js';

function dateToString(value?: Date) {
  return value ? value.toISOString() : undefined;
}

export function serializeClient(client: ClientDocument & { _id: unknown }): ClientRecord {
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
    links: (client.links as { label: string; url: string }[]).map((link) => ({
      label: link.label,
      url: link.url
    })),
    documents: (client.documents as { fileId: unknown; filename: string; contentType?: string; uploadedAt?: Date }[]).map(
      (document) => ({
        fileId: String(document.fileId),
        filename: document.filename,
        contentType: document.contentType,
        uploadedAt: dateToString(document.uploadedAt) ?? ''
      })
    ),
    sourceLead: client.sourceLead ? String(client.sourceLead) : undefined,
    createdAt: dateToString(client.createdAt),
    updatedAt: dateToString(client.updatedAt)
  };
}

export function serializeProjectSummary(project: ProjectDocument & { _id: unknown }): ProjectSummaryRecord {
  return {
    id: String(project._id),
    projectName: project.projectName,
    status: project.status,
    progressPercentage: project.progressPercentage,
    projectValue: project.projectValue,
    expectedCompletionDate: dateToString(project.expectedCompletionDate)
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
