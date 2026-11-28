import type { DocumentStatus } from '@kraven/types';
import { cn } from '../../lib/utils';

const documentStatusClassName: Record<DocumentStatus, string> = {
  Draft: 'bg-sand-200 text-ink-700',
  Sent: 'bg-olive-100 text-olive-700',
  Viewed: 'bg-canvas-deep text-ink-900',
  Signed: 'bg-olive-100 text-olive-900'
};

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-pill px-2.5 font-body text-xs font-medium',
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
