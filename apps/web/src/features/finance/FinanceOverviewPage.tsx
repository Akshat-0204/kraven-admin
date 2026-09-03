import { useQuery } from '@tanstack/react-query';
import { financeQueryKeys, getFinanceOverview } from './financeApi';
import { formatCurrency } from './financeFormat';

export function FinanceOverviewPage() {
  const summaryQuery = useQuery({
    queryKey: financeQueryKeys.overview,
    queryFn: getFinanceOverview
  });

  const summary = summaryQuery.data?.summary;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Finance</p>
        <h1 className="mt-2 text-2xl font-semibold">Overview</h1>
      </div>
      {summaryQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading finance...</div>
      ) : summaryQuery.isError || !summary ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load finance overview.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Total invoiced" value={formatCurrency(summary.invoiced)} colorClass="text-indigo-400" />
          <Metric label="Received" value={formatCurrency(summary.received)} colorClass="text-emerald-400" />
          <Metric label="Pending" value={formatCurrency(summary.pending)} colorClass="text-amber-400" />
          <Metric label="Overdue" value={formatCurrency(summary.overdue)} colorClass="text-red-400" />
          <Metric label="Expenses" value={formatCurrency(summary.expenses)} colorClass="text-rose-400" />
          <Metric label="Net / Profit" value={formatCurrency(summary.profit)} colorClass="text-violet-400" />
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="rounded border border-border bg-panel p-4">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className={`mt-3 text-xl font-semibold ${colorClass ?? 'text-foreground'}`}>{value}</div>
    </div>
  );
}
