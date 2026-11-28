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
    return (
      <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface text-xs font-body text-ink-500">
        Loading portal settings...
      </section>
    );
  }
  if (!portal) {
    return (
      <section className="clay-card p-6 rounded-lg border border-danger-fg/30 bg-surface text-xs font-body text-danger-fg">
        Could not load portal settings.
      </section>
    );
  }

  return (
    <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">Client Portal</h2>
          <p className="font-body text-xs text-ink-500">Access link, security code, and authentication status</p>
        </div>
        <span
          className={
            portal.enabled
              ? 'clay-chip text-xs bg-olive-100 text-olive-800'
              : 'clay-chip text-xs bg-sand-200 text-ink-600'
          }
        >
          {portal.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
            Portal URL Slug
          </label>
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="acme-studio"
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
            Expires On (Optional)
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="w-full"
          />
        </div>

        <label className="flex items-center gap-2 font-body text-xs text-ink-800 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="accent-olive-700 h-4 w-4 rounded"
          />
          <span>Enable Client Portal Access</span>
        </label>

        <button
          type="submit"
          disabled={save.isPending || !slug.trim()}
          className="clay-btn clay-btn--primary h-9 px-4 rounded-pill font-body text-xs font-medium text-white shadow-[var(--clay-green)] disabled:opacity-50"
        >
          {save.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {portal.url ? (
        <div className="flex items-center gap-2 rounded-md border border-[rgba(120,110,90,0.14)] bg-surface-soft p-2.5 text-xs">
          <span className="min-w-0 flex-1 truncate font-mono text-ink-800">{portal.url}</span>
          <button
            type="button"
            className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-500 hover:text-olive-700 transition-colors"
            onClick={() => copy(portal.url!, 'Link')}
            aria-label="Copy portal link"
            title="Copy portal link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-[rgba(120,110,90,0.12)] pt-4">
        <p className="font-body text-xs text-ink-500">
          Access code: {portal.hasCode ? `Configured on ${formatDateTime(portal.codeUpdatedAt)}` : 'Not configured'}. Generating a new code signs out existing client sessions.
        </p>

        {revealedCode ? (
          <div className="rounded-md border border-amber-300/50 bg-[var(--warning-bg)] p-3 space-y-1">
            <p className="font-body text-xs text-[var(--warning-fg)] font-semibold">
              Temporary view: Share this code directly with the client now.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg font-bold tracking-widest text-[var(--warning-fg)]">
                {revealedCode}
              </code>
              <button
                type="button"
                className="h-7 w-7 rounded-sm flex items-center justify-center text-[var(--warning-fg)] hover:text-ink-900 transition-colors"
                onClick={() => copy(revealedCode, 'Code')}
                aria-label="Copy code"
                title="Copy code"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="clay-btn clay-btn--secondary h-9 px-4 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700 flex items-center gap-1.5 disabled:opacity-50"
            onClick={() => code.mutate(undefined)}
            disabled={code.isPending || !portal.slug}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Generate Code</span>
          </button>
          <button
            type="button"
            className="clay-btn h-9 px-4 rounded-pill font-body text-xs font-medium text-danger-fg bg-surface shadow-[var(--clay-raised-sm)] border border-danger-fg/30 hover:bg-danger-fg/10 flex items-center gap-1.5 disabled:opacity-50"
            onClick={() => {
              if (window.confirm('Revoke portal access? The code is removed and every session is signed out.')) revoke.mutate();
            }}
            disabled={revoke.isPending || (!portal.hasCode && !portal.slug)}
          >
            <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Revoke Access</span>
          </button>
        </div>

        <form
          className="flex gap-2 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (customCode.trim()) code.mutate(customCode.trim());
          }}
        >
          <Input
            value={customCode}
            onChange={(event) => setCustomCode(event.target.value)}
            placeholder="Or assign a custom code..."
            aria-label="Custom access code"
            autoComplete="off"
            disabled={!portal.slug}
            className="flex-1"
          />
          <button
            type="submit"
            className="clay-btn clay-btn--secondary h-11 px-4 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700 disabled:opacity-50"
            disabled={code.isPending || !customCode.trim() || !portal.slug}
          >
            Set Code
          </button>
        </form>
      </div>

      <dl className="grid grid-cols-2 gap-2 border-t border-[rgba(120,110,90,0.12)] pt-3 text-xs font-body">
        <dt className="text-ink-500">Last login:</dt>
        <dd className="font-medium text-ink-800">{formatDateTime(portal.lastLoginAt)}</dd>
        <dt className="text-ink-500">Last viewed:</dt>
        <dd className="font-medium text-ink-800">{formatDateTime(portal.lastViewedAt)}</dd>
        {portal.lockedUntil && new Date(portal.lockedUntil) > new Date() ? (
          <>
            <dt className="text-danger-fg font-semibold">Locked until:</dt>
            <dd className="text-danger-fg font-medium">{formatDateTime(portal.lockedUntil)}</dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
