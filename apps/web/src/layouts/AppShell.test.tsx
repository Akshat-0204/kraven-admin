import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { workspaceForPath } from './workspace';
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

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderShell(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<PlaceholderPage title="Page" description="Placeholder" />} />
          </Route>
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const primary = () => within(view.getByRole('navigation', { name: 'Primary navigation' }));
  return { view, primary };
}

describe('AppShell', () => {
  beforeEach(() => localStorage.clear());

  it('shows only Leads workspace items on a leads URL', () => {
    const { view, primary } = renderShell('/leads/abc');

    expect(view.getAllByText('Kraven').length).toBeGreaterThan(0);
    expect(primary().getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard/leads');
    expect(primary().getByRole('link', { name: 'Leads' })).toHaveClass('bg-white');
    expect(primary().queryByRole('link', { name: 'Clients' })).not.toBeInTheDocument();
    expect(view.getByRole('navigation', { name: 'Shared navigation' })).toHaveTextContent('Settings');
    expect(view.getAllByRole('button', { name: 'Leads' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('kraven_workspace')).toBe('leads');
  });

  it('shows CRM workspace items on a CRM URL', () => {
    const { view, primary } = renderShell('/clients/abc');

    expect(primary().getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard/crm');
    expect(primary().getByRole('link', { name: 'Clients' })).toBeInTheDocument();
    expect(primary().getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(primary().getByRole('link', { name: 'Documents' })).toHaveAttribute('href', '/documents');
    expect(primary().queryByRole('link', { name: 'Templates' })).not.toBeInTheDocument();
    expect(primary().getByRole('link', { name: 'Finance' })).toBeInTheDocument();
    expect(primary().getByRole('link', { name: 'Invoices / Payments' })).toBeInTheDocument();
    expect(primary().getByRole('link', { name: 'Expenses' })).toBeInTheDocument();
    expect(primary().queryByRole('link', { name: 'Leads' })).not.toBeInTheDocument();
    expect(view.getAllByRole('button', { name: 'CRM' })[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the last-used workspace on shared pages and switches via the toggle', () => {
    localStorage.setItem('kraven_workspace', 'crm');
    const { view, primary } = renderShell('/settings');

    expect(primary().getByRole('link', { name: 'Clients' })).toBeInTheDocument();

    fireEvent.click(view.getAllByRole('button', { name: 'Leads' })[0]);

    expect(view.getByTestId('location')).toHaveTextContent('/dashboard/leads');
    expect(primary().getByRole('link', { name: 'Leads' })).toBeInTheDocument();
    expect(localStorage.getItem('kraven_workspace')).toBe('leads');
  });

  it('treats documents and templates URLs as CRM', () => {
    expect(workspaceForPath('/documents')).toBe('crm');
    expect(workspaceForPath('/documents/abc')).toBe('crm');
    expect(workspaceForPath('/templates')).toBe('crm');
    expect(workspaceForPath('/templates/abc')).toBe('crm');
  });
});
