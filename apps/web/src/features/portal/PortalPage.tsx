import type { PortalPaymentRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, LogOut } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ProgressBar } from '../../components/ui/progressBar';
import { PortalRequestError, portalApi, portalDocumentPdfUrl, portalQueryKeys, portalSignedPdfUrl } from './portalApi';

type PortalTab = 'overview' | 'packs' | 'updates' | 'documents' | 'payments' | 'downloads';

const TABS: { id: PortalTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'packs', label: 'Packs' },
  { id: 'updates', label: 'Updates' },
  { id: 'documents', label: 'Documents' },
  { id: 'payments', label: 'Payments' },
  { id: 'downloads', label: 'Downloads' }
];

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatInr(amount: number) {
  return money.format(amount);
}

export function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function statusOf(error: unknown) {
  return error instanceof PortalRequestError ? error.status : undefined;
}

export function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas font-body text-ink-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">{children}</div>
    </div>
  );
}

function CodeForm({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const verify = useMutation({
    mutationFn: () => portalApi.verify(slug, code.trim()),
    onSuccess: async () => {
      setCode('');
      await queryClient.invalidateQueries({ queryKey: portalQueryKeys.all });
    }
  });
  const locked = statusOf(verify.error) === 429;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (code.trim()) verify.mutate();
  }

  return (
    <PortalShell>
      <form onSubmit={submit} className="clay-card mx-auto mt-16 max-w-sm space-y-4 p-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-900">Client portal</h1>
          <p className="mt-1 text-sm text-ink-500">Enter the access code you were given.</p>
        </div>
        <Input
          aria-label="Access code"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Access code"
          className="font-mono uppercase tracking-widest"
        />
        {verify.error ? (
          <p role="alert" className="text-sm text-danger-fg">
            {locked ? 'Too many attempts. Try again in 15 minutes.' : 'That link or code is not valid.'}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={verify.isPending || !code.trim()}>
          {verify.isPending ? 'Checking…' : 'Open portal'}
        </Button>
      </form>
    </PortalShell>
  );
}

export function PortalPage() {
  const { slug = '' } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PortalTab>('overview');
  const me = useQuery({ queryKey: portalQueryKeys.me, queryFn: portalApi.me, retry: false });

  const logout = useMutation({
    mutationFn: portalApi.logout,
    onSettled: () => queryClient.resetQueries({ queryKey: portalQueryKeys.all })
  });

  if (me.isLoading) {
    return (
      <PortalShell>
        <p className="text-sm text-ink-500">Loading…</p>
      </PortalShell>
    );
  }

  // A cookie for another client's portal must not show its data under this slug.
  if (statusOf(me.error) === 401 || (me.data && me.data.slug !== slug.toLowerCase())) {
    return <CodeForm slug={slug} />;
  }

  if (me.error || !me.data) {
    return (
      <PortalShell>
        <p className="text-sm text-danger-fg">The portal is unavailable right now. Please try again later.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-sand-200 pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-500">Client portal</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900">{me.data.client.companyName}</h1>
          <p className="text-sm text-ink-500">{me.data.client.contactPerson}</p>
        </div>
        <Button className="bg-transparent shadow-none" onClick={() => logout.mutate()}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Log out
        </Button>
      </header>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-sand-200" aria-label="Portal sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              tab === item.id ? 'border-olive-700 font-medium text-ink-900' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {tab === 'overview' ? <OverviewTab projects={me.data.projects} /> : null}
        {tab === 'packs' ? <PacksTab slug={slug} /> : null}
        {tab === 'updates' ? <UpdatesTab /> : null}
        {tab === 'documents' ? <DocumentsTab /> : null}
        {tab === 'payments' ? <PaymentsTab slug={slug} /> : null}
        {tab === 'downloads' ? <DownloadsTab /> : null}
      </section>
    </PortalShell>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="clay-card p-4 text-sm text-ink-500">{children}</p>;
}

function SectionState({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (isLoading) return <p className="text-sm text-ink-500">Loading…</p>;
  if (error) return <p className="text-sm text-danger-fg">Could not load this section.</p>;
  return null;
}

function OverviewTab({ projects }: { projects: { id: string; projectName: string; status: string; progressPercentage: number; expectedCompletionDate?: string }[] }) {
  if (projects.length === 0) return <Empty>No projects yet.</Empty>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <li key={project.id} className="clay-card p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-medium text-ink-900">{project.projectName}</h2>
            <span className="text-xs text-ink-500">{project.status}</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={project.progressPercentage} />
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {project.progressPercentage}% complete · Expected {formatDate(project.expectedCompletionDate)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function UpdatesTab() {
  const query = useQuery({ queryKey: portalQueryKeys.section('updates'), queryFn: portalApi.updates });
  const state = <SectionState isLoading={query.isLoading} error={query.error} />;
  if (!query.data) return state;
  if (query.data.updates.length === 0) return <Empty>No updates yet.</Empty>;

  return (
    <ol className="space-y-3">
      {query.data.updates.map((update) => (
        <li key={update.id} className="clay-card p-4">
          <p className="text-xs text-ink-500">
            {update.project.projectName} · {formatDate(update.postedAt)}
          </p>
          <h2 className="mt-1 font-medium">{update.title}</h2>
          {update.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{update.body}</p> : null}
          {update.attachments.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {update.attachments.map((file) => (
                <li key={file.id}>
                  <DownloadButton id={file.id} filename={file.filename} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function DocumentsTab() {
  const query = useQuery({ queryKey: portalQueryKeys.section('documents'), queryFn: portalApi.documents });
  if (!query.data) return <SectionState isLoading={query.isLoading} error={query.error} />;
  if (query.data.documents.length === 0) return <Empty>No documents shared yet.</Empty>;

  return (
    <ul className="clay-card divide-y divide-sand-200 p-0 overflow-hidden">
      {query.data.documents.map((document) => (
        <li key={document.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{document.title}</p>
            <p className="text-xs text-ink-500">
              {document.status} · {formatDate(document.createdAt)}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <a href={portalDocumentPdfUrl(document.id)} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" aria-hidden />
              View PDF
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function isPayable(payment: PortalPaymentRecord) {
  return payment.remainingAmount > 0 && payment.payee !== null;
}

function PaymentsTab({ slug }: { slug: string }) {
  const query = useQuery({ queryKey: portalQueryKeys.section('payments'), queryFn: portalApi.payments });
  if (!query.data) return <SectionState isLoading={query.isLoading} error={query.error} />;
  if (query.data.payments.length === 0) return <Empty>No invoices yet.</Empty>;

  return (
    <ul className="clay-card divide-y divide-sand-200 p-0 overflow-hidden">
      {query.data.payments.map((payment) => (
        <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium text-ink-900">Invoice {payment.invoiceNumber}</p>
            <p className="text-xs text-ink-500">
              {payment.paymentStatus} · Due {formatDate(payment.dueDate)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p>{formatInr(payment.amount)}</p>
              {payment.remainingAmount > 0 && payment.remainingAmount !== payment.amount ? (
                <p className="text-xs text-ink-500">{formatInr(payment.remainingAmount)} due</p>
              ) : null}
            </div>
            {isPayable(payment) ? (
              <Button asChild>
                <Link to={`/c/${encodeURIComponent(slug)}/pay/${payment.id}`}>Pay</Link>
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function DownloadButton({ id, filename, packFile }: { id: string; filename: string; packFile?: boolean }) {
  const [pending, setPending] = useState(false);

  async function open() {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the presigned URL.
    const tab = window.open('', '_blank');
    setPending(true);
    try {
      const { url } = await (packFile ? portalApi.packFileUrl(id) : portalApi.downloadUrl(id));
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      tab?.close();
      toast.error('Download failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button className="bg-transparent shadow-none" onClick={open} disabled={pending}>
      <Download className="mr-2 h-4 w-4" aria-hidden />
      <span className="max-w-[14rem] truncate">{filename}</span>
    </Button>
  );
}

function DownloadsTab() {
  const query = useQuery({ queryKey: portalQueryKeys.section('downloads'), queryFn: portalApi.downloads });
  if (!query.data) return <SectionState isLoading={query.isLoading} error={query.error} />;
  if (query.data.downloads.length === 0) return <Empty>No files shared yet.</Empty>;

  return (
    <ul className="clay-card divide-y divide-sand-200 p-0 overflow-hidden">
      {query.data.downloads.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm">{file.filename}</p>
            <p className="text-xs text-ink-500">
              {(file.length / 1024).toFixed(1)} KB · {formatDate(file.createdAt)}
            </p>
          </div>
          <DownloadButton id={file.id} filename="Download" />
        </li>
      ))}
    </ul>
  );
}

function PacksTab({ slug }: { slug: string }) {
  const query = useQuery({ queryKey: portalQueryKeys.section('packs'), queryFn: portalApi.packs });
  if (!query.data) return <SectionState isLoading={query.isLoading} error={query.error} />;
  if (query.data.packs.length === 0) return <Empty>Nothing has been sent to you yet.</Empty>;

  return (
    <div className="space-y-4">
      {query.data.packs.map((pack) => (
        <section key={pack.id} className="clay-card p-0 overflow-hidden">
          <h2 className="border-b border-sand-200 p-4 font-medium">
            {pack.title}
            {pack.expiresAt ? <span className="ml-2 text-xs text-ink-500">Expires {formatDate(pack.expiresAt)}</span> : null}
          </h2>
          <ul className="divide-y divide-sand-200">
            {pack.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate">{item.title}</p>
                  <p className="text-xs text-ink-500">
                    {item.kind === 'document' ? item.documentStatus : null}
                    {item.kind === 'payment' ? `${formatInr(item.amount ?? 0)} · ${item.paymentStatus}` : null}
                    {item.kind === 'file' ? 'File' : null}
                  </p>
                </div>
                <PackItemActions slug={slug} packId={pack.id} item={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PackItemActions({ slug, packId, item }: { slug: string; packId: string; item: import('@kraven/types').PortalPackItem }) {
  if (item.kind === 'document' && item.document) {
    if (item.documentStatus === 'Signed') {
      return (
        <Button asChild>
          <a href={portalSignedPdfUrl(item.document)} target="_blank" rel="noopener noreferrer">
            Download signed PDF
          </a>
        </Button>
      );
    }
    return (
      <div className="flex gap-2">
        <Button asChild className="bg-transparent shadow-none">
          <a href={portalDocumentPdfUrl(item.document)} target="_blank" rel="noopener noreferrer">
            View PDF
          </a>
        </Button>
        <Button asChild>
          <Link to={`/c/${encodeURIComponent(slug)}/sign/${item.document}`}>Sign</Link>
        </Button>
      </div>
    );
  }
  if (item.kind === 'payment' && item.paymentStatus !== 'Paid' && item.payee) {
    return (
      <Button asChild>
        <Link to={`/c/${encodeURIComponent(slug)}/pay-item/${packId}/${item.id}`}>Pay</Link>
      </Button>
    );
  }
  if (item.kind === 'file' && item.file) return <DownloadButton id={item.file} filename="Download" packFile />;
  return null;
}
