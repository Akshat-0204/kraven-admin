import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sand-200 text-ink-700 shadow-clay-sm">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1 max-w-sm font-body text-sm text-ink-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
