import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createDocumentTemplateController,
  getDocumentTemplateController,
  listDocumentTemplatesController,
  listDocumentVariablesController,
  previewDocumentTemplateController,
  updateDocumentTemplateController
} from './documentTemplate.controller.js';

export const documentTemplateRoutes = Router();

documentTemplateRoutes.get('/variables', asyncHandler(listDocumentVariablesController));
documentTemplateRoutes.get('/', asyncHandler(listDocumentTemplatesController));
documentTemplateRoutes.post('/', asyncHandler(createDocumentTemplateController));
documentTemplateRoutes.get('/:id', asyncHandler(getDocumentTemplateController));
documentTemplateRoutes.patch('/:id', asyncHandler(updateDocumentTemplateController));
documentTemplateRoutes.post('/:id/preview', asyncHandler(previewDocumentTemplateController));
