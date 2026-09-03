import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { downloadFile, uploadFile } from './files.controller.js';

const upload = multer({ storage: multer.memoryStorage() });

export const filesRoutes = Router();

filesRoutes.post('/', upload.single('file'), asyncHandler(uploadFile));
filesRoutes.get('/:id', asyncHandler(downloadFile));
