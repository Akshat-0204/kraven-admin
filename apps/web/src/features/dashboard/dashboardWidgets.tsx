import { useQuery } from '@tanstack/react-query';
import type { DashboardAlert, DashboardSummary, WaitingOnClient } from '@kraven/types';
import type React from 'react';
import { Link } from 'react-router-dom';
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

export const chartTooltipStyle = { background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px' };

/** Both workspace dashboards read the same summary endpoint and share its cache entry. */
export function DashboardSummaryGate({ children }: { children: (dashboard: DashboardSummary) => React.ReactNode }) {
  const dashboardQuery = useQuery({
    queryKey: dashboardQueryKeys.summary,
    queryFn: getDashboardSummary
  });

  if (dashboardQuery.isLoading) {
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading dashboard...</div>;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
        Unable to load dashboard.
      </div>
    );
  }

  return <>{children(dashboardQuery.data)}</>;
}

export function DashboardHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
    </div>
  );
}

export function AlertsPanel({ title, alerts, emptyText }: { title: string; alerts: DashboardAlert[]; emptyText: string }) {
  return (
    <section className="rounded border border-border bg-panel p-4">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {alerts.length === 0 ? (
        <div className="rounded border border-dashed border-border p-4 text-sm text-muted">{emptyText}</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {alerts.map((alert) => (
            <Link key={alert.id} to={alert.href} className="rounded border border-border bg-black p-3 transition hover:border-indigo-500/50">
              <div className="text-sm font-medium text-white">{alert.title}</div>
              <div className="mt-1 text-xs text-muted">{alert.description}</div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function Metric({ label, value, colorClass }: { label: string; value: string | number; colorClass?: string }) {
  return (
    <div className="rounded border border-border bg-panel p-4">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${colorClass ?? 'text-foreground'}`}>{value}</div>
    </div>
  );
}

export function Row({ label, value, dotColor }: { label: string; value: string | number; dotColor?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted">
        {dotColor ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} /> : null}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-border bg-panel p-4">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
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
    <section className="rounded border border-border bg-panel p-4">
      <h2 className="mb-4 text-sm font-semibold">Waiting on client</h2>
      {total === 0 ? (
        <div className="rounded border border-dashed border-border p-4 text-sm text-muted">Nothing is waiting on a client.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-xs text-muted">
                {group.label} ({group.items.length})
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link to={item.href} className="block rounded border border-border bg-black p-2 text-sm hover:border-indigo-500/50">
                      <div className="font-medium text-white">{item.title}</div>
                      <div className="text-xs text-muted">
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
    </section>
  );
}
