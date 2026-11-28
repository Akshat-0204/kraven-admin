import type { InvoicePaymentStatus, LeadStatus, ProjectStatus } from '@kraven/types';
import { cn } from '../../lib/utils';

const leadStatusClassName: Record<LeadStatus, string> = {
  New: 'bg-sand-200 text-ink-900 border-[rgba(120,110,90,0.18)]',
  Contacted: 'bg-olive-100 text-olive-700',
  Meeting: 'bg-warning-bg text-warning-fg',
  'Proposal Sent': 'bg-[#EDE9FE] text-[#5B21B6]',
  Negotiation: 'bg-[#FFEDD5] text-[#9A3412]',
  Won: 'bg-success-bg text-success-fg font-semibold',
  Lost: 'bg-danger-bg text-danger-fg'
};

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        'clay-chip inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-body font-medium shadow-clay-sm border',
        leadStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const projectStatusClassName: Record<ProjectStatus, string> = {
  'Not Started': 'bg-sand-200 text-ink-900 border-[rgba(120,110,90,0.18)]',
  'In Progress': 'bg-olive-100 text-olive-700',
  'On Hold': 'bg-warning-bg text-warning-fg',
  'Client Review': 'bg-[#EDE9FE] text-[#5B21B6]',
  Completed: 'bg-success-bg text-success-fg font-semibold',
  Cancelled: 'bg-danger-bg text-danger-fg'
};

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span
      className={cn(
        'clay-chip inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-body font-medium shadow-clay-sm border',
        projectStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const invoiceStatusClassName: Record<InvoicePaymentStatus, string> = {
  Pending: 'bg-warning-bg text-warning-fg',
  'Partially Paid': 'bg-olive-100 text-olive-700',
  Paid: 'bg-success-bg text-success-fg font-semibold',
  Overdue: 'bg-danger-bg text-danger-fg font-semibold'
};

export function InvoiceStatusBadge({ status, className }: { status: InvoicePaymentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'clay-chip inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-body font-medium shadow-clay-sm border',
        invoiceStatusClassName[status] || 'bg-sand-200 text-ink-900 border-[rgba(120,110,90,0.18)]',
        className
      )}
    >
      {status}
    </span>
  );
}

