import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { ClientDetailPage } from '../features/clients/ClientDetailPage';
import { ClientListPage } from '../features/clients/ClientListPage';
import { ExpensesPage } from '../features/finance/ExpensesPage';
import { FinanceOverviewPage } from '../features/finance/FinanceOverviewPage';
import { InvoicesPaymentsPage } from '../features/finance/InvoicesPaymentsPage';
import { TemplateListPage } from '../features/documents/TemplateListPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LeadDetailPage } from '../features/leads/LeadDetailPage';
import { LeadListPage } from '../features/leads/LeadListPage';
import { PortalPage } from '../features/portal/PortalPage';
import { PortalSignPage } from '../features/portal/PortalSignPage';
import { PortalPayPage } from '../features/portal/PortalPayPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from '../layouts/AppShell';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  // Client portal: public, outside the admin session and layout.
  {
    path: '/c/:slug',
    element: <PortalPage />
  },
  {
    path: '/c/:slug/pay/:invoiceId',
    element: <PortalPayPage />
  },
  {
    path: '/c/:slug/pay-item/:packId/:itemId',
    element: <PortalPayPage />
  },
  {
    path: '/c/:slug/sign/:documentId',
    element: <PortalSignPage />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <DashboardPage />
          },
          {
            path: 'leads',
            element: <LeadListPage />
          },
          {
            path: 'leads/:id',
            element: <LeadDetailPage />
          },
          {
            path: 'projects',
            element: <ProjectListPage />
          },
          {
            path: 'projects/:id',
            element: <ProjectDetailPage />
          },
          {
            path: 'clients',
            element: <ClientListPage />
          },
          {
            path: 'clients/:id',
            element: <ClientDetailPage />
          },
          {
            path: 'templates',
            element: <TemplateListPage />
          },
          {
            path: 'templates/:id',
            // Lazy so the Tiptap editor bundle loads only on this page.
            lazy: async () => ({
              Component: (await import('../features/documents/TemplateEditorPage')).TemplateEditorPage
            })
          },
          {
            path: 'finance',
            element: <FinanceOverviewPage />
          },
          {
            path: 'finance/invoices',
            element: <InvoicesPaymentsPage />
          },
          {
            path: 'finance/expenses',
            element: <ExpensesPage />
          },
          {
            path: 'settings',
            element: <SettingsPage />
          }
        ]
      }
    ]
  }
]);
