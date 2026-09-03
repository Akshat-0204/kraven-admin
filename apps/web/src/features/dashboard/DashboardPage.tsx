import { useQuery } from '@tanstack/react-query';
import type React from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ProgressBar } from '../../components/ui/progressBar';
import { dashboardQueryKeys, getDashboardSummary } from './dashboardApi';
import { formatCurrency } from '../finance/financeFormat';

const leadStatusColors: Record<string, string> = {
  New: '#64748b',
  Contacted: '#06b6d4',
  Qualified: '#3b82f6',
  'Proposal Sent': '#8b5cf6',
  Negotiation: '#f59e0b',
  Won: '#10b981',
  Lost: '#ef4444'
};

const projectStatusColors: Record<string, string> = {
  'Not Started': '#64748b',
  'In Progress': '#3b82f6',
  'Client Review': '#f59e0b',
  'On Hold': '#ec4899',
  Completed: '#10b981',
  Cancelled: '#ef4444'
};

const defaultPalette = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];

export function DashboardPage() {
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

  const dashboard = dashboardQuery.data;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Agency state</p>
        <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Leads" value={dashboard.leads.total} colorClass="text-sky-400" />
        <Metric label="Conversion" value={`${dashboard.leads.conversionRate}%`} colorClass="text-emerald-400" />
        <Metric label="Active projects" value={dashboard.projects.totalActive} colorClass="text-blue-400" />
        <Metric label="Overall progress" value={`${dashboard.projects.overallProgress}%`} colorClass="text-indigo-400" />
        <Metric label="Received" value={formatCurrency(dashboard.finance.received)} colorClass="text-emerald-400" />
        <Metric label="Profit" value={formatCurrency(dashboard.finance.profit)} colorClass="text-violet-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded border border-border bg-panel p-4">
          <h2 className="mb-4 text-sm font-semibold">Leads</h2>
          <div className="grid gap-3 text-sm">
            <Row label="New" value={dashboard.leads.new} dotColor="#64748b" />
            <Row label="In progress" value={dashboard.leads.inProgress} dotColor="#3b82f6" />
            <Row label="Won" value={dashboard.leads.won} dotColor="#10b981" />
            <Row label="Lost" value={dashboard.leads.lost} dotColor="#ef4444" />
          </div>
        </section>

        <section className="rounded border border-border bg-panel p-4">
          <h2 className="mb-4 text-sm font-semibold">Projects</h2>
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Overall progress</span>
              <span className="font-medium text-blue-400">{dashboard.projects.overallProgress}%</span>
            </div>
            <ProgressBar value={dashboard.projects.overallProgress} />
          </div>
          <div className="grid gap-3 text-sm">
            <Row label="In progress" value={dashboard.projects.inProgress} dotColor="#3b82f6" />
            <Row label="On hold" value={dashboard.projects.onHold} dotColor="#ec4899" />
            <Row label="Completed" value={dashboard.projects.completed} dotColor="#10b981" />
            <Row label="Approaching deadline" value={dashboard.projects.approachingDeadline} dotColor="#f59e0b" />
          </div>
        </section>

        <section className="rounded border border-border bg-panel p-4">
          <h2 className="mb-4 text-sm font-semibold">Finance</h2>
          <div className="grid gap-3 text-sm">
            <Row label="Revenue" value={formatCurrency(dashboard.finance.revenue)} dotColor="#6366f1" />
            <Row label="Received" value={formatCurrency(dashboard.finance.received)} dotColor="#10b981" />
            <Row label="Pending" value={formatCurrency(dashboard.finance.pending)} dotColor="#f59e0b" />
            <Row label="Overdue" value={formatCurrency(dashboard.finance.overdue)} dotColor="#ef4444" />
            <Row label="Expenses" value={formatCurrency(dashboard.finance.expenses)} dotColor="#f43f5e" />
            <Row label="Profit" value={formatCurrency(dashboard.finance.profit)} dotColor="#8b5cf6" />
          </div>
        </section>
      </div>

      <section className="rounded border border-border bg-panel p-4">
        <h2 className="mb-4 text-sm font-semibold">Attention</h2>
        {dashboard.alerts.length === 0 ? (
          <div className="rounded border border-dashed border-border p-4 text-sm text-muted">
            Nothing needs attention right now.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {dashboard.alerts.map((alert) => (
              <Link key={alert.id} to={alert.href} className="rounded border border-border bg-black p-3 transition hover:border-indigo-500/50">
                <div className="text-sm font-medium text-white">{alert.title}</div>
                <div className="mt-1 text-xs text-muted">{alert.description}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Revenue over time">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dashboard.revenueOverTime}>
              <defs>
                <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} />
              <YAxis stroke="#a3a3a3" fontSize={11} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px' }}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
              <Area
                name="Invoiced"
                type="monotone"
                dataKey="invoiced"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorInvoiced)"
              />
              <Area
                name="Received"
                type="monotone"
                dataKey="received"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorReceived)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Leads over time">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dashboard.leads.overTime}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} />
              <YAxis stroke="#a3a3a3" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px' }}
                formatter={(val: number) => [val, 'Leads']}
              />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
              <Bar name="New Leads" dataKey="count" fill="url(#colorLeads)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Lead status distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dashboard.leads.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                label={({ name, percent }) => (percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : '')}
              >
                {dashboard.leads.byStatus.map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={leadStatusColors[entry.status] ?? defaultPalette[index % defaultPalette.length]}
                    stroke="#0f0f0f"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px' }}
                formatter={(val: number, name: string) => [val, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Project status distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={dashboard.projects.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={3}
                label={({ name, percent }) => (percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : '')}
              >
                {dashboard.projects.byStatus.map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={projectStatusColors[entry.status] ?? defaultPalette[index % defaultPalette.length]}
                    stroke="#0f0f0f"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px' }}
                formatter={(val: number, name: string) => [val, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Income vs. expenses">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dashboard.revenueOverTime}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} />
              <YAxis stroke="#a3a3a3" fontSize={11} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: '6px' }}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
              <Bar name="Income (Received)" dataKey="received" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar name="Expenses" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </section>
  );
}

function Metric({ label, value, colorClass }: { label: string; value: string | number; colorClass?: string }) {
  return (
    <div className="rounded border border-border bg-panel p-4">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${colorClass ?? 'text-foreground'}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, dotColor }: { label: string; value: string | number; dotColor?: string }) {
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

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-border bg-panel p-4">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
