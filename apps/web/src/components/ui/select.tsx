import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          'clay-input h-11 w-full appearance-none rounded-md border-none bg-surface-soft pl-4 pr-10 text-sm font-body text-ink-900 shadow-clay-inset transition-colors focus:bg-surface focus:outline-2 focus:outline-offset-2 focus:outline-olive-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
        aria-hidden="true"
      />
    </div>
  )
);

Select.displayName = 'Select';

