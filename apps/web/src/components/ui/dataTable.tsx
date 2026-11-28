import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { EmptyState } from './emptyState';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm font-body', className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500',
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-4 text-ink-700', className)} {...props} />;
}

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty, className }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  }

  return (
    <Table className={className}>
      <thead className="border-b border-sand-300/40 bg-sand-100/50">
        <tr>
          {columns.map((column) => (
            <Th key={column.key} className={cn(alignClass[column.align ?? 'left'], column.className)}>
              {column.header}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-sand-300/30">
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('transition-colors hover:bg-sand-50/60', onRowClick && 'cursor-pointer')}
          >
            {columns.map((column) => (
              <Td key={column.key} className={cn(alignClass[column.align ?? 'left'], column.className)}>
                {column.render ? column.render(row) : ((row as unknown as Record<string, unknown>)[column.key] as ReactNode)}
              </Td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
