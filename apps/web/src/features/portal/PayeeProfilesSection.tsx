import { payeeProfileSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Trash2 } from 'lucide-react';
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
    <section className="rounded border border-border bg-panel p-5">
      <h2 className="text-base font-semibold">UPI payees</h2>
      <p className="mt-1 text-sm text-muted">
        Who clients pay from the portal. An invoice uses its own payee, or the default one.
      </p>

      <ul className="mt-4 space-y-2">
        {query.isLoading ? <li className="text-sm text-muted">Loading payees...</li> : null}
        {!query.isLoading && payees.length === 0 ? (
          <li className="rounded border border-dashed border-border p-3 text-sm text-muted">No payees. Run `npm run seed:payees -w @kraven/api` or add one.</li>
        ) : null}
        {payees.map((payee) => (
          <li key={payee.id} className="flex items-center gap-2 rounded border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {payee.name}
                {payee.isDefault ? <span className="ml-2 text-xs text-emerald-300">Default</span> : null}
              </p>
              <p className="font-mono text-xs text-muted">{payee.vpa}</p>
            </div>
            {!payee.isDefault ? (
              <Button
                className="h-8 bg-transparent px-2 text-white hover:bg-white/10"
                onClick={() => makeDefault.mutate(payee.id)}
                disabled={makeDefault.isPending}
                aria-label={`Make ${payee.name} the default payee`}
              >
                <Star className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            <Button
              className="h-8 bg-transparent px-2 text-red-200 hover:bg-red-500/10"
              onClick={() => {
                if (window.confirm(`Delete payee ${payee.name}?`)) remove.mutate(payee.id);
              }}
              disabled={remove.isPending}
              aria-label={`Delete ${payee.name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input aria-label="Payee name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input aria-label="UPI ID" placeholder="name@bank" value={vpa} onChange={(event) => setVpa(event.target.value)} />
        <Button type="submit" disabled={create.isPending}>
          Add payee
        </Button>
      </form>
    </section>
  );
}
