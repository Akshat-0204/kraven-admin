import { Slot } from '@radix-ui/react-slot';
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={type}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-pill font-body font-medium text-sm px-4 bg-surface text-ink-900 shadow-clay-sm border border-white/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-clay-hover active:translate-y-0 active:scale-[0.98] active:shadow-clay-pressed focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--olive-300)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
