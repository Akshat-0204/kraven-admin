import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, QrCode, Smartphone, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
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
  const { slug = '', invoiceId = '' } = useParams();
  const [showQr, setShowQr] = useState(false);
  const payments = useQuery({ queryKey: portalQueryKeys.section('payments'), queryFn: portalApi.payments, retry: false });
  const backTo = `/c/${encodeURIComponent(slug)}`;

  if (payments.error instanceof PortalRequestError && payments.error.status === 401) return <Navigate to={backTo} replace />;

  const payment = payments.data?.payments.find((item) => item.id === invoiceId);

  if (payments.isLoading) {
    return (
      <PortalShell>
        <p className="text-sm text-muted">Loading…</p>
      </PortalShell>
    );
  }

  if (!payment || !payment.payee || !isPayable(payment)) {
    return (
      <PortalShell>
        <BackLink to={backTo} />
        <p className="mt-6 rounded border border-border bg-panel p-4 text-sm text-muted">
          {payment && payment.remainingAmount <= 0 ? 'This invoice is already paid.' : 'This invoice cannot be paid online.'}
        </p>
      </PortalShell>
    );
  }

  const request = {
    vpa: payment.payee.vpa,
    name: payment.payee.name,
    amount: payment.remainingAmount,
    note: `Invoice ${payment.invoiceNumber}`
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
        <div className="rounded border border-border bg-panel p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Invoice {payment.invoiceNumber}</p>
          <p className="mt-3 text-4xl font-semibold">{formatInr(payment.remainingAmount)}</p>
          <p className="mt-2 text-sm text-muted">
            Pay to {request.name} · Due {formatDate(payment.dueDate)}
          </p>
          <button
            type="button"
            onClick={copyVpa}
            className="mt-4 inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 font-mono text-sm hover:bg-white/10"
          >
            {request.vpa}
            <Copy className="h-4 w-4" aria-label="Copy UPI ID" />
          </button>
        </div>

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
              className="rounded border border-border bg-panel px-3 py-4 text-center text-sm hover:bg-white/10"
            >
              {app.label}
            </a>
          ))}
        </div>

        <Button className="w-full bg-transparent text-white hover:bg-white/10" onClick={() => setShowQr(true)}>
          <QrCode className="mr-2 h-4 w-4" aria-hidden />
          Show QR code
        </Button>
        <p className="text-center text-xs text-muted">
          After paying, the invoice is marked paid once the payment is confirmed. Deep links work on phones with a UPI app.
        </p>
      </div>

      {showQr ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="UPI QR code"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowQr(false)}
        >
          <div className="relative rounded bg-white p-6 text-center text-black" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-2 top-2 p-1" onClick={() => setShowQr(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <QRCodeSVG value={upiUri} size={208} level="M" />
            <p className="mt-3 text-sm font-medium">Scan with any UPI app</p>
            <p className="text-xs text-neutral-600">{formatInr(payment.remainingAmount)}</p>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function BackLink({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 text-sm text-muted hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to portal
    </Link>
  );
}
