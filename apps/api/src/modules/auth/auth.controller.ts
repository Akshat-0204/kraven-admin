import { changePasswordSchema, loginSchema } from '@kraven/validation';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../shared/errors/httpError.js';
import { logger } from '../../shared/logger/logger.js';
import { changeUserPassword, getSessionUser, verifyLogin } from './auth.service.js';

export async function login(req: Request, res: Response) {
  const credentials = loginSchema.parse(req.body);
  const user = await verifyLogin(credentials.email, credentials.password);

  req.session.userId = user.id;

  res.json({ user });
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  req.session.destroy((error) => {
    if (error) {
      logger.error({ err: error }, 'session destroy failed');
      next(new HttpError(500, 'Could not log out. Please try again.'));
      return;
    }

    res.clearCookie('kraven.sid');
    res.status(204).send();
  });
}

export async function me(req: Request, res: Response) {
  const user = await getSessionUser(req.session.userId!);

  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await changeUserPassword(req.session.userId!, currentPassword, newPassword);

  res.json({ message: 'Password updated successfully' });
}
