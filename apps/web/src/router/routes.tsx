import { WORKSPACE_DASHBOARD_PATHS } from '@kraven/config';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { ClientDetailPage } from '../features/clients/ClientDetailPage';
import { ClientListPage } from '../features/clients/ClientListPage';
import { ExpensesPage } from '../features/finance/ExpensesPage';
import { FinanceOverviewPage } from '../features/finance/FinanceOverviewPage';
import { InvoicesPaymentsPage } from '../features/finance/InvoicesPaymentsPage';
import { DocumentsPage } from '../features/documents/DocumentsPage';
import { CrmDashboardPage } from '../features/dashboard/CrmDashboardPage';
import { LeadsDashboardPage } from '../features/dashboard/LeadsDashboardPage';
import { LeadDetailPage } from '../features/leads/LeadDetailPage';
import { LeadListPage } from '../features/leads/LeadListPage';
import { PortalPage } from '../features/portal/PortalPage';
import { PortalSignPage } from '../features/portal/PortalSignPage';
import { PortalPayPage } from '../features/portal/PortalPayPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from '../layouts/AppShell';
import { readStoredWorkspace } from '../layouts/workspace';

/** `/` and `/dashboard` land on the last-used workspace's dashboard (Leads by default). */
function WorkspaceRedirect() {
  return <Navigate to={WORKSPACE_DASHBOARD_PATHS[readStoredWorkspace()]} replace />;
}

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
            element: <WorkspaceRedirect />
          },
          {
            path: 'dashboard',
            element: <WorkspaceRedirect />
          },
          {
            path: 'dashboard/leads',
            element: <LeadsDashboardPage />
          },
          {
            path: 'dashboard/crm',
            element: <CrmDashboardPage />
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
            path: 'documents',
            element: <DocumentsPage />
          },
          {
            path: 'templates',
            element: <Navigate to="/documents?tab=templates" replace />
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
