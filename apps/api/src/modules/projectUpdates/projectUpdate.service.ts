import type { ProjectUpdateRecord } from '@kraven/types';
import { projectUpdateSchema, updateProjectUpdateSchema } from '@kraven/validation';
import { isValidObjectId } from 'mongoose';
import { logActivity } from '../../shared/activity/activity.service.js';
import { HttpError } from '../../shared/errors/httpError.js';
import { ProjectModel } from '../projects/project.model.js';
import { ProjectUpdateModel, type ProjectUpdateDocument } from './projectUpdate.model.js';

export function serializeProjectUpdate(update: ProjectUpdateDocument & { _id: unknown }): ProjectUpdateRecord {
  return {
    id: String(update._id),
    project: String(update.project),
    title: update.title,
    body: update.body ?? '',
    clientVisible: update.clientVisible ?? false,
    attachments: (update.attachments ?? []).map(String),
    postedAt: update.postedAt.toISOString(),
    createdAt: update.createdAt.toISOString(),
    updatedAt: update.updatedAt.toISOString()
  };
}

export async function listProjectUpdates(projectId: unknown) {
  if (typeof projectId !== 'string' || !isValidObjectId(projectId)) {
    throw new HttpError(400, 'A valid project id is required to list updates', { project: 'Choose a project' });
  }
  return ProjectUpdateModel.find({ project: projectId }).sort({ postedAt: -1 }).limit(200).lean();
}

async function getProjectUpdate(id: string) {
  if (!isValidObjectId(id)) throw new HttpError(404, 'Update not found');
  const update = await ProjectUpdateModel.findById(id);
  if (!update) throw new HttpError(404, 'Update not found');
  return update;
}

export async function createProjectUpdate(body: unknown, userId?: string) {
  const input = projectUpdateSchema.parse(body);
  const project = await ProjectModel.findById(input.project).select('_id').lean();
  if (!project) throw new HttpError(404, 'Project not found');

  const update = await ProjectUpdateModel.create({ ...input, postedAt: input.postedAt ?? new Date(), createdBy: userId });
  await logActivity({
    entityType: 'Project',
    entityId: input.project,
    action: 'update-posted',
    description: `Update posted${update.clientVisible ? ' (client visible)' : ''} - ${update.title}`
  });
  return update;
}

export async function updateProjectUpdate(id: string, body: unknown) {
  const input = updateProjectUpdateSchema.parse(body);
  const update = await getProjectUpdate(id);
  Object.assign(update, input);
  await update.save();
  return update;
}

export async function deleteProjectUpdate(id: string) {
  const update = await getProjectUpdate(id);
  await update.deleteOne();
}
