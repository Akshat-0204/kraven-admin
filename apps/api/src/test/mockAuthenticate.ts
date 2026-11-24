import type { RequestHandler } from 'express';

export const TEST_USER_ID = '64b7f0c2a1b2c3d4e5f60718';

/** Stand-in for the session `authenticate` middleware in route tests: treats every request as logged in. */
export const authenticateAsTestUser: RequestHandler = (req, _res, next) => {
  req.session.userId = TEST_USER_ID;
  next();
};
