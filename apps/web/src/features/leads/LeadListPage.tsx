import { LEAD_STATUSES } from '@kraven/config';
import type { LeadFilterInput, LeadInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { LeadStatusBadge } from '../../components/ui/statusBadge';
import { cn } from '../../lib/utils';
import {
  createLead,
  deleteLead,
  leadQueryKeys,
  listLeads,
  updateLeadStatus
} from './leadApi';
import { formatCurrency, formatDate } from './leadFormat';
import { LeadFormModal } from './LeadFormModal';
import { LeadKanbanBoard } from './LeadKanbanBoard';

type ViewMode = 'table' | 'kanban';

export function LeadListPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LeadFilterInput>({});
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const leadsQuery = useQuery({
    queryKey: leadQueryKeys.list(filters),
    queryFn: () => listLeads(filters)
  });

  const createMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      toast.success('Lead created');
    },
    onError: (error) => toast.error(error.message)
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: (typeof LEAD_STATUSES)[number] }) =>
      updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      toast.success('Lead status updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      toast.success('Lead deleted');
    },
    onError: (error) => toast.error(error.message)
  });

  const leads = leadsQuery.data?.leads ?? [];

  function updateFilter(key: keyof LeadFilterInput, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined
    }));
  }

  async function handleCreateLead(input: LeadInput) {
    await createMutation.mutateAsync(input);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Pipeline</p>
          <h1 className="mt-2 text-2xl font-semibold">Leads</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New lead
        </Button>
      </div>

      <div className="grid gap-3 rounded border border-border bg-panel p-3 md:grid-cols-6">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search company, contact, email"
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </label>
        <Select
          value={filters.status ?? ''}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Source"
          value={filters.leadSource ?? ''}
          onChange={(event) => updateFilter('leadSource', event.target.value)}
        />
        <Input
          placeholder="Assigned"
          value={filters.assignedPerson ?? ''}
          onChange={(event) => updateFilter('assignedPerson', event.target.value)}
        />
        <div className="flex rounded border border-border bg-black p-1">
          <button
            className={cn(
              'h-8 flex-1 rounded text-xs text-muted',
              viewMode === 'table' && 'bg-white text-black'
            )}
            type="button"
            onClick={() => setViewMode('table')}
          >
            Table
          </button>
          <button
            className={cn(
              'h-8 flex-1 rounded text-xs text-muted',
              viewMode === 'kanban' && 'bg-white text-black'
            )}
            type="button"
            onClick={() => setViewMode('kanban')}
          >
            Board
          </button>
        </div>
      </div>

      {leadsQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading leads...</div>
      ) : leadsQuery.isError ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load leads.
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
          No leads match the current view.
        </div>
      ) : viewMode === 'kanban' ? (
        <LeadKanbanBoard
          leads={leads}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Lead</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Value</th>
                <th className="px-3 py-3 font-medium">Assigned</th>
                <th className="px-3 py-3 font-medium">Next follow-up</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5">
                  <td className="px-3 py-3">
                    <Link to={`/leads/${lead.id}`} className="block">
                      <div className="font-medium">{lead.companyName}</div>
                      <div className="text-xs text-muted">{lead.name}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(lead.estimatedValue)}</td>
                  <td className="px-3 py-3 text-muted">{lead.assignedPerson || '-'}</td>
                  <td className="px-3 py-3 text-muted">{formatDate(lead.nextFollowUpDate)}</td>
                  <td className="px-3 py-3">
                    <Button
                      className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
                      onClick={() => {
                        if (window.confirm(`Delete lead for ${lead.companyName}?`)) {
                          deleteMutation.mutate(lead.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateLead}
      />
    </section>
  );
}
