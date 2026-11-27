import type { DocumentStatus } from '@kraven/types';
import { cn } from '../../lib/utils';

const documentStatusClassName: Record<DocumentStatus, string> = {
  Draft: 'border-white/20 text-white',
  Sent: 'border-sky-300/40 text-sky-200',
  Viewed: 'border-violet-300/40 text-violet-200',
  Signed: 'border-emerald-300/40 text-emerald-200'
};

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded border bg-black px-2 text-xs font-medium',
        documentStatusClassName[status],
        className
      )}
    >
      {status}
    </span>
  );
}

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const steps: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60]
];

/** "3 hours ago", "yesterday", "just now". */
export function relativeTime(value: string, now = Date.now()) {
  const seconds = (new Date(value).getTime() - now) / 1000;
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
