import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero';
  /** Set false to remove the default clay-card padding (e.g. for tables). */
  padded?: boolean;
}

export function Card({ variant = 'default', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn('clay-card', variant === 'hero' && 'clay-card--hero', !padded && 'p-0 overflow-hidden', className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
        {subtitle ? <p className="font-body text-xs text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
