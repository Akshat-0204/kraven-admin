import type { Request, Response } from 'express';
import {
  addProjectLink,
  attachProjectDocument,
  createProject,
  deleteProject,
  getProjectDetail,
  listProjects,
  removeProjectDocument,
  removeProjectLink,
  updateProject
} from './project.service.js';
import { serializeActivity, serializeProject, serializeProjectClient } from './project.serializer.js';

export async function listProjectsController(req: Request, res: Response) {
  const projects = await listProjects(req.query as Record<string, string | undefined>);

  res.json({ projects: projects.map(serializeProject) });
}

export async function getProjectController(req: Request, res: Response) {
  const { project, activity } = await getProjectDetail(req.params.id);
  const populatedClient = project.client as unknown as Parameters<typeof serializeProjectClient>[0];

  res.json({
    project: serializeProject(project),
    client: serializeProjectClient(populatedClient),
    activity: activity.map(serializeActivity)
  });
}

export async function createProjectController(req: Request, res: Response) {
  const project = await createProject(req.body);
  const populatedClient = project.client as unknown as Parameters<typeof serializeProjectClient>[0];

  res.status(201).json({
    project: serializeProject(project),
    client: serializeProjectClient(populatedClient)
  });
}

export async function updateProjectController(req: Request, res: Response) {
  const project = await updateProject(req.params.id, req.body);
  const populatedClient = project.client as unknown as Parameters<typeof serializeProjectClient>[0];

  res.json({
    project: serializeProject(project),
    client: serializeProjectClient(populatedClient)
  });
}

export async function deleteProjectController(req: Request, res: Response) {
  await deleteProject(req.params.id);

  res.status(204).send();
}

export async function addProjectLinkController(req: Request, res: Response) {
  const project = await addProjectLink(req.params.id, req.body);

  res.status(201).json({ project: serializeProject(project) });
}

export async function removeProjectLinkController(req: Request, res: Response) {
  const project = await removeProjectLink(req.params.id, Number(req.params.linkIndex));

  res.json({ project: serializeProject(project) });
}

export async function attachProjectDocumentController(req: Request, res: Response) {
  const project = await attachProjectDocument(req.params.id, req.body);

  res.status(201).json({ project: serializeProject(project) });
}

export async function removeProjectDocumentController(req: Request, res: Response) {
  const project = await removeProjectDocument(req.params.id, req.params.fileId);

  res.json({ project: serializeProject(project) });
}
