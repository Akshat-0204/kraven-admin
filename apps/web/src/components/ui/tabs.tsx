import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: ReactNode;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  'aria-label'?: string;
  className?: string;
}

export function Tabs({ items, value, onChange, 'aria-label': ariaLabel, className }: TabsProps) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.id === value);
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    const target = items[next];
    if (target) {
      onChange(target.id);
      refs.current[next]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn('flex gap-1 overflow-x-auto border-b border-[rgba(120,110,90,0.16)]', className)}
    >
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${baseId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 font-body text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive-300',
              selected
                ? 'border-olive-700 text-olive-900'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="rounded-pill bg-sand-200 px-2 py-0.5 text-xs text-ink-700">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
