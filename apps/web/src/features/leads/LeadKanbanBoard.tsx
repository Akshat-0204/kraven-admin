import { LEAD_STATUSES } from '@kraven/config';
import type { LeadRecord, LeadStatus } from '@kraven/types';
import { Link } from 'react-router-dom';
import { LeadStatusBadge } from '../../components/ui/statusBadge';
import { formatCurrency, formatDate, leadInitials } from './leadFormat';

interface LeadKanbanBoardProps {
  leads: LeadRecord[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

export function LeadKanbanBoard({ leads, onStatusChange }: LeadKanbanBoardProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-7">
      {LEAD_STATUSES.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status);

        return (
          <section
            key={status}
            className="min-h-56 rounded border border-border bg-panel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const leadId = event.dataTransfer.getData('text/plain');

              if (leadId) {
                onStatusChange(leadId, status);
              }
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <LeadStatusBadge status={status} />
              <span className="text-xs text-muted">{columnLeads.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {columnLeads.length === 0 ? (
                <div className="rounded border border-dashed border-border p-3 text-xs text-muted">No leads</div>
              ) : (
                columnLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', lead.id)}
                    className="block rounded border border-border bg-black p-3 hover:border-white/50"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded border border-border text-xs">
                        {leadInitials(lead)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{lead.companyName}</div>
                        <div className="truncate text-xs text-muted">{lead.name}</div>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-muted">
                      <div>{formatCurrency(lead.estimatedValue)}</div>
                      <div>Follow-up {formatDate(lead.nextFollowUpDate)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
