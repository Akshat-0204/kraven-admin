import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { UserModel } from './user.model.js';

export const adminsRoutes = Router();

/** Admin users for the document access picker. Users have no name field, so the name is the email local part. */
adminsRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find().select('email').sort({ email: 1 });
    res.json({
      admins: users.map((user) => ({ id: String(user._id), name: user.email.split('@')[0], email: user.email }))
    });
  })
);
