import { payeeProfileSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, EmptyState, Input, LoadingState } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
import { createPayeeProfile, deletePayeeProfile, listPayeeProfiles, portalAdminQueryKeys, updatePayeeProfile } from './portalApi';

/** Settings section: UPI payee profiles used by the client portal's Pay page. */
export function PayeeProfilesSection() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: portalAdminQueryKeys.payees, queryFn: listPayeeProfiles });
  const [name, setName] = useState('');
  const [vpa, setVpa] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const refresh = () => queryClient.invalidateQueries({ queryKey: portalAdminQueryKeys.payees });

  const create = useMutation({
    mutationFn: createPayeeProfile,
    onSuccess: async () => {
      setName('');
      setVpa('');
      await refresh();
      toast.success('Payee added');
    },
    onError: (error) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setFieldErrors(error.fieldErrors);
      toast.error(errorMessage(error, 'Could not add the payee'));
    }
  });

  const makeDefault = useMutation({
    mutationFn: (id: string) => updatePayeeProfile(id, { isDefault: true }),
    onSuccess: refresh,
    onError: toastError('Could not set the default payee')
  });

  const remove = useMutation({
    mutationFn: deletePayeeProfile,
    onSuccess: refresh,
    onError: toastError('Could not delete the payee')
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = payeeProfileSchema.safeParse({ name, vpa, isDefault: (query.data?.payeeProfiles.length ?? 0) === 0 });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? '_form')] ??= issue.message;
      if (!name.trim()) next.name = 'Enter the account name';
      if (!vpa.trim()) next.vpa = 'Enter the UPI ID';
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    create.mutate(parsed.data);
  }

  const payees = query.data?.payeeProfiles ?? [];

  return (
    <Card className="space-y-4">
      <CardHeader
        title="UPI Payee Accounts"
        subtitle="Designate verified settlement handles for portal invoice payments."
      />

      <ul className="space-y-2.5">
        {query.isLoading ? <li>
            <LoadingState label="Loading payee accounts..." className="py-4" />
          </li> : null}
        {query.isError ? (
          <li role="alert" className="font-body text-sm text-danger-fg">
            {errorMessage(query.error, 'Unable to load payee accounts.')}
          </li>
        ) : null}
        {!query.isLoading && !query.isError && payees.length === 0 ? (
          <li>
            <EmptyState title="No payees configured yet. Add one below to enable UPI payments." className="py-6" />
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
                  <span className="clay-chip text-[10px] py-0.5 px-2 bg-olive-100 text-olive-900 font-semibold">
                    Default Payee
                  </span>
                ) : null}
              </div>
              <p className="font-mono text-xs text-olive-900 font-medium pt-0.5">{payee.vpa}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!payee.isDefault ? (
                <Button
                  type="button"
                  className="h-8 gap-1 px-2.5 text-xs text-ink-700"
                  onClick={() => makeDefault.mutate(payee.id)}
                  disabled={makeDefault.isPending}
                  aria-label={`Make ${payee.name} the default payee`}
                  title="Make default"
                >
                  <Star className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Set Default</span>
                </Button>
              ) : null}
              <button
                type="button"
                className="h-8 w-8 rounded-sm flex items-center justify-center text-ink-500 hover:text-danger-fg transition-colors"
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
              Account / Business Name <span className="text-danger-fg">*</span>
            </label>
            <Input
              aria-label="Payee name"
              aria-invalid={Boolean(fieldErrors.name)}
              placeholder="e.g. Kraven Agency"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full"
            />
            {fieldErrors.name ? <p className="mt-1 font-body text-xs text-danger-fg">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              UPI VPA Identifier <span className="text-danger-fg">*</span>
            </label>
            <Input
              aria-label="UPI ID"
              aria-invalid={Boolean(fieldErrors.vpa)}
              placeholder="e.g. kraven@icici"
              value={vpa}
              onChange={(event) => setVpa(event.target.value)}
              className="w-full"
            />
            {fieldErrors.vpa ? <p className="mt-1 font-body text-xs text-danger-fg">{fieldErrors.vpa}</p> : null}
          </div>
        </div>

        <button
          type="submit"
          disabled={create.isPending}
          className="clay-btn clay-btn--primary h-10 px-5 rounded-pill font-body text-xs font-medium text-white shadow-clay-green disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Payee Account</span>
        </button>
      </form>
    </Card>
  );
}
