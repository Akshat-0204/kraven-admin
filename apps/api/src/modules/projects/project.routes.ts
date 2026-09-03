import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  addProjectLinkController,
  attachProjectDocumentController,
  createProjectController,
  deleteProjectController,
  getProjectController,
  listProjectsController,
  removeProjectDocumentController,
  removeProjectLinkController,
  updateProjectController
} from './project.controller.js';

export const projectRoutes = Router();

projectRoutes.get('/', asyncHandler(listProjectsController));
projectRoutes.post('/', asyncHandler(createProjectController));
projectRoutes.get('/:id', asyncHandler(getProjectController));
projectRoutes.patch('/:id', asyncHandler(updateProjectController));
projectRoutes.delete('/:id', asyncHandler(deleteProjectController));
projectRoutes.post('/:id/links', asyncHandler(addProjectLinkController));
projectRoutes.delete('/:id/links/:linkIndex', asyncHandler(removeProjectLinkController));
projectRoutes.post('/:id/documents', asyncHandler(attachProjectDocumentController));
projectRoutes.delete('/:id/documents/:fileId', asyncHandler(removeProjectDocumentController));
