import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clientApi from '../clients/clientApi';
import * as api from './documentApi';
import { DocumentsPanel } from './DocumentsPanel';

vi.mock('./documentApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./documentApi')>();
  return {
    ...actual,
    listDocuments: vi.fn(),
    listDocumentTemplates: vi.fn(),
    createDocument: vi.fn(),
    generateDocumentPdf: vi.fn()
  };
});

vi.mock('../clients/clientApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../clients/clientApi')>();
  return { ...actual, listClients: vi.fn() };
});

const template = {
  id: 'tpl-1',
  name: 'Project Proposal',
  type: 'Proposal' as const,
  googleDocUrl: 'https://docs.google.com/document/d/abc/edit',
  googleFileId: 'abc',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const sentDocument = {
  id: 'doc-9',
  title: 'Signed contract',
  client: { _id: 'client-1', companyName: 'Acme' },
  template: { _id: 'tpl-1', name: 'Project Proposal' },
  status: 'Sent' as const,
  hasPdf: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

function EditorProbe() {
  const location = useLocation();
  return (
    <div data-testid="editor">
      {location.pathname} from {(location.state as { from?: string } | null)?.from}
    </div>
  );
}

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/projects/project-1']}>
        <Routes>
          <Route path="/projects/:id" element={<DocumentsPanel scope={{ client: 'client-1', project: 'project-1' }} />} />
          <Route path="/documents/:id" element={<EditorProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DocumentsPanel', () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.mocked(api.listDocuments).mockResolvedValue({ documents: [], total: 0, page: 1, limit: 50 });
    vi.mocked(api.listDocumentTemplates).mockResolvedValue({ templates: [template] });
    vi.mocked(clientApi.listClients).mockResolvedValue({
      clients: [{ id: 'client-1', companyName: 'Acme' }, { id: 'client-2', companyName: 'Globex' }]
    } as never);
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    assign.mockReset();
  });

  it('creates a document from a template pre-filled with the client and project, then opens the editor', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createDocument).mockResolvedValue({ document: { id: 'doc-1' } } as never);

    renderPanel();
    expect(await screen.findByText('No documents yet')).toBeInTheDocument();
    expect(screen.queryByTitle('Document preview')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New document' }));
    const dialog = await screen.findByRole('dialog', { name: 'New document' });
    await waitFor(() => expect(within(dialog).getByRole('combobox', { name: 'Client' })).toHaveValue('client-1'));
    expect(within(dialog).getByRole('button', { name: 'Use Blank document' })).toBeInTheDocument();
    const card = await within(dialog).findByRole('button', { name: 'Use Project Proposal' });

    await user.click(card);

    await waitFor(() =>
      expect(api.createDocument).toHaveBeenCalledWith({ template: 'tpl-1', client: 'client-1', project: 'project-1' })
    );
    expect(await screen.findByTestId('editor')).toHaveTextContent('/documents/doc-1 from /projects/project-1');
  });

  it('creates a blank document and drops the project when another client is picked', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createDocument).mockResolvedValue({ document: { id: 'doc-2' } } as never);

    renderPanel();
    await user.click(await screen.findByRole('button', { name: 'New document' }));
    const dialog = await screen.findByRole('dialog', { name: 'New document' });
    const clientSelect = within(dialog).getByRole('combobox', { name: 'Client' });
    await within(clientSelect).findByRole('option', { name: 'Globex' });
    await user.selectOptions(clientSelect, 'client-2');
    await user.click(within(dialog).getByRole('button', { name: 'Use Blank document' }));

    await waitFor(() => expect(api.createDocument).toHaveBeenCalledWith({ client: 'client-2' }));
  });

  it('lists documents with status, an editor link and a PDF download that renders first', async () => {
    const user = userEvent.setup();
    vi.mocked(api.listDocuments).mockResolvedValue({ documents: [sentDocument], total: 1, page: 1, limit: 50 });
    vi.mocked(api.generateDocumentPdf).mockResolvedValue({ url: 'https://s3/x', expiresIn: 60, generated: true });

    renderPanel();
    expect(await screen.findByText('Signed contract')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Signed contract' })).toHaveAttribute('href', '/documents/doc-9');

    await user.click(screen.getByRole('button', { name: 'Download Signed contract' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/documents\/doc-9\/pdf$/)));
    expect(vi.mocked(api.generateDocumentPdf).mock.calls[0][0]).toBe('doc-9');
    expect(api.listDocuments).toHaveBeenCalledWith({ client: 'client-1', project: 'project-1' });
  });
});
