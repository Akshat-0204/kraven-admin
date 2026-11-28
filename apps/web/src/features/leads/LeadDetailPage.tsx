import type { LeadInput } from '@kraven/validation';
import { errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Pencil, RefreshCcw, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CardHeader, EmptyState, LeadStatusBadge, LoadingState, PageHeader } from '../../components/ui';
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
    }
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
    onError: toastError('Could not convert lead')
  });

  if (leadQuery.isLoading) {
    return (
      <Card className="p-12">
        <LoadingState label="Loading lead details..." />
      </Card>
    );
  }

  if (leadQuery.isError || !leadQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild className="h-9 gap-1.5 text-xs">
          <Link to="/leads">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to leads</span>
          </Link>
        </Button>
        <Card className="p-8 text-center font-body text-sm text-danger-fg">
          Unable to load lead: {errorMessage(leadQuery.error, 'Lead not found')}
        </Card>
      </div>
    );
  }

  const { lead, activity } = leadQuery.data;

  return (
    <section className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-body font-medium normal-case tracking-normal text-ink-500 hover:text-olive-700 transition-colors"
            to="/leads"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to leads</span>
          </Link>
        }
        title={lead.companyName}
        subtitle={`Primary Contact: ${lead.name}`}
        actions={
          <>
            <LeadStatusBadge status={lead.status} />
            {lead.status === 'Won' && !lead.convertedClient ? (
              <button
                type="button"
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="clay-btn clay-btn--primary inline-flex h-10 items-center gap-2 rounded-pill px-4 text-xs font-body font-medium shadow-clay-green disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                <span>{convertMutation.isPending ? 'Converting...' : 'Convert to Client'}</span>
              </button>
            ) : null}
            <Button type="button" onClick={() => setIsEditOpen(true)} className="gap-1.5 text-xs hover:text-olive-700">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Edit Lead</span>
            </Button>
          </>
        }
      />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Lead Information Card */}
        <Card className="lg:col-span-2 space-y-6">
          <CardHeader
            title="Lead Information"
            subtitle="Core contact details, pipeline attributes, and value"
            className="mb-0 border-b border-[rgba(120,110,90,0.12)] pb-3"
          />

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
              <dd className="mt-1 font-body font-semibold text-olive-900 text-base">
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
        </Card>

        {/* Right: Activity Feed Card */}
        <Card className="space-y-4">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-olive-700" />
                Activity History
              </span>
            }
            className="mb-0 border-b border-[rgba(120,110,90,0.12)] pb-3"
          />

          {activity.length === 0 ? (
            <EmptyState title="No activity recorded yet." className="py-6" />
          ) : (
            <ol className="space-y-4 pt-1">
              {activity.map((item) => (
                <li key={item.id} className="relative pl-4 border-l-2 border-olive-500/50 space-y-1">
                  <div className="font-mono text-[11px] text-ink-500">{formatDate(item.timestamp)}</div>
                  <div className="font-body text-xs text-ink-900 leading-relaxed font-medium">
                    {item.description}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
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
