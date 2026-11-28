import type { InvoicePaymentStatus, LeadStatus, ProjectStatus } from '@kraven/types';
import { cn } from '../../lib/utils';

const leadStatusClassName: Record<LeadStatus, string> = {
  New: 'bg-sand-200 text-ink-800 border-[rgba(120,110,90,0.18)]',
  Contacted: 'bg-[var(--info-bg)] text-[var(--info-fg)] border-blue-200/60',
  Meeting: 'bg-[var(--warning-bg)] text-[var(--warning-fg)] border-amber-200/60',
  'Proposal Sent': 'bg-[#EDE9FE] text-[#5B21B6] border-purple-200/60',
  Negotiation: 'bg-[#FFEDD5] text-[#9A3412] border-orange-200/60',
  Won: 'bg-[var(--success-bg)] text-[var(--success-fg)] border-emerald-200/60 font-semibold',
  Lost: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-red-200/60'
};

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        'clay-chip inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-body font-medium shadow-[var(--clay-raised-sm)] border',
        leadStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const projectStatusClassName: Record<ProjectStatus, string> = {
  'Not Started': 'bg-sand-200 text-ink-800 border-[rgba(120,110,90,0.18)]',
  'In Progress': 'bg-[var(--info-bg)] text-[var(--info-fg)] border-blue-200/60',
  'On Hold': 'bg-[var(--warning-bg)] text-[var(--warning-fg)] border-amber-200/60',
  'Client Review': 'bg-[#EDE9FE] text-[#5B21B6] border-purple-200/60',
  Completed: 'bg-[var(--success-bg)] text-[var(--success-fg)] border-emerald-200/60 font-semibold',
  Cancelled: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-red-200/60'
};

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span
      className={cn(
        'clay-chip inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-body font-medium shadow-[var(--clay-raised-sm)] border',
        projectStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const invoiceStatusClassName: Record<InvoicePaymentStatus, string> = {
  Pending: 'bg-[var(--warning-bg)] text-[var(--warning-fg)] border-amber-200/60',
  'Partially Paid': 'bg-[var(--info-bg)] text-[var(--info-fg)] border-blue-200/60',
  Paid: 'bg-[var(--success-bg)] text-[var(--success-fg)] border-emerald-200/60 font-semibold',
  Overdue: 'bg-[var(--danger-bg)] text-[var(--danger-fg)] border-red-200/60 font-semibold'
};

export function InvoiceStatusBadge({ status, className }: { status: InvoicePaymentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'clay-chip inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-body font-medium shadow-[var(--clay-raised-sm)] border',
        invoiceStatusClassName[status] || 'bg-sand-200 text-ink-800 border-[rgba(120,110,90,0.18)]',
        className
      )}
    >
      {status}
    </span>
  );
}

