import { cn } from '../../lib/utils';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const boundedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('h-2 w-full overflow-hidden rounded bg-white/10', className)}>
      <div className="h-full bg-white" style={{ width: `${boundedValue}%` }} />
    </div>
  );
}
