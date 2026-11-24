import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { pipeStreamToResponse } from '../files/files.controller.js';
import { attachmentContentDisposition } from '../files/storage.service.js';
import { verifyPortalCode } from './portal.access.service.js';
import { getPortalClientId, requirePortalAccess } from './portal.auth.js';
import {
  getPortalDownloadUrl,
  getPortalOverview,
  listPortalDocuments,
  listPortalDownloads,
  listPortalPayments,
  listPortalUpdates,
  openPortalDocumentPdf
} from './portal.content.service.js';
import { clearPortalCookie, setPortalCookie } from './portal.cookie.js';
import { PORTAL_VERIFY_RATE_LIMIT } from './portal.rules.js';

/**
 * Public client portal API, mounted at `/public/portal` before admin `authenticate`.
 * Built per app so the per-IP verify limiter's memory store is not shared between app instances.
 */
export function createPublicPortalRoutes() {
  const router = Router();

  const verifyRateLimiter = rateLimit({
    ...PORTAL_VERIFY_RATE_LIMIT,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Try again later.' }
  });

  router.post(
    '/:slug/verify',
    verifyRateLimiter,
    asyncHandler(async (req, res) => {
      const session = await verifyPortalCode(req.params.slug, req.body);
      setPortalCookie(res, session);
      res.json({ ok: true });
    })
  );

  router.post('/logout', (_req, res) => {
    clearPortalCookie(res);
    res.status(204).end();
  });

  router.use(requirePortalAccess);

  router.get(
    '/me',
    asyncHandler(async (req, res) => {
      res.json(await getPortalOverview(getPortalClientId(req)));
    })
  );
  router.get(
    '/updates',
    asyncHandler(async (req, res) => {
      res.json({ updates: await listPortalUpdates(getPortalClientId(req)) });
    })
  );
  router.get(
    '/documents',
    asyncHandler(async (req, res) => {
      res.json({ documents: await listPortalDocuments(getPortalClientId(req)) });
    })
  );
  router.get(
    '/documents/:id/pdf',
    asyncHandler(async (req, res) => {
      const { filename, stream } = await openPortalDocumentPdf(getPortalClientId(req), req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', attachmentContentDisposition(filename).replace(/^attachment/, 'inline'));
      res.setHeader('Cache-Control', 'private, no-store');
      await pipeStreamToResponse(stream, res, { documentId: req.params.id, portal: true });
    })
  );
  router.get(
    '/payments',
    asyncHandler(async (req, res) => {
      res.json({ payments: await listPortalPayments(getPortalClientId(req)) });
    })
  );
  router.get(
    '/downloads',
    asyncHandler(async (req, res) => {
      res.json({ downloads: await listPortalDownloads(getPortalClientId(req)) });
    })
  );
  router.get(
    '/downloads/:id/url',
    asyncHandler(async (req, res) => {
      res.json(await getPortalDownloadUrl(getPortalClientId(req), req.params.id));
    })
  );

  router.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  return router;
}
