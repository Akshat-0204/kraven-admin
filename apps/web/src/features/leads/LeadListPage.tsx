import { LEAD_STATUSES } from '@kraven/config';
import type { LeadFilterInput, LeadInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Columns3, Plus, Search, Table as TableIcon, Trash2 } from 'lucide-react';
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
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">Pipeline & CRM</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">Leads</h1>
          <p className="font-body text-sm text-ink-500">
            Track inquiries, active negotiations, and conversion pipeline progress.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn clay-btn--primary inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-body font-medium shadow-[var(--clay-green)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="clay-card p-4 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface grid gap-3 sm:gap-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <Input
            startIcon={<Search className="h-4 w-4 text-ink-500" aria-hidden="true" />}
            placeholder="Search company, contact, email..."
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </div>
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
          placeholder="Lead source"
          value={filters.leadSource ?? ''}
          onChange={(event) => updateFilter('leadSource', event.target.value)}
        />
        <Input
          placeholder="Assigned person"
          value={filters.assignedPerson ?? ''}
          onChange={(event) => updateFilter('assignedPerson', event.target.value)}
        />
        {/* Table / Kanban View Toggle */}
        <div className="flex h-11 items-center rounded-pill bg-surface-soft p-1 border border-[rgba(120,110,90,0.16)] shadow-[var(--clay-inset-sm)]">
          <button
            className={cn(
              'h-full flex-1 rounded-pill inline-flex items-center justify-center gap-1.5 text-xs font-body font-medium transition-all duration-200',
              viewMode === 'table'
                ? 'bg-white text-ink-900 shadow-[var(--clay-raised-sm)]'
                : 'text-ink-500 hover:text-ink-900'
            )}
            type="button"
            onClick={() => setViewMode('table')}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
          <button
            className={cn(
              'h-full flex-1 rounded-pill inline-flex items-center justify-center gap-1.5 text-xs font-body font-medium transition-all duration-200',
              viewMode === 'kanban'
                ? 'bg-white text-ink-900 shadow-[var(--clay-raised-sm)]'
                : 'text-ink-500 hover:text-ink-900'
            )}
            type="button"
            onClick={() => setViewMode('kanban')}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Board</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {leadsQuery.isLoading ? (
        <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
          <p>Loading leads...</p>
        </div>
      ) : leadsQuery.isError ? (
        <div className="clay-card p-8 text-center font-body text-sm text-danger-fg">
          Unable to load leads. Please refresh the page.
        </div>
      ) : leads.length === 0 ? (
        <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
          No leads match the current view. Try adjusting filters or create a new lead.
        </div>
      ) : viewMode === 'kanban' ? (
        <LeadKanbanBoard
          leads={leads}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        />
      ) : (
        <div className="clay-card p-0 overflow-hidden rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-[rgba(120,110,90,0.14)] bg-surface-soft/80 font-display text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-5 py-4 font-normal">Company & Contact</th>
                  <th className="px-5 py-4 font-normal">Status</th>
                  <th className="px-5 py-4 font-normal">Est. Value</th>
                  <th className="px-5 py-4 font-normal">Assigned</th>
                  <th className="px-5 py-4 font-normal">Next Follow-Up</th>
                  <th className="px-5 py-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(120,110,90,0.12)]">
                {leads.map((lead) => (
                  <tr key={lead.id} className="group transition-colors hover:bg-surface-soft/70">
                    <td className="px-5 py-4">
                      <Link to={`/leads/${lead.id}`} className="block">
                        <div className="font-semibold text-ink-900 group-hover:text-olive-700 transition-colors">
                          {lead.companyName}
                        </div>
                        <div className="text-xs text-ink-500 font-normal">{lead.name}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-4 font-medium text-ink-800">
                      {formatCurrency(lead.estimatedValue)}
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-600">
                      {lead.assignedPerson || '-'}
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-600">
                      {formatDate(lead.nextFollowUpDate)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`Delete lead for ${lead.companyName}`}
                        title="Delete lead"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 text-ink-500 hover:text-danger-fg hover:shadow-[var(--clay-hover)] transition-all active:scale-[0.96]"
                        onClick={() => {
                          if (window.confirm(`Delete lead for ${lead.companyName}?`)) {
                            deleteMutation.mutate(lead.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
