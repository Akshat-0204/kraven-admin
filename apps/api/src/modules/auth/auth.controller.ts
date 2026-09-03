import { changePasswordSchema, loginSchema } from '@kraven/validation';
import type { Request, Response } from 'express';
import { changeUserPassword, getSessionUser, verifyLogin } from './auth.service.js';

export async function login(req: Request, res: Response) {
  const credentials = loginSchema.parse(req.body);
  const user = await verifyLogin(credentials.email, credentials.password);

  req.session.userId = user.id;

  res.json({ user });
}

export async function logout(req: Request, res: Response) {
  req.session.destroy(() => {
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
