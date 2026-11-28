import { LEAD_STATUSES } from '@kraven/config';
import { errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
import type { LeadRecord } from '@kraven/types';
import type { LeadFilterInput, LeadInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Columns3, Plus, Search, Table as TableIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Card,
  DataTable,
  type DataTableColumn,
  EmptyState,
  Input,
  LeadStatusBadge,
  LoadingState,
  PageHeader,
  Select
} from '../../components/ui';
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
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: (typeof LEAD_STATUSES)[number] }) =>
      updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      toast.success('Lead status updated');
    },
    onError: toastError('Could not update lead status')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      toast.success('Lead deleted');
    },
    onError: toastError('Could not delete lead')
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

  const columns: DataTableColumn<LeadRecord>[] = [
    {
      key: 'company',
      header: 'Company & Contact',
      render: (lead) => (
        <Link to={`/leads/${lead.id}`} className="block">
          <div className="font-semibold text-ink-900 transition-colors hover:text-olive-700">
            {lead.companyName}
          </div>
          <div className="text-xs font-normal text-ink-500">{lead.name}</div>
        </Link>
      )
    },
    { key: 'status', header: 'Status', render: (lead) => <LeadStatusBadge status={lead.status} /> },
    {
      key: 'value',
      header: 'Est. Value',
      className: 'font-medium text-ink-900',
      render: (lead) => formatCurrency(lead.estimatedValue)
    },
    {
      key: 'assigned',
      header: 'Assigned',
      className: 'text-xs text-ink-700',
      render: (lead) => lead.assignedPerson || '-'
    },
    {
      key: 'followUp',
      header: 'Next Follow-Up',
      className: 'text-xs text-ink-700',
      render: (lead) => formatDate(lead.nextFollowUpDate)
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (lead) => (
        <button
          type="button"
          aria-label={`Delete lead for ${lead.companyName}`}
          title="Delete lead"
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-clay-sm border border-white/80 text-ink-500 hover:text-danger-fg hover:shadow-clay-hover transition-all active:scale-[0.96]"
          onClick={() => {
            if (window.confirm(`Delete lead for ${lead.companyName}?`)) {
              deleteMutation.mutate(lead.id);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )
    }
  ];

  return (
    <section className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Pipeline & CRM"
        title="Leads"
        subtitle="Track inquiries, active negotiations, and conversion pipeline progress."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn clay-btn--primary inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-body font-medium shadow-clay-green transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New lead</span>
          </button>
        }
      />

      {/* Filter Toolbar Card */}
      <Card className="grid gap-3 p-4 sm:gap-4 md:grid-cols-6">
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
        <div className="flex h-11 items-center rounded-pill bg-surface-soft p-1 border border-[rgba(120,110,90,0.16)] shadow-clay-inset-sm">
          <button
            className={cn(
              'h-full flex-1 rounded-pill inline-flex items-center justify-center gap-1.5 text-xs font-body font-medium transition-all duration-200',
              viewMode === 'table'
                ? 'bg-white text-ink-900 shadow-clay-sm'
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
                ? 'bg-white text-ink-900 shadow-clay-sm'
                : 'text-ink-500 hover:text-ink-900'
            )}
            type="button"
            onClick={() => setViewMode('kanban')}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Board</span>
          </button>
        </div>
      </Card>

      {/* Main Content Area */}
      {leadsQuery.isLoading ? (
        <Card className="p-12">
          <LoadingState label="Loading leads..." />
        </Card>
      ) : leadsQuery.isError ? (
        <Card className="p-8 text-center font-body text-sm text-danger-fg">
          Unable to load leads: {errorMessage(leadsQuery.error)}
          <button type="button" className="ml-3 underline" onClick={() => leadsQuery.refetch()}>
            Retry
          </button>
        </Card>
      ) : leads.length === 0 ? (
        <Card>
          <EmptyState title="No leads match the current view. Try adjusting filters or create a new lead." />
        </Card>
      ) : viewMode === 'kanban' ? (
        <LeadKanbanBoard
          leads={leads}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        />
      ) : (
        <Card padded={false}>
          <DataTable columns={columns} rows={leads} rowKey={(lead) => lead.id} />
        </Card>
      )}

      <LeadFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateLead}
      />
    </section>
  );
}
