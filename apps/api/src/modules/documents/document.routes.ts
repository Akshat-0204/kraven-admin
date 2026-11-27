import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createDocumentController,
  downloadDocumentPdfController,
  generateDocumentPdfController,
  getDocumentController,
  getDocumentVariablesController,
  listDocumentsController,
  shareDocumentController,
  updateDocumentController
} from './document.controller.js';

import { getDocumentSignature } from '../packs/pack.service.js';

export const documentRoutes = Router();

documentRoutes.get('/', asyncHandler(listDocumentsController));
documentRoutes.post('/', asyncHandler(createDocumentController));
documentRoutes.get('/:id', asyncHandler(getDocumentController));
documentRoutes.patch('/:id', asyncHandler(updateDocumentController));
documentRoutes.get('/:id/variables', asyncHandler(getDocumentVariablesController));
documentRoutes.post('/:id/pdf', asyncHandler(generateDocumentPdfController));
documentRoutes.get('/:id/pdf', asyncHandler(downloadDocumentPdfController));
documentRoutes.post('/:id/share', asyncHandler(shareDocumentController));
documentRoutes.get(
  '/:id/signature',
  asyncHandler(async (req, res) => {
    res.json({ signature: await getDocumentSignature(req.params.id) });
  })
);
