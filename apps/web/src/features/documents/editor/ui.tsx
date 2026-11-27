import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';

/** Light-theme icon button used by the editor toolbar and bars. `label` doubles as tooltip + aria-label. */
export function IconButton({
  label,
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded px-1.5 text-[#444746] transition-colors hover:bg-[#e9eef6] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        active && 'bg-[#d3e3fd] text-[#041e49] hover:bg-[#d3e3fd]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-[#c4c7c5]" />;
}

/** Closes on outside click / Escape. */
export function Popover({
  open,
  onClose,
  className,
  children
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    // Defer so the click that opened it does not close it.
    const id = setTimeout(() => document.addEventListener('mousedown', onPointer));
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-40 mt-1 rounded-lg border border-[#dadce0] bg-white py-1 text-sm text-[#1f1f1f] shadow-[0_4px_16px_rgba(60,64,67,.2)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  onSelect,
  disabled,
  children
}: {
  onSelect: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/** Centered modal with backdrop. */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl bg-white p-6 text-[#1f1f1f] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-3 space-y-2 text-sm text-[#444746]">{children}</div>
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function PillButton({
  variant = 'secondary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-[#0b57d0] text-white hover:bg-[#0842a0] disabled:hover:bg-[#0b57d0]',
        variant === 'secondary' && 'border border-[#747775] bg-white text-[#0b57d0] hover:bg-[#f0f4f9]',
        variant === 'ghost' && 'text-[#0b57d0] hover:bg-[#f0f4f9]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
