import type { LeadStatus, ProjectStatus } from '@kraven/types';
import { cn } from '../../lib/utils';

const leadStatusClassName: Record<LeadStatus, string> = {
  New: 'border-white/20 text-white',
  Contacted: 'border-sky-300/40 text-sky-200',
  Meeting: 'border-amber-300/40 text-amber-200',
  'Proposal Sent': 'border-violet-300/40 text-violet-200',
  Negotiation: 'border-orange-300/40 text-orange-200',
  Won: 'border-emerald-300/40 text-emerald-200',
  Lost: 'border-red-300/40 text-red-200'
};

export function LeadStatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded border bg-black px-2 text-xs font-medium',
        leadStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const projectStatusClassName: Record<ProjectStatus, string> = {
  'Not Started': 'border-white/20 text-white',
  'In Progress': 'border-sky-300/40 text-sky-200',
  'On Hold': 'border-amber-300/40 text-amber-200',
  'Client Review': 'border-violet-300/40 text-violet-200',
  Completed: 'border-emerald-300/40 text-emerald-200',
  Cancelled: 'border-red-300/40 text-red-200'
};

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded border bg-black px-2 text-xs font-medium',
        projectStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}
