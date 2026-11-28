import { cn } from '../../lib/utils';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const boundedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-olive-100 shadow-clay-inset', className)}>
      <div
        className="h-full rounded-full bg-grad-olive transition-all duration-300"
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
}
