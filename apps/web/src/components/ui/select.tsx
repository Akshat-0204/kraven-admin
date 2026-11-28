import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Layout classes (width/flex sizing) belong on the wrapper, otherwise it stays full-width and squeezes siblings. */
const WRAPPER_CLASS =
  /^(?:[a-z]+:)*!?(?:w-|min-w-|max-w-|flex-|shrink|grow|basis-|self-|col-span|order-)/;

function splitClasses(className?: string) {
  const wrapper: string[] = [];
  const select: string[] = [];
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) {
    (WRAPPER_CLASS.test(token) ? wrapper : select).push(token);
  }
  return { wrapper: wrapper.join(' '), select: select.join(' ') };
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    const classes = splitClasses(className);
    return (
      <div className={cn('relative w-full', classes.wrapper)}>
        <select
          ref={ref}
          className={cn(
            'clay-input h-11 w-full appearance-none rounded-md border-none bg-surface-soft pl-4 pr-10 text-sm font-body text-ink-900 shadow-clay-inset transition-colors focus:bg-surface focus:outline-2 focus:outline-offset-2 focus:outline-olive-300 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            classes.select
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
    );
  }
);

Select.displayName = 'Select';
