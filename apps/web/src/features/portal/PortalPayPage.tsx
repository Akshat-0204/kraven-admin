import type { PortalPaymentRecord } from '@kraven/types';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, QrCode, Smartphone, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { PortalRequestError, portalApi, portalQueryKeys } from './portalApi';
import { PortalShell, formatDate, formatInr, isPayable } from './PortalPage';
import { UPI_APP_SCHEMES, buildUpiUri } from './upi';

const APPS = [
  { id: 'gpay', label: 'Google Pay', scheme: UPI_APP_SCHEMES.gpay },
  { id: 'phonepe', label: 'PhonePe', scheme: UPI_APP_SCHEMES.phonepe },
  { id: 'paytm', label: 'Paytm', scheme: UPI_APP_SCHEMES.paytm },
  { id: 'other', label: 'Other UPI app', scheme: UPI_APP_SCHEMES.any }
] as const;

/** Port of the devhouse PayPage: UPI deep links per app plus a scannable QR for the remaining amount. */
export function PortalPayPage() {
  const { slug = '', invoiceId = '', packId = '', itemId = '' } = useParams();
  const isPackItem = Boolean(packId);
  const [showQr, setShowQr] = useState(false);
  const invoices = useQuery({ queryKey: portalQueryKeys.section('payments'), queryFn: portalApi.payments, retry: false, enabled: !isPackItem });
  const packItem = useQuery({
    queryKey: portalQueryKeys.section(`pack-payment-${packId}-${itemId}`),
    queryFn: () => portalApi.packPayment(packId, itemId),
    retry: false,
    enabled: isPackItem
  });
  const payments = isPackItem ? packItem : invoices;
  const backTo = `/c/${encodeURIComponent(slug)}`;

  if (payments.error instanceof PortalRequestError && payments.error.status === 401) return <Navigate to={backTo} replace />;

  const item = packItem.data?.item;
  const payment: PortalPaymentRecord | undefined = isPackItem
    ? item && item.paymentStatus !== 'Paid'
      ? {
          id: item.id,
          invoiceNumber: item.reference || item.title,
          amount: item.amount ?? 0,
          amountPaid: 0,
          remainingAmount: item.amount ?? 0,
          invoiceDate: '',
          dueDate: '',
          paymentStatus: 'Pending',
          payee: item.payee ?? null
        }
      : undefined
    : invoices.data?.payments.find((entry) => entry.id === invoiceId);

  if (payments.isLoading) {
    return (
      <PortalShell>
        <p className="font-body text-sm text-ink-500">Loading…</p>
      </PortalShell>
    );
  }

  if (!payment || !payment.payee || !isPayable(payment)) {
    return (
      <PortalShell>
        <BackLink to={backTo} />
        <Card className="mt-6 font-body text-sm text-ink-500">
          {payment && payment.remainingAmount <= 0 ? 'This invoice is already paid.' : 'This invoice cannot be paid online.'}
        </Card>
      </PortalShell>
    );
  }

  const request = {
    vpa: payment.payee.vpa,
    name: payment.payee.name,
    amount: payment.remainingAmount,
    note: isPackItem ? payment.invoiceNumber : `Invoice ${payment.invoiceNumber}`
  };
  const upiUri = buildUpiUri(request);

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(request.vpa);
      toast.success('UPI ID copied');
    } catch {
      toast.error('Could not copy the UPI ID');
    }
  }

  return (
    <PortalShell>
      <BackLink to={backTo} />
      <div className="mx-auto mt-6 max-w-md space-y-6">
        <Card className="text-center">
          <p className="font-body text-xs uppercase tracking-widest text-ink-500">{isPackItem ? payment.invoiceNumber : `Invoice ${payment.invoiceNumber}`}</p>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">{formatInr(payment.remainingAmount)}</p>
          <p className="mt-2 font-body text-sm text-ink-500">
            Pay to {request.name}{payment.dueDate ? ` · Due ${formatDate(payment.dueDate)}` : ''}
          </p>
          <button
            type="button"
            onClick={copyVpa}
            className="mt-4 inline-flex items-center gap-2 rounded-pill border border-white/60 bg-surface-soft px-3 py-1.5 font-mono text-sm text-ink-900 shadow-clay-inset transition-all hover:shadow-clay-sm"
          >
            {request.vpa}
            <Copy className="h-4 w-4" aria-label="Copy UPI ID" />
          </button>
        </Card>

        <Button asChild className="h-11 w-full">
          <a href={upiUri}>
            <Smartphone className="mr-2 h-4 w-4" aria-hidden />
            Pay with any UPI app
          </a>
        </Button>

        <div className="grid grid-cols-2 gap-3">
          {APPS.map((app) => (
            <a
              key={app.id}
              href={buildUpiUri(request, app.scheme)}
              className="rounded-lg border border-white/60 bg-surface px-3 py-4 text-center font-body text-sm text-ink-900 shadow-clay-sm transition-all hover:-translate-y-0.5 hover:shadow-clay-hover"
            >
              {app.label}
            </a>
          ))}
        </div>

        <Button className="w-full" onClick={() => setShowQr(true)}>
          <QrCode className="mr-2 h-4 w-4" aria-hidden />
          Show QR code
        </Button>
        <p className="text-center font-body text-xs text-ink-500">
          After paying, the invoice is marked paid once the payment is confirmed. Deep links work on phones with a UPI app.
        </p>
      </div>

      {showQr ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="UPI QR code"
          className="fixed inset-0 z-50 flex items-center justify-center bg-canvas-deep/80 p-4"
          onClick={() => setShowQr(false)}
        >
          <div className="relative rounded-xl bg-surface p-6 text-center text-ink-900 shadow-clay-floating" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-2 top-2 p-1 text-ink-500 hover:text-ink-900" onClick={() => setShowQr(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <QRCodeSVG value={upiUri} size={208} level="M" />
            <p className="mt-3 text-sm font-medium">Scan with any UPI app</p>
            <p className="text-xs text-ink-500">{formatInr(payment.remainingAmount)}</p>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function BackLink({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-body text-sm text-ink-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to portal
    </Link>
  );
}
