import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './documentApi';
import { DocumentsPanel } from './DocumentsPanel';

vi.mock('./documentApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./documentApi')>();
  return {
    ...actual,
    listDocuments: vi.fn(),
    listDocumentTemplates: vi.fn(),
    previewDocumentTemplate: vi.fn(),
    createDocument: vi.fn(),
    generateDocumentPdf: vi.fn()
  };
});

const template = {
  id: 'tpl-1',
  name: 'Project Proposal',
  type: 'Proposal' as const,
  html: '<p>{{client.company}}</p>',
  variables: ['client.company'],
  version: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentsPanel scope={{ client: 'client-1', project: 'project-1' }} />
    </QueryClientProvider>
  );
}

describe('DocumentsPanel', () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.mocked(api.listDocuments).mockResolvedValue({ documents: [] });
    vi.mocked(api.listDocumentTemplates).mockResolvedValue({ templates: [template] });
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    assign.mockReset();
  });

  it('previews a template, then creates the document, generates the PDF and downloads it', async () => {
    const user = userEvent.setup();
    vi.mocked(api.previewDocumentTemplate).mockResolvedValue({ html: '<p>Acme</p>' });
    vi.mocked(api.createDocument).mockResolvedValue({ document: { id: 'doc-1' } } as never);
    vi.mocked(api.generateDocumentPdf).mockResolvedValue({ url: 'https://s3/x', expiresIn: 60, generated: true });

    renderPanel();
    expect(await screen.findByText('No generated documents')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New document' }));
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Template' }), 'tpl-1');
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(api.previewDocumentTemplate).toHaveBeenCalledWith('tpl-1', { client: 'client-1', project: 'project-1' });
    const frame = await screen.findByTitle('Document preview');
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame).toHaveAttribute('srcdoc', '<p>Acme</p>');

    await user.click(screen.getByRole('button', { name: 'Create PDF' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/documents\/doc-1\/pdf$/)));
    expect(api.createDocument).toHaveBeenCalledWith({ template: 'tpl-1', client: 'client-1', project: 'project-1' });
    expect(api.generateDocumentPdf).toHaveBeenCalledWith('doc-1');
  });
});
