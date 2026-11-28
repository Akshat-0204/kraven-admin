import type { LeadInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Pencil, RefreshCcw, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { LeadStatusBadge } from '../../components/ui/statusBadge';
import { clientQueryKeys } from '../clients/clientApi';
import { convertLead, getLead, leadQueryKeys, updateLead } from './leadApi';
import { formatCurrency, formatDate } from './leadFormat';
import { LeadFormModal } from './LeadFormModal';

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const leadId = id ?? '';
  const leadQuery = useQuery({
    queryKey: leadQueryKeys.detail(leadId),
    queryFn: () => getLead(leadId),
    enabled: Boolean(leadId)
  });

  const updateMutation = useMutation({
    mutationFn: (input: LeadInput) => updateLead(leadId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(leadId) });
      toast.success('Lead updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const convertMutation = useMutation({
    mutationFn: () => convertLead(leadId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: leadQueryKeys.detail(leadId) });
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success('Lead converted to client');

      if (result.client?.id) {
        navigate(`/clients/${result.client.id}`);
      }
    },
    onError: (error) => toast.error(error.message)
  });

  if (leadQuery.isLoading) {
    return (
      <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
        <p>Loading lead details...</p>
      </div>
    );
  }

  if (leadQuery.isError || !leadQuery.data) {
    return (
      <div className="space-y-4">
        <Link
          to="/leads"
          className="clay-btn clay-btn--secondary inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to leads</span>
        </Link>
        <div className="clay-card p-8 text-center font-body text-sm text-danger-fg">
          Unable to load lead. Please check the URL or return to leads list.
        </div>
      </div>
    );
  }

  const { lead, activity } = leadQuery.data;

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-ink-500 hover:text-olive-700 transition-colors"
            to="/leads"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to leads</span>
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
                {lead.companyName}
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="font-body text-sm text-ink-500">Primary Contact: {lead.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lead.status === 'Won' && !lead.convertedClient ? (
            <button
              type="button"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              className="clay-btn clay-btn--primary inline-flex h-10 items-center gap-2 rounded-pill px-4 text-xs font-body font-medium shadow-[var(--clay-green)] disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              <span>{convertMutation.isPending ? 'Converting...' : 'Convert to Client'}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="clay-btn clay-btn--secondary inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit Lead</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Lead Information Card */}
        <div className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface lg:col-span-2 space-y-6">
          <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
            <h2 className="font-display text-base font-bold text-ink-900">Lead Information</h2>
            <p className="font-body text-xs text-ink-500">Core contact details, pipeline attributes, and value</p>
          </div>

          <dl className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Email Address</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{lead.email || '-'}</dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Phone Number</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{lead.phone || '-'}</dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Lead Source</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{lead.leadSource || '-'}</dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Service Interested</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{lead.serviceInterested || '-'}</dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Estimated Value</dt>
              <dd className="mt-1 font-body font-semibold text-olive-800 text-base">
                {formatCurrency(lead.estimatedValue)}
              </dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Assigned Person</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{lead.assignedPerson || '-'}</dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Last Contacted</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{formatDate(lead.lastContactedDate)}</dd>
            </div>
            <div>
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Next Follow-Up</dt>
              <dd className="mt-1 font-body font-medium text-ink-900">{formatDate(lead.nextFollowUpDate)}</dd>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-[rgba(120,110,90,0.1)]">
              <dt className="font-display text-xs uppercase tracking-wider text-ink-500">Notes & Brief</dt>
              <dd className="mt-1.5 whitespace-pre-wrap font-body text-sm text-ink-700 leading-relaxed bg-surface-soft p-4 rounded-md border border-[rgba(120,110,90,0.12)]">
                {lead.notes || 'No notes added.'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: Activity Feed Card */}
        <div className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
          <div className="border-b border-[rgba(120,110,90,0.12)] pb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-olive-700" />
            <h2 className="font-display text-base font-bold text-ink-900">Activity History</h2>
          </div>

          {activity.length === 0 ? (
            <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center font-body text-xs text-ink-500">
              No activity recorded yet.
            </div>
          ) : (
            <ol className="space-y-4 pt-1">
              {activity.map((item) => (
                <li key={item.id} className="relative pl-4 border-l-2 border-olive-500/50 space-y-1">
                  <div className="font-mono text-[11px] text-ink-500">{formatDate(item.timestamp)}</div>
                  <div className="font-body text-xs text-ink-800 leading-relaxed font-medium">
                    {item.description}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <LeadFormModal
        lead={lead}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={(input) => updateMutation.mutateAsync(input).then(() => undefined)}
      />
    </section>
  );
}
