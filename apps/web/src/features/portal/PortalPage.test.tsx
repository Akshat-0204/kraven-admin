import type { PortalPaymentRecord } from '@kraven/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalPage } from './PortalPage';
import { PortalPayPage } from './PortalPayPage';
import { PortalRequestError, portalApi } from './portalApi';

vi.mock('./portalApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./portalApi')>();
  return {
    ...actual,
    portalApi: {
      verify: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
      updates: vi.fn(),
      documents: vi.fn(),
      payments: vi.fn(),
      downloads: vi.fn(),
      downloadUrl: vi.fn()
    }
  };
});

const me = {
  slug: 'acme',
  client: { companyName: 'Acme Studio', contactPerson: 'Ana' },
  projects: [{ id: 'p1', projectName: 'Website', status: 'In Progress' as const, progressPercentage: 40 }]
};

const payment: PortalPaymentRecord = {
  id: 'inv1',
  invoiceNumber: 'INV-7',
  amount: 1000,
  amountPaid: 400,
  remainingAmount: 600,
  invoiceDate: '2026-01-01T00:00:00.000Z',
  dueDate: '2026-02-01T00:00:00.000Z',
  paymentStatus: 'Partially Paid',
  payee: { name: 'Sanchit Jain', vpa: 'sanxhit@slc' }
};

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/c/:slug" element={<PortalPage />} />
          <Route path="/c/:slug/pay/:invoiceId" element={<PortalPayPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PortalPage', () => {
  beforeEach(() => {
    vi.mocked(portalApi.me).mockReset();
    vi.mocked(portalApi.verify).mockReset();
    vi.mocked(portalApi.payments).mockResolvedValue({ payments: [payment] });
  });

  it('asks for the code without a session and shows generic and lockout errors', async () => {
    const user = userEvent.setup();
    vi.mocked(portalApi.me).mockRejectedValue(new PortalRequestError('Unauthorized', 401));
    vi.mocked(portalApi.verify)
      .mockRejectedValueOnce(new PortalRequestError('Invalid link or code', 401))
      .mockRejectedValueOnce(new PortalRequestError('Too many attempts', 429));

    renderAt('/c/acme');
    const input = await screen.findByLabelText('Access code');

    await user.type(input, 'wrong-code');
    await user.click(screen.getByRole('button', { name: 'Open portal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That link or code is not valid.');
    expect(portalApi.verify).toHaveBeenCalledWith('acme', 'wrong-code');

    await user.click(screen.getByRole('button', { name: 'Open portal' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts'));
  });

  it('opens the portal after a correct code', async () => {
    const user = userEvent.setup();
    vi.mocked(portalApi.me).mockRejectedValueOnce(new PortalRequestError('Unauthorized', 401)).mockResolvedValue(me);
    vi.mocked(portalApi.verify).mockResolvedValue({ ok: true });

    renderAt('/c/acme');
    await user.type(await screen.findByLabelText('Access code'), 'GOODCODE42');
    await user.click(screen.getByRole('button', { name: 'Open portal' }));
    expect(await screen.findByRole('heading', { name: 'Acme Studio' })).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
  });

  it('does not show another client session under a different slug', async () => {
    vi.mocked(portalApi.me).mockResolvedValue(me);
    renderAt('/c/other-client');
    expect(await screen.findByLabelText('Access code')).toBeInTheDocument();
    expect(screen.queryByText('Acme Studio')).not.toBeInTheDocument();
  });

  it('lists invoices with a Pay link', async () => {
    const user = userEvent.setup();
    vi.mocked(portalApi.me).mockResolvedValue(me);
    renderAt('/c/acme');
    await user.click(await screen.findByRole('button', { name: 'Payments' }));
    expect(await screen.findByRole('link', { name: 'Pay' })).toHaveAttribute('href', '/c/acme/pay/inv1');
  });
});

describe('PortalPayPage', () => {
  it('builds UPI links for the remaining amount', async () => {
    vi.mocked(portalApi.payments).mockResolvedValue({ payments: [payment] });
    renderAt('/c/acme/pay/inv1');

    const any = await screen.findByRole('link', { name: 'Pay with any UPI app' });
    expect(any).toHaveAttribute('href', 'upi://pay?pa=sanxhit%40slc&pn=Sanchit%20Jain&am=600.00&tn=Invoice%20INV-7&cu=INR');
    expect(screen.getByRole('link', { name: 'Google Pay' }).getAttribute('href')).toMatch(/^tez:\/\/upi\/pay\?pa=/);
  });

  it('refuses a paid or unknown invoice', async () => {
    vi.mocked(portalApi.payments).mockResolvedValue({ payments: [{ ...payment, remainingAmount: 0, paymentStatus: 'Paid' }] });
    renderAt('/c/acme/pay/inv1');
    expect(await screen.findByText('This invoice is already paid.')).toBeInTheDocument();
  });
});
