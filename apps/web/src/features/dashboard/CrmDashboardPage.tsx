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
import { formatCurrency } from '../finance/financeFormat';
import {
  AlertsPanel,
  ChartPanel,
  chartTooltipStyle,
  DashboardHeader,
  DashboardSummaryGate,
  defaultPalette,
  Metric,
  projectStatusColors,
  Row,
  WaitingOnClientCard
} from './dashboardWidgets';

const currencyTick = (val: number) => `₹${(val / 1000).toFixed(0)}k`;

export function CrmDashboardPage() {
  return (
    <DashboardSummaryGate>
      {(dashboard) => {
        // Lead follow-ups live on the Leads dashboard.
        const alerts = dashboard.alerts.filter((alert) => alert.type !== 'lead-follow-up');

        return (
          <section className="space-y-5">
            <DashboardHeader eyebrow="CRM workspace" title="CRM dashboard" />

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Metric label="Active projects" value={dashboard.projects.totalActive} colorClass="text-blue-400" />
              <Metric label="Overall progress" value={`${dashboard.projects.overallProgress}%`} colorClass="text-indigo-400" />
              <Metric label="Revenue" value={formatCurrency(dashboard.finance.revenue)} colorClass="text-indigo-300" />
              <Metric label="Received" value={formatCurrency(dashboard.finance.received)} colorClass="text-emerald-400" />
              <Metric label="Pending" value={formatCurrency(dashboard.finance.pending)} colorClass="text-amber-400" />
              <Metric label="Profit" value={formatCurrency(dashboard.finance.profit)} colorClass="text-violet-400" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
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

            <WaitingOnClientCard data={dashboard.waitingOnClient} />

            <AlertsPanel title="Attention" alerts={alerts} emptyText="Nothing needs attention right now." />

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
                    <YAxis stroke="#a3a3a3" fontSize={11} tickFormatter={currencyTick} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val: number) => [formatCurrency(val), '']} />
                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                    <Area name="Invoiced" type="monotone" dataKey="invoiced" stroke="#6366f1" strokeWidth={2} fill="url(#colorInvoiced)" />
                    <Area name="Received" type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} fill="url(#colorReceived)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Income vs. expenses">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.revenueOverTime}>
                    <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} />
                    <YAxis stroke="#a3a3a3" fontSize={11} tickFormatter={currencyTick} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val: number) => [formatCurrency(val), '']} />
                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                    <Bar name="Income (Received)" dataKey="received" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Expenses" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
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
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val: number, name: string) => [val, name]} />
                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </section>
        );
      }}
    </DashboardSummaryGate>
  );
}
