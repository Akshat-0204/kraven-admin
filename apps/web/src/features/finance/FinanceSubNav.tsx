import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

const items = [
  { to: '/finance', label: 'Overview', id: 'overview' },
  { to: '/finance/invoices', label: 'Invoices & Payments', id: 'invoices' },
  { to: '/finance/expenses', label: 'Expenses', id: 'expenses' }
] as const;

export function FinanceSubNav({ active }: { active: (typeof items)[number]['id'] }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[rgba(120,110,90,0.16)] pb-4">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className={cn(
            'rounded-pill px-4 py-1.5 font-body text-xs transition-all',
            item.id === active
              ? 'bg-ink-900 font-semibold text-white shadow-clay-sm'
              : 'bg-surface font-medium text-ink-700 shadow-clay-sm hover:bg-surface-soft hover:text-ink-900'
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
