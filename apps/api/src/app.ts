import { APP_NAME } from '@kraven/config';
import type { HealthResponse } from '@kraven/types';
import { healthResponseSchema } from '@kraven/validation';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import { env } from './config/env.js';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { clientRoutes } from './modules/clients/client.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { expenseRoutes } from './modules/finance/expense.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { invoiceRoutes } from './modules/finance/invoice.routes.js';
import { paymentRoutes } from './modules/finance/payment.routes.js';
import { filesRoutes } from './modules/files/files.routes.js';
import { leadRoutes } from './modules/leads/lead.routes.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      name: 'kraven.sid',
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
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
  app.use(authenticate);
  app.use('/leads', leadRoutes);
  app.use('/clients', clientRoutes);
  app.use('/projects', projectRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/search', searchRoutes);
  app.use('/invoices', invoiceRoutes);
  app.use('/payments', paymentRoutes);
  app.use('/expenses', expenseRoutes);
  app.use('/finance', financeRoutes);
  app.use('/files', filesRoutes);
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });
  app.use(errorHandler);

  return app;
}
