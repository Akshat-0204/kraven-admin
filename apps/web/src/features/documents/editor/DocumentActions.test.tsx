import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentActions } from './DocumentActions';

vi.mock('../../clients/clientApi', () => ({
  clientQueryKeys: { list: (filters: unknown) => ['clients', 'list', filters] },
  listClients: vi.fn().mockResolvedValue({ clients: [] })
}));
vi.mock('../../projects/projectApi', () => ({
  projectQueryKeys: { list: (filters: unknown) => ['projects', 'list', filters] },
  listProjects: vi.fn().mockResolvedValue({ projects: [] })
}));

const api = { flush: vi.fn().mockResolvedValue(undefined), saveNow: vi.fn(), status: 'idle' as const };

function renderActions(clientId: string | null) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DocumentActions
        documentId="doc-1"
        clientId={clientId}
        clientName={clientId ? 'Acme' : undefined}
        projectId={null}
        readOnly={false}
        api={api}
        onAssign={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe('DocumentActions', () => {
  it('disables Send until a client is assigned', () => {
    renderActions(null);
    const send = screen.getByRole('button', { name: /send/i });
    expect(send).toBeDisabled();
    expect(screen.getByTestId('send-wrapper')).toHaveAttribute('title', 'Assign a client before sending');
  });

  it('asks for confirmation (values get locked) before sending', () => {
    renderActions('client-1');
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByRole('dialog', { name: 'Send this document?' })).toHaveTextContent(/locked/);
  });
});
