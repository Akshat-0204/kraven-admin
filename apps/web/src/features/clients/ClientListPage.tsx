import type { ClientInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { createClient, deleteClient, clientQueryKeys, listClients } from './clientApi';
import { clientInitials } from './clientFormat';
import { ClientFormModal } from './ClientFormModal';

export function ClientListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: clientQueryKeys.list({ search }),
    queryFn: () => listClients({ search })
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success('Client created');
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success('Client deleted');
    },
    onError: (error) => toast.error(error.message)
  });

  const clients = clientsQuery.data?.clients ?? [];

  async function handleCreate(input: ClientInput) {
    await createMutation.mutateAsync(input);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Client records</p>
          <h1 className="mt-2 text-2xl font-semibold">Clients</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New client
        </Button>
      </div>

      <label className="relative block rounded border border-border bg-panel p-3">
        <Search className="pointer-events-none absolute left-6 top-6 h-4 w-4 text-muted" aria-hidden="true" />
        <Input
          className="pl-9"
          placeholder="Search by company, contact, email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {clientsQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading clients...</div>
      ) : clientsQuery.isError ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load clients.
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
          No clients match the current search.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article key={client.id} className="rounded border border-border bg-panel p-4">
              <Link to={`/clients/${client.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-black text-xs">
                    {clientInitials(client.companyName)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{client.companyName}</h2>
                    <p className="mt-1 truncate text-sm text-muted">{client.contactPerson}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-sm text-muted">
                  <div>{client.email || '-'}</div>
                  <div>{client.phone || '-'}</div>
                </div>
              </Link>
              <div className="mt-4 flex justify-end">
                <Button
                  className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
                  onClick={() => {
                    if (window.confirm(`Delete client ${client.companyName}?`)) {
                      deleteMutation.mutate(client.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ClientFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </section>
  );
}
