import { Router } from 'express';
import { HttpError } from '../../shared/errors/httpError.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { pipeStreamToResponse } from '../files/files.controller.js';
import { attachmentContentDisposition } from '../files/storage.service.js';
import { findPortalPaymentItem, fileInLivePack, listPortalPacks } from '../packs/pack.service.js';
import { openSealedPdf, signPortalDocument } from '../packs/sign.service.js';
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
import { getPackFileUrl } from '../packs/packFile.js';

/**
 * Public client portal API, mounted at `/public/portal` before admin `authenticate`.
 */
export function createPublicPortalRoutes() {
  const router = Router();

  router.post(
    '/:slug/verify',
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
    '/packs',
    asyncHandler(async (req, res) => {
      res.json({ packs: await listPortalPacks(getPortalClientId(req)) });
    })
  );
  router.get(
    '/packs/:packId/items/:itemId/payment',
    asyncHandler(async (req, res) => {
      const { pack, item } = await findPortalPaymentItem(getPortalClientId(req), req.params.packId, req.params.itemId);
      const packs = await listPortalPacks(getPortalClientId(req));
      const found = packs.find((entry) => entry.id === String(pack._id))?.items.find((entry) => entry.id === String(item._id));
      res.json({ item: found });
    })
  );
  router.get(
    '/packs/files/:id/url',
    asyncHandler(async (req, res) => {
      const clientId = getPortalClientId(req);
      if (!(await fileInLivePack(clientId, req.params.id))) throw new HttpError(404, 'File not found');
      res.json(await getPackFileUrl(req.params.id));
    })
  );
  router.post(
    '/documents/:id/sign',
    asyncHandler(async (req, res) => {
      const result = await signPortalDocument(getPortalClientId(req), req.params.id, req.body, {
        ip: req.ip ?? '',
        userAgent: String(req.get('user-agent') ?? '').slice(0, 500)
      });
      res.json(result);
    })
  );
  router.get(
    '/documents/:id/signed.pdf',
    asyncHandler(async (req, res) => {
      const { filename, stream } = await openSealedPdf(getPortalClientId(req), req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', attachmentContentDisposition(filename));
      res.setHeader('Cache-Control', 'private, no-store');
      await pipeStreamToResponse(stream, res, { documentId: req.params.id, portal: true });
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
    res.status(404).json({ message: 'Portal endpoint not found' });
  });

  return router;
}
