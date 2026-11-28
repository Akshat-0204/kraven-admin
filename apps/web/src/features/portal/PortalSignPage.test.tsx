import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PortalSignPage } from './PortalSignPage';
import { portalApi } from './portalApi';

vi.mock('./portalApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./portalApi')>();
  return { ...actual, portalApi: { sign: vi.fn().mockResolvedValue({ id: 'd1', status: 'Signed', signedAt: '' }) } };
});

describe('PortalSignPage', () => {
  it('requires a name and consent before signing, then submits a typed signature', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/c/acme/sign/d1']}>
          <Routes>
            <Route path="/c/:slug/sign/:documentId" element={<PortalSignPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    const submit = screen.getByRole('button', { name: 'Sign document' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(portalApi.sign).toHaveBeenCalledWith('d1', expect.objectContaining({ signerName: 'Ada Lovelace', method: 'typed', consent: true }));
    expect(await screen.findByText(/signed and sealed/)).toBeInTheDocument();
  });
});
