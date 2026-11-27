import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clientApi from '../clients/clientApi';
import * as api from './documentApi';
import { DocumentsPage } from './DocumentsPage';

vi.mock('./documentApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./documentApi')>();
  return { ...actual, searchDocuments: vi.fn(), listDocumentTemplates: vi.fn() };
});
vi.mock('../clients/clientApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../clients/clientApi')>();
  return { ...actual, listClients: vi.fn() };
});

const base = { hasPdf: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: new Date().toISOString() };

function Probe() {
  const location = useLocation();
  return <div data-testid="probe">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(path = '/documents') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/documents" element={<><DocumentsPage /><Probe /></>} />
          <Route path="/documents/:id" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.mocked(clientApi.listClients).mockResolvedValue({ clients: [{ id: 'client-1', companyName: 'Acme' }] } as never);
    vi.mocked(api.listDocumentTemplates).mockResolvedValue({
      templates: [
        {
          id: 'tpl-1',
          name: 'Master Services Agreement',
          type: 'Agreement',
          googleDocUrl: 'https://docs.google.com/document/d/abc/edit',
          googleFileId: 'abc',
          active: true,
          createdAt: base.createdAt,
          updatedAt: base.updatedAt
        }
      ]
    });
    vi.mocked(api.searchDocuments).mockResolvedValue({
      documents: [
        { ...base, id: 'd1', title: 'Proposal for Acme', status: 'Sent', client: { _id: 'client-1', companyName: 'Acme' }, template: { _id: 'tpl-1', name: 'Proposal' } },
        { ...base, id: 'd2', title: 'Scratch', status: 'Draft', client: null, template: null }
      ],
      total: 45,
      page: 1,
      limit: 20
    });
  });

  it('lists documents, filters by status and paginates', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Proposal for Acme')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Blank')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Draft');
    await waitFor(() => expect(api.searchDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Draft', page: 1 })));

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.searchDocuments).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    await user.click(screen.getByText('Scratch').closest('tr') as HTMLElement);
    expect(screen.getByTestId('probe')).toHaveTextContent('/documents/d2');
  });

  it('shows templates on ?tab=templates and switches tabs via the URL', async () => {
    const user = userEvent.setup();
    renderPage('/documents?tab=templates');

    expect(await screen.findByText('Master Services Agreement')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open in Google Docs/ })).toHaveAttribute('href', 'https://docs.google.com/document/d/abc/edit');
    await user.click(screen.getByRole('button', { name: /New template/ }));
    expect(screen.getByRole('dialog', { name: 'New template' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('tab', { name: 'Documents' }));
    expect(screen.getByTestId('probe')).toHaveTextContent(/^\/documents$/);
    expect(await screen.findByRole('button', { name: 'New document' })).toBeInTheDocument();
  });
});
