import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-sm bg-sand-200', className)} {...props} />;
}

export function LoadingState({ label = 'Loading...', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-700 border-t-transparent" />
      <span className="font-body text-sm text-ink-500">{label}</span>
    </div>
  );
}
