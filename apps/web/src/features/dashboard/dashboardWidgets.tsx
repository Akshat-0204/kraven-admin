import { useQuery } from '@tanstack/react-query';
import type { DashboardAlert, DashboardSummary, WaitingOnClient } from '@kraven/types';
import type React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, EmptyState, LoadingState, PageHeader, StatCard } from '../../components/ui';
import { dashboardQueryKeys, getDashboardSummary } from './dashboardApi';

export const leadStatusColors: Record<string, string> = {
  New: '#64748b',
  Contacted: '#06b6d4',
  Qualified: '#3b82f6',
  'Proposal Sent': '#8b5cf6',
  Negotiation: '#f59e0b',
  Won: '#10b981',
  Lost: '#ef4444'
};

export const projectStatusColors: Record<string, string> = {
  'Not Started': '#64748b',
  'In Progress': '#3b82f6',
  'Client Review': '#f59e0b',
  'On Hold': '#ec4899',
  Completed: '#10b981',
  Cancelled: '#ef4444'
};

export const defaultPalette = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];

export const chartTooltipStyle = {
  background: '#FFFFFF',
  border: '1px solid #F1E7D3',
  borderRadius: '12px',
  color: '#1C1F21',
  boxShadow: '0 4px 12px rgba(28, 31, 33, 0.08)'
};

/** Shared recharts colors tuned for the light clay surface. */
export const chartGridColor = '#E7DCC4';
export const chartAxisColor = '#7A7F82';
export const chartSliceStroke = '#FFFFFF';

/** Both workspace dashboards read the same summary endpoint and share its cache entry. */
export function DashboardSummaryGate({ children }: { children: (dashboard: DashboardSummary) => React.ReactNode }) {
  const dashboardQuery = useQuery({
    queryKey: dashboardQueryKeys.summary,
    queryFn: getDashboardSummary
  });

  if (dashboardQuery.isLoading) {
    return (
      <Card>
        <LoadingState label="Loading dashboard..." />
      </Card>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Card className="bg-danger-bg text-sm text-danger-fg">
        Unable to load dashboard.
      </Card>
    );
  }

  return <>{children(dashboardQuery.data)}</>;
}

export function DashboardHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <PageHeader eyebrow={eyebrow} title={title} />;
}

export function AlertsPanel({ title, alerts, emptyText }: { title: string; alerts: DashboardAlert[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      {alerts.length === 0 ? (
        <EmptyState title={emptyText} className="py-6" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              to={alert.href}
              className="rounded-card bg-sand-200/40 p-3 shadow-clay-inset-sm transition-all hover:-translate-y-0.5 hover:bg-sand-200/70"
            >
              <div className="font-body text-sm font-medium text-ink-900">{alert.title}</div>
              <div className="mt-1 font-body text-xs text-ink-500">{alert.description}</div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export function Metric({ label, value, colorClass }: { label: string; value: string | number; colorClass?: string }) {
  return <StatCard label={label} value={<span className={colorClass}>{value}</span>} />;
}

export function Row({ label, value, dotColor }: { label: string; value: string | number; dotColor?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-300/40 pb-2 font-body last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-ink-500">
        {dotColor ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} /> : null}
        {label}
      </span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}

export function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      {children}
    </Card>
  );
}

export function WaitingOnClientCard({ data }: { data: WaitingOnClient }) {
  const groups = [
    { label: 'Unsigned documents', items: data.unsignedDocuments },
    { label: 'Unpaid items', items: data.unpaidItems },
    { label: 'Overdue invoices', items: data.overdueInvoices }
  ];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Card>
      <CardHeader title="Waiting on client" />
      {total === 0 ? (
        <EmptyState title="Nothing is waiting on a client." className="py-6" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 font-body text-xs text-ink-500">
                {group.label} ({group.items.length})
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="block rounded-card bg-sand-200/40 p-2.5 text-sm shadow-clay-inset-sm transition-all hover:-translate-y-0.5 hover:bg-sand-200/70"
                    >
                      <div className="font-body font-medium text-ink-900">{item.title}</div>
                      <div className="font-body text-xs text-ink-500">
                        {item.clientName}
                        {item.detail ? ` · ${item.detail}` : ''}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
