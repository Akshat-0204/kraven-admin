import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Receipt,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { LoadingState } from '../../components/ui/loadingState';
import { PageHeader } from '../../components/ui/pageHeader';
import { IconCircle, StatCard } from '../../components/ui/statCard';
import { financeQueryKeys, getFinanceOverview } from './financeApi';
import { formatCurrency } from './financeFormat';
import { FinanceSubNav } from './FinanceSubNav';

function JumpPanel({
  icon,
  iconVariant,
  title,
  description,
  to,
  linkLabel
}: {
  icon: ReactNode;
  iconVariant?: 'default' | 'sand';
  title: string;
  description: string;
  to: string;
  linkLabel: string;
}) {
  return (
    <Card className="flex flex-col justify-between p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <IconCircle variant={iconVariant}>{icon}</IconCircle>
          <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
        </div>
        <p className="text-sm font-body text-ink-500">{description}</p>
      </div>
      <div className="mt-6 border-t border-sand-200/40 pt-4">
        <Link
          to={to}
          className="inline-flex items-center text-sm font-body font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          {linkLabel}
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}

export function FinanceOverviewPage() {
  const summaryQuery = useQuery({
    queryKey: financeQueryKeys.overview,
    queryFn: getFinanceOverview
  });

  const summary = summaryQuery.data?.summary;

  return (
    <section className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Financial Management"
        title="Finance Overview"
        actions={
          <>
            <Link
              to="/finance/expenses"
              className="clay-btn inline-flex items-center rounded-pill px-4 py-2 text-sm font-body font-medium text-ink-700 hover:text-ink-900"
            >
              <TrendingDown className="mr-2 h-4 w-4 text-ink-500" aria-hidden="true" />
              Expenses
            </Link>
            <Link
              to="/finance/invoices"
              className="clay-btn--primary inline-flex items-center rounded-pill px-4 py-2 text-sm font-body font-medium text-white"
            >
              <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
              Invoices & Payments
            </Link>
          </>
        }
      />

      <FinanceSubNav active="overview" />

      {summaryQuery.isLoading ? (
        <Card>
          <LoadingState label="Loading financial metrics..." />
        </Card>
      ) : summaryQuery.isError || !summary ? (
        <Card className="bg-danger-bg p-6 font-body text-sm text-danger-fg">
          Unable to load finance overview. Please refresh or verify permissions.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 6 Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Invoiced"
              value={formatCurrency(summary.invoiced)}
              icon={<FileText className="h-4 w-4" aria-hidden="true" />}
              hint="Gross billed to clients"
            />
            <StatCard
              label={<span className="text-success-fg">Received</span>}
              value={<span className="text-success-fg">{formatCurrency(summary.received)}</span>}
              icon={<CheckCircle2 className="h-4 w-4 text-success-fg" aria-hidden="true" />}
              hint="Collected in bank accounts"
            />
            <StatCard
              label={<span className="text-warning-fg">Pending</span>}
              value={<span className="text-warning-fg">{formatCurrency(summary.pending)}</span>}
              icon={<Clock className="h-4 w-4 text-warning-fg" aria-hidden="true" />}
              hint="Outstanding awaiting payment"
            />
            <StatCard
              label={<span className="text-danger-fg">Overdue</span>}
              value={<span className="text-danger-fg">{formatCurrency(summary.overdue)}</span>}
              icon={<AlertTriangle className="h-4 w-4 text-danger-fg" aria-hidden="true" />}
              hint="Past agreed due dates"
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(summary.expenses)}
              icon={<TrendingDown className="h-4 w-4 text-danger-fg" aria-hidden="true" />}
              hint="Operational costs & vendors"
            />
            <StatCard
              variant="hero"
              label="Net / Profit"
              value={formatCurrency(summary.profit)}
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
              hint="Received revenue minus expenses"
            />
          </div>

          {/* Jump / Detail Panels */}
          <div className="grid gap-6 md:grid-cols-2">
            <JumpPanel
              icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
              title="Invoices & Collections"
              description="Generate client invoices, track partial disbursements, configure UPI payment gateways, and download PDF receipts."
              to="/finance/invoices"
              linkLabel="Manage invoices"
            />
            <JumpPanel
              icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
              iconVariant="sand"
              title="Operational Expenses"
              description="Log hardware, contractor wages, software subscriptions, office overhead, and attach vendor receipts."
              to="/finance/expenses"
              linkLabel="Manage expenses"
            />
          </div>
        </div>
      )}
    </section>
  );
}
