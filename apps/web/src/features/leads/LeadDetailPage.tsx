import type { LeadInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, RefreshCcw } from 'lucide-react';
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
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading lead...</div>;
  }

  if (leadQuery.isError || !leadQuery.data) {
    return (
      <div className="space-y-4">
        <Button className="bg-transparent text-white hover:bg-white/10" onClick={() => navigate('/leads')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to leads
        </Button>
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load lead.
        </div>
      </div>
    );
  }

  const { lead, activity } = leadQuery.data;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Link className="inline-flex items-center text-sm text-muted hover:text-white" to="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Leads
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{lead.companyName}</h1>
            <p className="mt-1 text-sm text-muted">{lead.name}</p>
          </div>
          <LeadStatusBadge status={lead.status} />
        </div>

        <div className="flex gap-2">
          {lead.status === 'Won' && !lead.convertedClient ? (
            <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
              <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Convert to Client
            </Button>
          ) : null}
          <Button className="bg-transparent text-white hover:bg-white/10" onClick={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded border border-border bg-panel p-4 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Lead information</h2>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-muted">Email</dt>
              <dd className="mt-1">{lead.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Phone</dt>
              <dd className="mt-1">{lead.phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Source</dt>
              <dd className="mt-1">{lead.leadSource || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Service</dt>
              <dd className="mt-1">{lead.serviceInterested || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Estimated value</dt>
              <dd className="mt-1">{formatCurrency(lead.estimatedValue)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Assigned</dt>
              <dd className="mt-1">{lead.assignedPerson || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Last contacted</dt>
              <dd className="mt-1">{formatDate(lead.lastContactedDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">Next follow-up</dt>
              <dd className="mt-1">{formatDate(lead.nextFollowUpDate)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs uppercase text-muted">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap">{lead.notes || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded border border-border bg-panel p-4">
          <h2 className="mb-4 text-sm font-semibold">Activity</h2>
          {activity.length === 0 ? (
            <div className="rounded border border-dashed border-border p-4 text-sm text-muted">
              No activity recorded.
            </div>
          ) : (
            <ol className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="border-l border-border pl-3">
                  <div className="text-xs text-muted">{formatDate(item.timestamp)}</div>
                  <div className="mt-1 text-sm">{item.description}</div>
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
