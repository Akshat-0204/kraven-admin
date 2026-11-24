import type { PackRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { documentQueryKeys, listDocuments } from '../documents/documentApi';
import {
  createPack,
  deletePack,
  getDocumentSignature,
  listPacks,
  packQueryKeys,
  sendPack,
  setPackPaymentStatus
} from './portalApi';

function SignatureAudit({ documentId }: { documentId: string }) {
  const query = useQuery({ queryKey: packQueryKeys.signature(documentId), queryFn: () => getDocumentSignature(documentId) });
  const signature = query.data?.signature;
  if (!signature) return null;
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-xs text-muted">
      <dt>Signed by</dt>
      <dd>{signature.signerName} ({signature.method})</dd>
      <dt>At</dt>
      <dd>{new Date(signature.signedAt).toLocaleString()}</dd>
      <dt>IP</dt>
      <dd>{signature.ip}</dd>
      <dt>Device</dt>
      <dd className="break-all">{signature.userAgent}</dd>
      <dt>Original SHA-256</dt>
      <dd className="break-all font-mono">{signature.originalSha256}</dd>
      <dt>Sealed SHA-256</dt>
      <dd className="break-all font-mono">{signature.sealedSha256}</dd>
    </dl>
  );
}

function PackCard({ pack, onChange }: { pack: PackRecord; onChange: () => void }) {
  const send = useMutation({ mutationFn: () => sendPack(pack.id), onSuccess: onChange, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: () => deletePack(pack.id), onSuccess: onChange, onError: (e) => toast.error(e.message) });
  const advance = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: 'Sent' | 'Paid' }) => setPackPaymentStatus(pack.id, itemId, status),
    onSuccess: onChange,
    onError: (e) => toast.error(e.message)
  });

  return (
    <li className="rounded border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {pack.title} <span className="text-xs text-muted">({pack.status})</span>
        </p>
        <div className="flex gap-2">
          {pack.status === 'Draft' ? (
            <Button type="button" onClick={() => send.mutate()} disabled={send.isPending}>
              Send
            </Button>
          ) : null}
          <Button type="button" className="bg-transparent text-white hover:bg-white/10" onClick={() => remove.mutate()}>
            Delete
          </Button>
        </div>
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {pack.items.map((item) => (
          <li key={item.id}>
            <div className="flex items-center justify-between gap-2">
              <span>
                {item.kind}: {item.title}
                {item.kind === 'document' ? ` · ${item.documentStatus}` : ''}
                {item.kind === 'payment' ? ` · INR ${item.amount} · ${item.paymentStatus}` : ''}
              </span>
              {item.kind === 'payment' && item.paymentStatus !== 'Paid' ? (
                <Button
                  type="button"
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
    <section className="rounded border border-border bg-panel p-4">
      <h2 className="text-sm font-semibold">Packs</h2>
      <p className="mb-3 mt-1 text-xs text-muted">Group documents and payment requests and send them to the client portal.</p>
      <ul className="mb-4 space-y-2">
        {(packs.data?.packs ?? []).map((pack) => (
          <PackCard key={pack.id} pack={pack} onChange={refresh} />
        ))}
        {packs.data?.packs.length === 0 ? <li className="text-sm text-muted">No packs yet</li> : null}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        <Input aria-label="Pack title" placeholder="Pack title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {(documents.data?.documents ?? []).map((document) => (
          <label key={document.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(document.id)}
              onChange={(e) => setSelected(e.target.checked ? [...selected, document.id] : selected.filter((id) => id !== document.id))}
            />
            {document.title} <span className="text-xs text-muted">({document.status})</span>
          </label>
        ))}
        <div className="flex gap-2">
          <Input aria-label="Payment label" placeholder="Payment label (optional)" value={payLabel} onChange={(e) => setPayLabel(e.target.value)} />
          <Input aria-label="Payment amount" type="number" min="0" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </div>
        <Button type="submit" disabled={create.isPending || !title.trim()}>
          Create pack
        </Button>
      </form>
    </section>
  );
}
