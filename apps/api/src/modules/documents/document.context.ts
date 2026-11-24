import { isValidObjectId } from 'mongoose';
import { HttpError } from '../../shared/errors/httpError.js';
import { ClientModel } from '../clients/client.model.js';
import { ProjectModel } from '../projects/project.model.js';
import type { MergeSource } from './document.variables.js';

/** Loads the client (and optional project, which must belong to that client) a document is merged with. */
export async function loadMergeSource(clientId: string, projectId?: string) {
  const client = isValidObjectId(clientId) ? await ClientModel.findById(clientId) : null;
  if (!client) {
    throw new HttpError(404, 'Client not found');
  }

  const project = projectId && isValidObjectId(projectId) ? await ProjectModel.findById(projectId) : null;
  if (projectId) {
    if (!project) {
      throw new HttpError(404, 'Project not found');
    }
    if (String(project.client) !== String(client._id)) {
      throw new HttpError(400, 'Project does not belong to this client');
    }
  }

  return { client, project } satisfies MergeSource;
}
