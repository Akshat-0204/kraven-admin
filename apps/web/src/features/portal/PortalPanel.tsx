import type { PortalSettingsRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, ShieldOff } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { getPortalSettings, portalAdminQueryKeys, revokePortal, savePortalSettings, setPortalCode } from './portalApi';

/** Suggested slug for a client without one; the server still validates it. */
export function slugifyCompanyName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Never';
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy the ${label.toLowerCase()}`);
  }
}

/** Client page panel: portal link, access code (shown once), expiry and revoke. */
export function PortalPanel({ clientId, defaultSlug }: { clientId: string; defaultSlug?: string }) {
  const queryClient = useQueryClient();
  const queryKey = portalAdminQueryKeys.settings(clientId);
  const query = useQuery({ queryKey, queryFn: () => getPortalSettings(clientId) });
  const portal = query.data?.portal;

  const [slug, setSlug] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [revealedCode, setRevealedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!portal) return;
    setSlug(portal.slug ?? defaultSlug ?? '');
    setEnabled(portal.enabled);
    setExpiresAt(toDateInput(portal.expiresAt));
  }, [portal, defaultSlug]);

  const applyPortal = (next: PortalSettingsRecord) => queryClient.setQueryData(queryKey, { portal: next });

  const save = useMutation({
    mutationFn: () => savePortalSettings(clientId, { slug, enabled, expiresAt: expiresAt || '' }),
    onSuccess: ({ portal: next }) => {
      applyPortal(next);
      toast.success('Portal settings saved');
    },
    onError: (error) => toast.error(error.message)
  });

  const code = useMutation({
    mutationFn: (value?: string) => setPortalCode(clientId, value),
    onSuccess: (result) => {
      applyPortal(result.portal);
      setRevealedCode(result.code);
      setCustomCode('');
    },
    onError: (error) => toast.error(error.message)
  });

  const revoke = useMutation({
    mutationFn: () => revokePortal(clientId),
    onSuccess: ({ portal: next }) => {
      applyPortal(next);
      setRevealedCode(null);
      toast.success('Portal access revoked');
    },
    onError: (error) => toast.error(error.message)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  if (query.isLoading) {
    return <section className="rounded border border-border bg-panel p-4 text-sm text-muted">Loading portal...</section>;
  }
  if (!portal) {
    return <section className="rounded border border-border bg-panel p-4 text-sm text-red-200">Could not load portal settings.</section>;
  }

  return (
    <section className="space-y-4 rounded border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Client portal</h2>
        <span className={`text-xs ${portal.enabled ? 'text-emerald-300' : 'text-muted'}`}>{portal.enabled ? 'Enabled' : 'Disabled'}</span>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs text-muted">
          Link slug
          <Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="acme-studio" className="mt-1" />
        </label>
        <label className="block text-xs text-muted">
          Expires on (optional)
          <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Portal enabled
        </label>
        <Button type="submit" disabled={save.isPending || !slug.trim()}>
          {save.isPending ? 'Saving...' : 'Save'}
        </Button>
      </form>

      {portal.url ? (
        <div className="flex items-center gap-2 rounded border border-border p-2 text-xs">
          <span className="min-w-0 flex-1 truncate font-mono">{portal.url}</span>
          <button type="button" className="p-1 text-muted hover:text-white" onClick={() => copy(portal.url!, 'Link')} aria-label="Copy portal link">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs text-muted">
          Access code: {portal.hasCode ? `set ${formatDateTime(portal.codeUpdatedAt)}` : 'not set'}. Setting a new code signs out
          existing sessions.
        </p>
        {revealedCode ? (
          <div className="rounded border border-amber-400/40 bg-amber-400/10 p-3">
            <p className="text-xs text-amber-200">Shown once. Share it with the client now.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 font-mono text-lg tracking-widest">{revealedCode}</code>
              <button type="button" className="p-1 text-muted hover:text-white" onClick={() => copy(revealedCode, 'Code')} aria-label="Copy code">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => code.mutate(undefined)} disabled={code.isPending || !portal.slug}>
            <KeyRound className="mr-2 h-4 w-4" aria-hidden />
            Generate code
          </Button>
          <Button
            className="bg-transparent text-red-200 hover:bg-red-500/10"
            onClick={() => {
              if (window.confirm('Revoke portal access? The code is removed and every session is signed out.')) revoke.mutate();
            }}
            disabled={revoke.isPending || (!portal.hasCode && !portal.slug)}
          >
            <ShieldOff className="mr-2 h-4 w-4" aria-hidden />
            Revoke
          </Button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (customCode.trim()) code.mutate(customCode.trim());
          }}
        >
          <Input
            value={customCode}
            onChange={(event) => setCustomCode(event.target.value)}
            placeholder="Or set your own code"
            aria-label="Custom access code"
            autoComplete="off"
            disabled={!portal.slug}
          />
          <Button type="submit" className="shrink-0" disabled={code.isPending || !customCode.trim() || !portal.slug}>
            Set
          </Button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs">
        <dt className="text-muted">Last login</dt>
        <dd>{formatDateTime(portal.lastLoginAt)}</dd>
        <dt className="text-muted">Last viewed</dt>
        <dd>{formatDateTime(portal.lastViewedAt)}</dd>
        {portal.lockedUntil && new Date(portal.lockedUntil) > new Date() ? (
          <>
            <dt className="text-muted">Locked until</dt>
            <dd className="text-amber-200">{formatDateTime(portal.lockedUntil)}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
