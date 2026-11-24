import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createDocumentController,
  downloadDocumentPdfController,
  generateDocumentPdfController,
  getDocumentController,
  listDocumentsController
} from './document.controller.js';

export const documentRoutes = Router();

documentRoutes.get('/', asyncHandler(listDocumentsController));
documentRoutes.post('/', asyncHandler(createDocumentController));
documentRoutes.get('/:id', asyncHandler(getDocumentController));
documentRoutes.post('/:id/pdf', asyncHandler(generateDocumentPdfController));
documentRoutes.get('/:id/pdf', asyncHandler(downloadDocumentPdfController));
