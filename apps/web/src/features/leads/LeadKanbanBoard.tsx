import { LEAD_STATUSES } from '@kraven/config';
import type { LeadRecord, LeadStatus } from '@kraven/types';
import { Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LeadStatusBadge } from '../../components/ui/statusBadge';
import { formatCurrency, formatDate, leadInitials } from './leadFormat';

interface LeadKanbanBoardProps {
  leads: LeadRecord[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

export function LeadKanbanBoard({ leads, onStatusChange }: LeadKanbanBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-7 overflow-x-auto pb-4">
      {LEAD_STATUSES.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status);

        return (
          <section
            key={status}
            className="min-h-[480px] min-w-[240px] xl:min-w-0 rounded-lg border border-[rgba(120,110,90,0.14)] bg-surface-soft/60 shadow-[var(--clay-inset-sm)] p-2.5 flex flex-col transition-colors"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const leadId = event.dataTransfer.getData('text/plain');
              if (leadId) {
                onStatusChange(leadId, status);
              }
            }}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] px-1 pb-2.5 pt-0.5 mb-2.5">
              <LeadStatusBadge status={status} />
              <span className="font-mono text-xs font-medium text-ink-600 bg-sand-200 px-2 py-0.5 rounded-pill border border-[rgba(120,110,90,0.12)]">
                {columnLeads.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 flex-1">
              {columnLeads.length === 0 ? (
                <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center text-xs text-ink-500 font-body">
                  No leads
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    to={`/leads/${lead.id}`}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', lead.id)}
                    className="block clay-card p-3.5 rounded-md shadow-[var(--clay-raised-sm)] hover:shadow-[var(--clay-hover)] transition-all hover:-translate-y-0.5 border border-white/90 bg-surface cursor-grab active:cursor-grabbing group"
                  >
                    <div className="mb-2.5 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-800 font-semibold text-xs shadow-[var(--clay-raised-sm)] border border-white/80">
                        {leadInitials(lead)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-ink-900 group-hover:text-olive-700 transition-colors">
                          {lead.companyName}
                        </div>
                        <div className="truncate text-[11px] text-ink-500">{lead.name}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-[rgba(120,110,90,0.1)] text-[11px] font-body text-ink-600">
                      <div className="flex items-center gap-1 font-medium text-ink-900">
                        <DollarSign className="h-3 w-3 text-olive-700 shrink-0" />
                        <span>{formatCurrency(lead.estimatedValue)}</span>
                      </div>
                      {lead.nextFollowUpDate && (
                        <div className="flex items-center gap-1 text-ink-500">
                          <Calendar className="h-3 w-3 text-ink-400 shrink-0" />
                          <span>{formatDate(lead.nextFollowUpDate)}</span>
                        </div>
                      )}
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
