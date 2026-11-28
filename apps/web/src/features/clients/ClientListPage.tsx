import type { ClientInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
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
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">Client Directory</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">Clients</h1>
          <p className="font-body text-sm text-ink-500">
            Manage agency accounts, key stakeholders, and project relationships.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn clay-btn--primary inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-body font-medium shadow-[var(--clay-green)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New client</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="clay-card p-4 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface">
        <Input
          startIcon={<Search className="h-4 w-4 text-ink-500" aria-hidden="true" />}
          placeholder="Search by company, contact person, or email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* Main Content Grid */}
      {clientsQuery.isLoading ? (
        <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
          <p>Loading clients...</p>
        </div>
      ) : clientsQuery.isError ? (
        <div className="clay-card p-8 text-center font-body text-sm text-danger-fg">
          Unable to load clients. Please refresh the page.
        </div>
      ) : clients.length === 0 ? (
        <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
          No clients match the current search.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <article
              key={client.id}
              className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] hover:shadow-[var(--clay-hover)] transition-all hover:-translate-y-0.5 bg-surface flex flex-col justify-between group"
            >
              <div>
                <Link to={`/clients/${client.id}`} className="block">
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-800 font-bold text-sm shadow-[var(--clay-raised-sm)] border border-white/90">
                      {clientInitials(client.companyName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-base font-bold text-ink-900 group-hover:text-olive-700 transition-colors">
                        {client.companyName}
                      </h2>
                      <p className="mt-0.5 truncate font-body text-xs text-ink-500">
                        {client.contactPerson}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-[rgba(120,110,90,0.1)] font-body text-xs text-ink-600">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-olive-700 shrink-0" />
                      <span className="truncate">{client.email || 'No email registered'}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="h-3.5 w-3.5 text-olive-700 shrink-0" />
                      <span className="truncate">{client.phone || 'No phone registered'}</span>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mt-4 pt-3 border-t border-[rgba(120,110,90,0.1)] flex items-center justify-between">
                <Link
                  to={`/clients/${client.id}`}
                  className="font-body text-xs font-semibold text-olive-700 hover:text-olive-900 transition-colors"
                >
                  View Details &rarr;
                </Link>
                <button
                  type="button"
                  aria-label={`Delete client ${client.companyName}`}
                  title="Delete client"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 text-ink-500 hover:text-danger-fg hover:shadow-[var(--clay-hover)] transition-all active:scale-[0.96]"
                  onClick={() => {
                    if (window.confirm(`Delete client ${client.companyName}?`)) {
                      deleteMutation.mutate(client.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
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
