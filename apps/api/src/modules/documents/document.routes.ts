import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  createDocumentController,
  deleteDocumentController,
  downloadDocumentPdfController,
  refillDocumentController,
  reviseDocumentController,
  saveDocumentPdfController,
  setDocumentAccessController,
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
documentRoutes.post('/:id/pdf', asyncHandler(saveDocumentPdfController));
documentRoutes.get('/:id/pdf', asyncHandler(downloadDocumentPdfController));
documentRoutes.put('/:id/access', asyncHandler(setDocumentAccessController));
documentRoutes.post('/:id/refill', asyncHandler(refillDocumentController));
documentRoutes.post('/:id/revise', asyncHandler(reviseDocumentController));
documentRoutes.delete('/:id', asyncHandler(deleteDocumentController));
documentRoutes.post('/:id/share', asyncHandler(shareDocumentController));
documentRoutes.get(
  '/:id/signature',
  asyncHandler(async (req, res) => {
    res.json({ signature: await getDocumentSignature(req.params.id) });
  })
);
