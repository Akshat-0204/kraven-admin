import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Card } from './card';

export function IconCircle({
  variant = 'default',
  children,
  className
}: {
  variant?: 'default' | 'sand';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-clay-sm',
        variant === 'sand' ? 'bg-sand-200 text-ink-700' : 'bg-olive-100 text-olive-700',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface Trend {
  direction: 'up' | 'down';
  label: string;
}

export function TrendChip({ direction, label, className }: Trend & { className?: string }) {
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-body text-xs font-medium',
        direction === 'up' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg',
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  trend?: Trend;
  hint?: ReactNode;
  variant?: 'default' | 'hero';
  className?: string;
}

export function StatCard({ label, value, icon, trend, hint, variant = 'default', className }: StatCardProps) {
  const hero = variant === 'hero';
  return (
    <Card variant={variant} className={cn('p-5', className)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'font-display text-xs font-semibold uppercase tracking-wider',
            hero ? 'text-white/80' : 'text-ink-500'
          )}
        >
          {label}
        </span>
        {icon ? (
          <IconCircle variant={hero ? 'default' : 'sand'} className={hero ? 'bg-white/20 text-white' : undefined}>
            {icon}
          </IconCircle>
        ) : null}
      </div>
      <div
        className={cn('mt-4 font-display text-2xl font-bold tracking-tight', hero ? 'text-white' : 'text-ink-900')}
      >
        {value}
      </div>
      {trend || hint ? (
        <div className="mt-1 flex items-center gap-2">
          {trend ? <TrendChip {...trend} /> : null}
          {hint ? <span className={cn('text-xs font-body', hero ? 'text-white/80' : 'text-ink-500')}>{hint}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}
