import { APP_NAME } from '@kraven/config';
import type { HealthResponse } from '@kraven/types';
import { healthResponseSchema } from '@kraven/validation';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { originCheck } from './middleware/originCheck.js';
import { requestLogger } from './middleware/requestLogger.js';
import { adminsRoutes } from './modules/auth/admins.routes.js';
import { googleRoutes } from './modules/google/google.oauth.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { clientEmailRoutes } from './modules/email/email.routes.js';
import { resendWebhookRoutes } from './modules/email/email.webhook.js';
import { clientRoutes } from './modules/clients/client.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { documentTemplateRoutes } from './modules/documents/documentTemplate.routes.js';
import { expenseRoutes } from './modules/finance/expense.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { invoiceRoutes } from './modules/finance/invoice.routes.js';
import { paymentRoutes } from './modules/finance/payment.routes.js';
import { filesRoutes } from './modules/files/files.routes.js';
import { leadRoutes } from './modules/leads/lead.routes.js';
import { packRoutes } from './modules/packs/pack.routes.js';
import { payeeProfileRoutes } from './modules/payees/payeeProfile.routes.js';
import { portalAdminRoutes } from './modules/portal/portal.admin.routes.js';
import { createPublicPortalRoutes } from './modules/portal/portal.public.routes.js';
import { projectUpdateRoutes } from './modules/projectUpdates/projectUpdate.routes.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';

export function createApp() {
  const app = express();

  if (env.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  const allowedOrigins = new Set(env.corsOrigins);

  // The API serves JSON and file downloads to a separate web origin, so allow cross-origin resource loads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
      credentials: true
    })
  );
  // Provider webhook: server-to-server (no cookies), authenticated by its Svix signature and parsed raw,
  // so it is mounted before the origin check and the JSON body parser.
  app.use('/webhooks/resend', resendWebhookRoutes);
  app.use(originCheck(env.corsOrigins));
  // 400kb leaves room for a drawn signature PNG (capped at 200KB decoded) on the sign endpoint.
  app.use(express.json({ limit: '400kb' }));
  // The secret signs the client portal cookie (`kraven_portal`).
  app.use(cookieParser(env.portalCookieSecret));
  app.use(
    session({
      name: 'kraven.sid',
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
        secure: env.nodeEnv === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  );
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    const response: HealthResponse = healthResponseSchema.parse({
      app: APP_NAME,
      status: 'ok'
    });

    res.json(response);
  });

  app.use('/auth', authRoutes);
  // Client portal: public, guarded by its own signed cookie instead of the admin session.
  app.use('/public/portal', createPublicPortalRoutes());
  app.use(authenticate);
  app.use('/google', googleRoutes);
  app.use('/admins', adminsRoutes);
  app.use('/leads', leadRoutes);
  app.use('/clients/:id/portal', portalAdminRoutes);
  app.use('/clients/:id/emails', clientEmailRoutes);
  app.use('/clients', clientRoutes);
  app.use('/projects', projectRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/search', searchRoutes);
  app.use('/invoices', invoiceRoutes);
  app.use('/payments', paymentRoutes);
  app.use('/expenses', expenseRoutes);
  app.use('/finance', financeRoutes);
  app.use('/files', filesRoutes);
  app.use('/document-templates', documentTemplateRoutes);
  app.use('/documents', documentRoutes);
  app.use('/project-updates', projectUpdateRoutes);
  app.use('/packs', packRoutes);
  app.use('/payee-profiles', payeeProfileRoutes);
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });
  app.use(errorHandler);

  return app;
}
