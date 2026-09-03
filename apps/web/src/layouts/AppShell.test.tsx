import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { PlaceholderPage } from '../pages/PlaceholderPage';

vi.mock('../features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'admin@kraven.local' },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn()
  })
}));

describe('AppShell', () => {
  it('renders the required navigation items', () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <PlaceholderPage title="Dashboard" description="Placeholder" />
          }
        ]
      }
    ]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    const view = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    expect(view.getAllByText('Kraven').length).toBeGreaterThan(0);
    expect(view.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Leads' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Clients' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Finance' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Invoices / Payments' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Expenses' })).toBeInTheDocument();
    expect(view.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });
});
