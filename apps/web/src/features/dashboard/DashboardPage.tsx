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
import type { WaitingOnClient } from '@kraven/types';
import { formatCurrency } from '../finance/financeFormat';

const leadStatusColors: Record<string, string> = {
  New: '#7A7F82',
  Contacted: '#6F8F7B',
  Qualified: '#4A6B57',
  'Proposal Sent': '#9A7420',
  Negotiation: '#A9BFB0',
  Won: '#4A7A5A',
  Lost: '#C0504D'
};

const projectStatusColors: Record<string, string> = {
  'Not Started': '#7A7F82',
  'In Progress': '#4A6B57',
  'Client Review': '#9A7420',
  'On Hold': '#A9BFB0',
  Completed: '#4A7A5A',
  Cancelled: '#C0504D'
};

const defaultPalette = [
  '#4A6B57',
  '#6F8F7B',
  '#A9BFB0',
  '#F1E7D3',
  '#2F4A3A',
  '#4A7A5A',
  '#9A7420',
  '#C0504D'
];

const chartTooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  borderRadius: '12px',
  boxShadow: '0 10px 24px rgba(120, 110, 90, 0.18)',
  padding: '10px 14px',
  fontFamily: 'Poppins, system-ui, sans-serif',
  fontSize: '13px',
  color: '#1C1F21'
};

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: dashboardQueryKeys.summary,
    queryFn: getDashboardSummary
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="clay-card p-6 text-sm font-body text-ink-500 animate-pulse">
        Loading dashboard metrics...
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="clay-card p-6 text-sm font-body text-danger-fg bg-danger-bg border border-danger-fg/20">
        Unable to load dashboard. Please try refreshing the page.
      </div>
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="font-display text-xs font-normal uppercase tracking-[0.08em] text-olive-700">Agency state</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink-900">Dashboard</h1>
      </div>

      {/* Top 6 Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Metric label="Leads" value={dashboard.leads.total} />
        <Metric label="Conversion" value={`${dashboard.leads.conversionRate}%`} />
        <Metric label="Active projects" value={dashboard.projects.totalActive} />
        <Metric label="Overall progress" value={`${dashboard.projects.overallProgress}%`} />
        <Metric label="Received" value={formatCurrency(dashboard.finance.received)} />
        <Metric label="Profit" value={formatCurrency(dashboard.finance.profit)} isHero={true} />
      </div>

      {/* 3 Summary Cards (Leads, Projects, Finance) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="clay-card p-6">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-900">Leads</h2>
          <div className="grid gap-1 font-body text-sm">
            <Row label="New" value={dashboard.leads.new} dotColor="#7A7F82" />
            <Row label="In progress" value={dashboard.leads.inProgress} dotColor="#6F8F7B" />
            <Row label="Won" value={dashboard.leads.won} dotColor="#4A7A5A" />
            <Row label="Lost" value={dashboard.leads.lost} dotColor="#C0504D" />
          </div>
        </section>

        <section className="clay-card p-6">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-900">Projects</h2>
          <div className="mb-5 space-y-2.5">
            <div className="flex justify-between items-center text-sm font-body">
              <span className="text-ink-500">Overall progress</span>
              <span className="font-display font-bold text-olive-700">{dashboard.projects.overallProgress}%</span>
            </div>
            <ProgressBar value={dashboard.projects.overallProgress} />
          </div>
          <div className="grid gap-1 font-body text-sm">
            <Row label="In progress" value={dashboard.projects.inProgress} dotColor="#4A6B57" />
            <Row label="On hold" value={dashboard.projects.onHold} dotColor="#A9BFB0" />
            <Row label="Completed" value={dashboard.projects.completed} dotColor="#4A7A5A" />
            <Row label="Approaching deadline" value={dashboard.projects.approachingDeadline} dotColor="#9A7420" />
          </div>
        </section>

        <section className="clay-card p-6">
          <h2 className="mb-5 font-display text-xl font-bold text-ink-900">Finance</h2>
          <div className="grid gap-1 font-body text-sm">
            <Row label="Revenue" value={formatCurrency(dashboard.finance.revenue)} dotColor="#2F4A3A" />
            <Row label="Received" value={formatCurrency(dashboard.finance.received)} dotColor="#4A6B57" />
            <Row label="Pending" value={formatCurrency(dashboard.finance.pending)} dotColor="#9A7420" />
            <Row label="Overdue" value={formatCurrency(dashboard.finance.overdue)} dotColor="#C0504D" />
            <Row label="Expenses" value={formatCurrency(dashboard.finance.expenses)} dotColor="#7A7F82" />
            <Row label="Profit" value={formatCurrency(dashboard.finance.profit)} dotColor="#6F8F7B" />
          </div>
        </section>
      </div>

      {/* Waiting On Client Section */}
      <WaitingOnClientCard data={dashboard.waitingOnClient} />

      {/* Attention / Alerts Section */}
      <section className="clay-card p-6">
        <h2 className="mb-5 font-display text-xl font-bold text-ink-900">Attention</h2>
        {dashboard.alerts.length === 0 ? (
          <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center text-sm font-body text-ink-500 bg-surface-soft/60">
            Nothing needs attention right now.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.alerts.map((alert) => (
              <Link
                key={alert.id}
                to={alert.href}
                className="block rounded-md p-4 bg-surface-soft border border-white/80 shadow-[var(--clay-raised-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--clay-hover)]"
              >
                <div className="font-body text-sm font-semibold text-ink-900">{alert.title}</div>
                <div className="mt-1.5 font-body text-xs text-ink-500 leading-relaxed">{alert.description}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Revenue over time">
          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={dashboard.revenueOverTime}>
              <defs>
                <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4A6B57" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4A6B57" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6F8F7B" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6F8F7B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(120,110,90,0.12)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#7A7F82" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(120,110,90,0.16)' }} />
              <YAxis stroke="#7A7F82" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(120,110,90,0.16)' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontFamily: 'Poppins, system-ui, sans-serif', color: '#7A7F82' }} />
              <Area
                name="Invoiced"
                type="monotone"
                dataKey="invoiced"
                stroke="#4A6B57"
                strokeWidth={2.5}
                fill="url(#colorInvoiced)"
              />
              <Area
                name="Received"
                type="monotone"
                dataKey="received"
                stroke="#6F8F7B"
                strokeWidth={2.5}
                fill="url(#colorReceived)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Leads over time">
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={dashboard.leads.overTime}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4A6B57" />
                  <stop offset="100%" stopColor="#6F8F7B" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(120,110,90,0.12)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#7A7F82" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(120,110,90,0.16)' }} />
              <YAxis stroke="#7A7F82" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(120,110,90,0.16)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(val: number) => [val, 'Leads']}
              />
              <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontFamily: 'Poppins, system-ui, sans-serif', color: '#7A7F82' }} />
              <Bar name="New Leads" dataKey="count" fill="url(#colorLeads)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Lead status distribution">
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie
                data={dashboard.leads.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={4}
                label={({ name, percent }) => (percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : '')}
              >
                {dashboard.leads.byStatus.map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={leadStatusColors[entry.status] ?? defaultPalette[index % defaultPalette.length]}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(val: number, name: string) => [val, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontFamily: 'Poppins, system-ui, sans-serif', color: '#7A7F82' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Project status distribution">
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie
                data={dashboard.projects.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={4}
                label={({ name, percent }) => (percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : '')}
              >
                {dashboard.projects.byStatus.map((entry, index) => (
                  <Cell
                    key={entry.status}
                    fill={projectStatusColors[entry.status] ?? defaultPalette[index % defaultPalette.length]}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(val: number, name: string) => [val, name]}
              />
              <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontFamily: 'Poppins, system-ui, sans-serif', color: '#7A7F82' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Income vs. expenses">
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={dashboard.revenueOverTime}>
              <CartesianGrid stroke="rgba(120,110,90,0.12)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#7A7F82" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(120,110,90,0.16)' }} />
              <YAxis stroke="#7A7F82" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(120,110,90,0.16)' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontFamily: 'Poppins, system-ui, sans-serif', color: '#7A7F82' }} />
              <Bar name="Income (Received)" dataKey="received" fill="#4A6B57" radius={[6, 6, 0, 0]} />
              <Bar name="Expenses" dataKey="expenses" fill="#C0504D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </section>
  );
}

function Metric({ label, value, isHero = false }: { label: string; value: string | number; isHero?: boolean }) {
  if (isHero) {
    return (
      <div className="clay-card clay-card--hero p-5 flex flex-col justify-between">
        <div className="font-display text-xs font-normal uppercase tracking-[0.06em] text-white/80">{label}</div>
        <div className="mt-3 font-display text-3xl font-bold tracking-tight text-white">{value}</div>
      </div>
    );
  }

  return (
    <div className="clay-card p-5 flex flex-col justify-between">
      <div className="font-display text-xs font-normal uppercase tracking-[0.06em] text-ink-500">{label}</div>
      <div className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-900">{value}</div>
    </div>
  );
}

function Row({ label, value, dotColor }: { label: string; value: string | number; dotColor?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[rgba(120,110,90,0.12)] last:border-b-0">
      <span className="flex items-center gap-2.5 text-ink-700 font-body text-sm">
        {dotColor ? <span className="h-2.5 w-2.5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.12)] shrink-0" style={{ backgroundColor: dotColor }} /> : null}
        <span>{label}</span>
      </span>
      <span className="font-display font-bold text-sm text-ink-900">{value}</span>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="clay-card p-6">
      <h2 className="mb-6 font-display text-xl font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function WaitingOnClientCard({ data }: { data: WaitingOnClient }) {
  const groups = [
    { label: 'Unsigned documents', items: data.unsignedDocuments },
    { label: 'Unpaid items', items: data.unpaidItems },
    { label: 'Overdue invoices', items: data.overdueInvoices }
  ];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="clay-card p-6">
      <h2 className="mb-5 font-display text-xl font-bold text-ink-900">Waiting on client</h2>
      {total === 0 ? (
        <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center text-sm font-body text-ink-500 bg-surface-soft/60">
          Nothing is waiting on a client.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-xs font-normal uppercase tracking-[0.06em] text-ink-500">{group.label}</span>
                <span className="clay-chip font-medium text-xs px-2.5 py-0.5">{group.items.length}</span>
              </div>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="block rounded-md p-3.5 bg-surface-soft border border-white/80 shadow-[var(--clay-raised-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--clay-hover)]"
                    >
                      <div className="font-body text-sm font-semibold text-ink-900">{item.title}</div>
                      <div className="mt-1 font-body text-xs text-ink-500">
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
