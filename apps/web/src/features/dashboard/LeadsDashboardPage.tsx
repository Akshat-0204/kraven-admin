import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertsPanel,
  ChartPanel,
  chartAxisColor,
  chartGridColor,
  chartSliceStroke,
  chartTooltipStyle,
  DashboardHeader,
  DashboardSummaryGate,
  defaultPalette,
  leadStatusColors,
  Metric
} from './dashboardWidgets';

export function LeadsDashboardPage() {
  return (
    <DashboardSummaryGate>
      {(dashboard) => {
        const followUps = dashboard.alerts.filter((alert) => alert.type === 'lead-follow-up');

        return (
          <section className="space-y-6 sm:space-y-8">
            <DashboardHeader eyebrow="Leads workspace" title="Leads dashboard" />

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Metric label="Leads" value={dashboard.leads.total} colorClass="text-olive-700" />
              <Metric label="New" value={dashboard.leads.new} colorClass="text-ink-700" />
              <Metric label="In progress" value={dashboard.leads.inProgress} colorClass="text-olive-700" />
              <Metric label="Won" value={dashboard.leads.won} colorClass="text-success-fg" />
              <Metric label="Lost" value={dashboard.leads.lost} colorClass="text-danger-fg" />
              <Metric label="Conversion" value={`${dashboard.leads.conversionRate}%`} colorClass="text-success-fg" />
            </div>

            <AlertsPanel title="Follow-ups" alerts={followUps} emptyText="No leads need a follow-up right now." />

            <div className="grid gap-4 xl:grid-cols-2">
              <ChartPanel title="Leads over time">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.leads.overTime}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke={chartAxisColor} fontSize={11} />
                    <YAxis stroke={chartAxisColor} fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(val: number) => [val, 'Leads']} />
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
                          stroke={chartSliceStroke}
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
