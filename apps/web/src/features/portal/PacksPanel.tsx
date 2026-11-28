import type { PackRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, EmptyState, Input } from '../../components/ui';
import { documentQueryKeys, listDocuments } from '../documents/documentApi';
import {
  createPack,
  deletePack,
  getDocumentSignature,
  listPacks,
  packQueryKeys,
  emailPack,
  sendPack,
  setPackPaymentStatus
} from './portalApi';

function SignatureAudit({ documentId }: { documentId: string }) {
  const query = useQuery({ queryKey: packQueryKeys.signature(documentId), queryFn: () => getDocumentSignature(documentId) });
  const signature = query.data?.signature;
  if (!signature) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] font-body text-ink-500 bg-surface p-2.5 rounded border border-[rgba(120,110,90,0.1)]">
      <dt className="font-semibold text-ink-700">Signed by:</dt>
      <dd className="text-ink-900">{signature.signerName} ({signature.method})</dd>
      <dt className="font-semibold text-ink-700">At:</dt>
      <dd>{new Date(signature.signedAt).toLocaleString('en-IN')}</dd>
      <dt className="font-semibold text-ink-700">IP:</dt>
      <dd>{signature.ip}</dd>
      <dt className="font-semibold text-ink-700">Original SHA-256:</dt>
      <dd className="break-all font-mono text-[10px] text-ink-700">{signature.originalSha256}</dd>
      <dt className="font-semibold text-ink-700">Sealed SHA-256:</dt>
      <dd className="break-all font-mono text-[10px] text-ink-700">{signature.sealedSha256}</dd>
    </dl>
  );
}

function PackCard({ pack, onChange }: { pack: PackRecord; onChange: () => void }) {
  const send = useMutation({
    mutationFn: (email: boolean) => sendPack(pack.id, email),
    onSuccess: (result) => {
      if (result.emailError) toast.error(`Pack sent, but email failed: ${result.emailError}`);
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const email = useMutation({
    mutationFn: () => emailPack(pack.id),
    onSuccess: () => {
      toast.success('Email queued');
      onChange();
    },
    onError: (e) => toast.error(e.message)
  });
  const remove = useMutation({ mutationFn: () => deletePack(pack.id), onSuccess: onChange, onError: (e) => toast.error(e.message) });
  const advance = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: 'Sent' | 'Paid' }) => setPackPaymentStatus(pack.id, itemId, status),
    onSuccess: onChange,
    onError: (e) => toast.error(e.message)
  });

  return (
    <li className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(120,110,90,0.1)] pb-2.5">
        <div className="flex items-center gap-2">
          <p className="font-body text-sm font-semibold text-ink-900">{pack.title}</p>
          <span className="clay-chip text-[11px] py-0.5 px-2 bg-sand-200 text-ink-900">
            {pack.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pack.status === 'Draft' ? (
            <>
              <Button type="button" onClick={() => send.mutate(false)} disabled={send.isPending} className="h-8 px-3 text-xs">
                Send
              </Button>
              <button
                type="button"
                onClick={() => send.mutate(true)}
                disabled={send.isPending}
                className="clay-btn clay-btn--primary h-8 px-3 rounded-pill font-body text-xs font-medium text-white shadow-clay-green"
              >
                Send + email
              </button>
            </>
          ) : pack.status === 'Sent' ? (
            <Button type="button" onClick={() => email.mutate()} disabled={email.isPending} className="h-8 px-3 text-xs">
              Email client
            </Button>
          ) : null}
          <button
            type="button"
            className="h-8 px-3 rounded-pill font-body text-xs font-medium text-danger-fg hover:bg-danger-fg/10 transition-colors"
            onClick={() => remove.mutate()}
          >
            Delete
          </button>
        </div>
      </div>
      <ul className="space-y-2 font-body text-xs">
        {pack.items.map((item) => (
          <li key={item.id} className="rounded border border-[rgba(120,110,90,0.1)] bg-surface p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink-900">
                <span className="capitalize text-olive-900 font-semibold">{item.kind}</span>: {item.title}
                {item.kind === 'document' ? ` · ${item.documentStatus}` : ''}
                {item.kind === 'payment' ? ` · INR ${item.amount} · ${item.paymentStatus}` : ''}
              </span>
              {item.kind === 'payment' && item.paymentStatus !== 'Paid' ? (
                <Button
                  type="button"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => advance.mutate({ itemId: item.id, status: item.paymentStatus === 'Pending' ? 'Sent' : 'Paid' })}
                >
                  Mark {item.paymentStatus === 'Pending' ? 'Sent' : 'Paid'}
                </Button>
              ) : null}
            </div>
            {item.kind === 'document' && item.documentStatus === 'Signed' && item.document ? <SignatureAudit documentId={item.document} /> : null}
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Client page panel: build packs (documents + payment requests), send them to the portal, track status. */
export function PacksPanel({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const key = packQueryKeys.list(clientId);
  const packs = useQuery({ queryKey: key, queryFn: () => listPacks(clientId) });
  const documents = useQuery({ queryKey: documentQueryKeys.list({ client: clientId }), queryFn: () => listDocuments({ client: clientId }) });
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [payLabel, setPayLabel] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
  };
  const create = useMutation({
    mutationFn: () =>
      createPack({
        client: clientId,
        title: title.trim(),
        items: [
          ...selected.map((document) => ({ kind: 'document' as const, document })),
          ...(payLabel.trim() && Number(payAmount) > 0 ? [{ kind: 'payment' as const, label: payLabel.trim(), amount: Number(payAmount) }] : [])
        ]
      }),
    onSuccess: () => {
      setTitle('');
      setSelected([]);
      setPayLabel('');
      setPayAmount('');
      refresh();
    },
    onError: (e) => toast.error(e.message)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim()) create.mutate();
  }

  return (
    <Card className="space-y-4">
      <CardHeader
        title="Document & Payment Packs"
        subtitle="Group agreements and payment requests into signed workflows."
      />

      <ul className="space-y-3">
        {(packs.data?.packs ?? []).map((pack) => (
          <PackCard key={pack.id} pack={pack} onChange={refresh} />
        ))}
        {packs.data?.packs.length === 0 ? (
          <li>
            <EmptyState title="No packs created yet" className="py-6" />
          </li>
        ) : null}
      </ul>

      <form onSubmit={submit} className="space-y-3 pt-2 border-t border-[rgba(120,110,90,0.12)]">
        <div>
          <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
            New Pack Title
          </label>
          <Input aria-label="Pack title" placeholder="e.g. Master Agreement & Retainer" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {(documents.data?.documents ?? []).length > 0 && (
          <div className="space-y-1.5">
            <span className="font-body text-xs font-semibold text-ink-700">Attach Documents:</span>
            {(documents.data?.documents ?? []).map((document) => (
              <label key={document.id} className="flex items-center gap-2 font-body text-xs text-ink-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(document.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, document.id] : selected.filter((id) => id !== document.id))}
                  className="accent-olive-700 h-3.5 w-3.5 rounded"
                />
                <span>{document.title}</span>
                <span className="clay-chip text-[10px] py-0 px-1.5 bg-sand-200 text-ink-700">({document.status})</span>
              </label>
            ))}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Payment label" placeholder="Payment item (optional, e.g. Advance)" value={payLabel} onChange={(e) => setPayLabel(e.target.value)} />
          <Input aria-label="Payment amount" type="number" min="0" placeholder="Amount (INR)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={create.isPending || !title.trim()}
          className="clay-btn clay-btn--primary h-9 px-4 rounded-pill font-body text-xs font-medium text-white shadow-clay-green disabled:opacity-50"
        >
          {create.isPending ? 'Creating...' : 'Create Pack'}
        </button>
      </form>
    </Card>
  );
}
