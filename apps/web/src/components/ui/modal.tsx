import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

const sizeClass = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' } as const;

export function Modal({ open, onClose, title, description, footer, size = 'md', children, className }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(235, 233, 227, 0.7)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'clay-card w-full max-h-[90vh] overflow-y-auto rounded-xl p-6 sm:p-8 border border-white/90 shadow-clay-floating bg-surface animate-in fade-in zoom-in-95 duration-150',
          sizeClass[size],
          className
        )}
      >
        <div className="mb-6 flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold text-ink-900">
              {title}
            </h2>
            {description ? <p className="font-body text-xs text-ink-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-clay-sm border border-white/80 text-ink-500 transition-all hover:text-ink-900 hover:shadow-clay-hover"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
        {footer ? (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[rgba(120,110,90,0.12)] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
