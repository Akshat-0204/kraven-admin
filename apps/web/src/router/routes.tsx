import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { ClientDetailPage } from '../features/clients/ClientDetailPage';
import { ClientListPage } from '../features/clients/ClientListPage';
import { ExpensesPage } from '../features/finance/ExpensesPage';
import { FinanceOverviewPage } from '../features/finance/FinanceOverviewPage';
import { InvoicesPaymentsPage } from '../features/finance/InvoicesPaymentsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LeadDetailPage } from '../features/leads/LeadDetailPage';
import { LeadListPage } from '../features/leads/LeadListPage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { AppShell } from '../layouts/AppShell';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
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
