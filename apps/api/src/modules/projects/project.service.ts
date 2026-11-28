import type {
  AttachProjectDocumentInput,
  ProjectFilterInput,
  ProjectInput,
  UpdateProjectInput
} from '@kraven/validation';
import {
  attachProjectDocumentSchema,
  linkSchema,
  projectFilterSchema,
  projectSchema,
  updateProjectSchema
} from '@kraven/validation';
import { getEntityActivity, logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { assertObjectId, escapeRegExp } from '../../shared/utils/objectId.js';
import { ClientModel } from '../clients/client.model.js';
import { ProjectModel } from './project.model.js';

export async function listProjects(filters: ProjectFilterInput) {
  const parsedFilters = projectFilterSchema.parse(filters);
  const query: Record<string, unknown> = {};

  if (parsedFilters.status) {
    query.status = parsedFilters.status;
  }

  if (parsedFilters.client) {
    assertObjectId(parsedFilters.client, 'client');
    query.client = parsedFilters.client;
  }

  if (parsedFilters.assignedTeam) {
    query.assignedTeam = parsedFilters.assignedTeam;
  }

  if (parsedFilters.priority) {
    query.priority = parsedFilters.priority;
  }

  if (parsedFilters.deadlineFrom || parsedFilters.deadlineTo) {
    query.expectedCompletionDate = {
      ...(parsedFilters.deadlineFrom ? { $gte: parsedFilters.deadlineFrom } : {}),
      ...(parsedFilters.deadlineTo ? { $lte: parsedFilters.deadlineTo } : {})
    };
  }

  if (parsedFilters.search) {
    query.$or = [
      { projectName: new RegExp(escapeRegExp(parsedFilters.search), 'i') },
      { description: new RegExp(escapeRegExp(parsedFilters.search), 'i') }
    ];
  }

  return ProjectModel.find(query).populate('client').sort({ expectedCompletionDate: 1, createdAt: -1 });
}

export async function getProjectById(projectId: string) {
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project')).populate('client');

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  return project;
}

export async function getProjectDetail(projectId: string) {
  const project = await getProjectById(projectId);
  const activity = await getEntityActivity('Project', projectId);

  return { project, activity };
}

export async function createProject(input: ProjectInput) {
  const payload = projectSchema.parse(input);
  const client = await ClientModel.findById(payload.client);

  if (!client) {
    throw new HttpError(404, 'Client not found', { client: 'Selected client no longer exists' });
  }

  const project = await ProjectModel.create(payload);

  await logActivity({
    entityType: 'Project',
    entityId: String(project._id),
    action: 'created',
    description: `Project created - ${project.projectName}`
  });

  await logActivity({
    entityType: 'Client',
    entityId: String(client._id),
    action: 'project-created',
    description: `Project created - ${project.projectName}`
  });

  return getProjectById(String(project._id));
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  const payload = updateProjectSchema.parse(input);
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project'));

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  const previousStatus = project.status;
  const previousProgress = project.progressPercentage;

  Object.assign(project, payload);
  await project.save();

  if (payload.status && payload.status !== previousStatus) {
    await logActivity({
      entityType: 'Project',
      entityId: String(project._id),
      action: 'status-changed',
      description: `Project moved from ${previousStatus} to ${payload.status}`
    });
  }

  if (
    payload.progressPercentage !== undefined &&
    payload.progressPercentage !== previousProgress
  ) {
    await logActivity({
      entityType: 'Project',
      entityId: String(project._id),
      action: 'progress-updated',
      description: `Project progress changed from ${previousProgress}% to ${payload.progressPercentage}%`
    });
  }

  if (
    (!payload.status || payload.status === previousStatus) &&
    (payload.progressPercentage === undefined || payload.progressPercentage === previousProgress)
  ) {
    await logActivity({
      entityType: 'Project',
      entityId: String(project._id),
      action: 'updated',
      description: `Project updated - ${project.projectName}`
    });
  }

  return getProjectById(projectId);
}

export async function deleteProject(projectId: string) {
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project'));

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  await ProjectModel.deleteOne({ _id: project._id });

  await logActivity({
    entityType: 'Project',
    entityId: String(project._id),
    action: 'deleted',
    description: `Project deleted - ${project.projectName}`
  });
}

export async function addProjectLink(projectId: string, input: unknown) {
  const link = linkSchema.parse(input);
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project'));

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  project.links.push(link);
  await project.save();

  await logActivity({
    entityType: 'Project',
    entityId: String(project._id),
    action: 'link-added',
    description: `Link added - ${link.label}`
  });

  return getProjectById(projectId);
}

export async function removeProjectLink(projectId: string, linkIndex: number) {
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project'));

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  if (!Number.isInteger(linkIndex) || linkIndex < 0 || linkIndex >= project.links.length) {
    throw new HttpError(404, 'Link not found');
  }

  const [removed] = project.links.splice(linkIndex, 1);
  await project.save();

  await logActivity({
    entityType: 'Project',
    entityId: String(project._id),
    action: 'link-removed',
    description: `Link removed - ${(removed as { label?: string }).label ?? 'Project link'}`
  });

  return getProjectById(projectId);
}

export async function attachProjectDocument(projectId: string, input: AttachProjectDocumentInput) {
  const document = attachProjectDocumentSchema.parse(input);
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project'));

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  project.documents.push(document);
  await project.save();

  await logActivity({
    entityType: 'Project',
    entityId: String(project._id),
    action: 'document-attached',
    description: `Document attached - ${document.filename}`
  });

  return getProjectById(projectId);
}

export async function removeProjectDocument(projectId: string, fileId: string) {
  assertObjectId(fileId, 'document');
  const project = await ProjectModel.findById(assertObjectId(projectId, 'project'));

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  const nextDocuments = project.documents.filter(
    (document) => String((document as { fileId: unknown }).fileId) !== fileId
  );

  if (nextDocuments.length === project.documents.length) {
    throw new HttpError(404, 'Document not found');
  }

  project.documents = nextDocuments;
  await project.save();

  await logActivity({
    entityType: 'Project',
    entityId: String(project._id),
    action: 'document-removed',
    description: 'Document removed'
  });

  return getProjectById(projectId);
}
