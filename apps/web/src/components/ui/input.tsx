import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  startIcon?: ReactNode;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, startIcon, icon, ...props }, ref) => {
    const leftIcon = startIcon || icon;

    if (leftIcon) {
      return (
        <div className="relative w-full flex items-center">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-ink-500 z-10">
            {leftIcon}
          </div>
          <input
            ref={ref}
            className={cn(
              'clay-input text-sm !pl-11',
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          'clay-input text-sm',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

