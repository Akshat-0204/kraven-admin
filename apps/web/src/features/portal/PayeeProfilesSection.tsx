import { payeeProfileSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { createPayeeProfile, deletePayeeProfile, listPayeeProfiles, portalAdminQueryKeys, updatePayeeProfile } from './portalApi';

/** Settings section: UPI payee profiles used by the client portal's Pay page. */
export function PayeeProfilesSection() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: portalAdminQueryKeys.payees, queryFn: listPayeeProfiles });
  const [name, setName] = useState('');
  const [vpa, setVpa] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: portalAdminQueryKeys.payees });

  const create = useMutation({
    mutationFn: createPayeeProfile,
    onSuccess: async () => {
      setName('');
      setVpa('');
      await refresh();
      toast.success('Payee added');
    },
    onError: (error) => toast.error(error.message)
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) => updatePayeeProfile(id, { isDefault: true }),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message)
  });

  const remove = useMutation({
    mutationFn: deletePayeeProfile,
    onSuccess: refresh,
    onError: (error) => toast.error(error.message)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = payeeProfileSchema.safeParse({ name, vpa, isDefault: (query.data?.payeeProfiles.length ?? 0) === 0 });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Enter a name and UPI ID');
      return;
    }
    create.mutate(parsed.data);
  }

  const payees = query.data?.payeeProfiles ?? [];

  return (
    <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
      {/* Header */}
      <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
        <h2 className="font-display text-base font-bold text-ink-900">UPI Payee Accounts</h2>
        <p className="font-body text-xs text-ink-500">
          Designate verified settlement handles for portal invoice payments.
        </p>
      </div>

      <ul className="space-y-2.5">
        {query.isLoading ? <li className="font-body text-xs text-ink-500">Loading payee accounts...</li> : null}
        {!query.isLoading && payees.length === 0 ? (
          <li className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center font-body text-xs text-ink-500">
            No payees configured yet. Add one below to enable UPI payments.
          </li>
        ) : null}
        {payees.map((payee) => (
          <li
            key={payee.id}
            className="flex items-center justify-between gap-3 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-3.5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-body text-sm font-semibold text-ink-900">{payee.name}</p>
                {payee.isDefault ? (
                  <span className="clay-chip text-[10px] py-0.5 px-2 bg-olive-100 text-olive-800 font-semibold">
                    Default Payee
                  </span>
                ) : null}
              </div>
              <p className="font-mono text-xs text-olive-800 font-medium pt-0.5">{payee.vpa}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!payee.isDefault ? (
                <button
                  type="button"
                  className="clay-btn clay-btn--secondary h-8 px-2.5 rounded-pill font-body text-xs text-ink-700 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700 flex items-center gap-1"
                  onClick={() => makeDefault.mutate(payee.id)}
                  disabled={makeDefault.isPending}
                  aria-label={`Make ${payee.name} the default payee`}
                  title="Make default"
                >
                  <Star className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Set Default</span>
                </button>
              ) : null}
              <button
                type="button"
                className="h-8 w-8 rounded-sm flex items-center justify-center text-ink-400 hover:text-danger-fg transition-colors"
                onClick={() => {
                  if (window.confirm(`Delete payee ${payee.name}?`)) remove.mutate(payee.id);
                }}
                disabled={remove.isPending}
                aria-label={`Delete ${payee.name}`}
                title="Delete payee"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Add Payee Form */}
      <form onSubmit={submit} className="pt-2 border-t border-[rgba(120,110,90,0.12)] space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              Account / Business Name
            </label>
            <Input
              aria-label="Payee name"
              placeholder="e.g. Kraven Agency"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              UPI VPA Identifier
            </label>
            <Input
              aria-label="UPI ID"
              placeholder="e.g. kraven@icici"
              value={vpa}
              onChange={(event) => setVpa(event.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={create.isPending || !name.trim() || !vpa.trim()}
          className="clay-btn clay-btn--primary h-10 px-5 rounded-pill font-body text-xs font-medium text-white shadow-[var(--clay-green)] disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Payee Account</span>
        </button>
      </form>
    </section>
  );
}
