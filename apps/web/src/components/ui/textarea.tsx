import { type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'clay-input min-h-24 w-full rounded-md border border-[rgba(120,110,90,0.18)] bg-surface-soft p-3 font-body text-sm text-ink-900 placeholder:text-ink-500 shadow-[var(--clay-inset-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--olive-300)] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
