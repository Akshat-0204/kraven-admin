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
import { Link } from 'react-router-dom';
import { financeQueryKeys, getFinanceOverview } from './financeApi';
import { formatCurrency } from './financeFormat';

export function FinanceOverviewPage() {
  const summaryQuery = useQuery({
    queryKey: financeQueryKeys.overview,
    queryFn: getFinanceOverview
  });

  const summary = summaryQuery.data?.summary;

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">Financial Management</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Finance Overview</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/finance/expenses"
            className="clay-btn inline-flex items-center rounded-pill bg-surface px-4 py-2 text-sm font-body font-medium text-ink-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-ink-900"
          >
            <TrendingDown className="mr-2 h-4 w-4 text-ink-500" aria-hidden="true" />
            Expenses
          </Link>
          <Link
            to="/finance/invoices"
            className="clay-btn--primary inline-flex items-center rounded-pill bg-[var(--grad-olive)] px-4 py-2 text-sm font-body font-medium text-white shadow-[var(--clay-raised-sm)] transition-all hover:opacity-95"
          >
            <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
            Invoices & Payments
          </Link>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sand-300/40 pb-4">
        <Link
          to="/finance"
          className="rounded-pill bg-ink-900 px-4 py-1.5 text-xs font-body font-semibold text-white shadow-[var(--clay-raised-sm)]"
        >
          Overview
        </Link>
        <Link
          to="/finance/invoices"
          className="rounded-pill bg-surface px-4 py-1.5 text-xs font-body font-medium text-ink-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-ink-900"
        >
          Invoices & Payments
        </Link>
        <Link
          to="/finance/expenses"
          className="rounded-pill bg-surface px-4 py-1.5 text-xs font-body font-medium text-ink-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-ink-900"
        >
          Expenses
        </Link>
      </div>

      {summaryQuery.isLoading ? (
        <div className="clay-card rounded-card border border-white/80 bg-surface p-8 text-center text-sm font-body text-ink-500 shadow-[var(--clay-raised)]">
          Loading financial metrics...
        </div>
      ) : summaryQuery.isError || !summary ? (
        <div className="clay-card rounded-card border border-red-200/60 bg-[var(--danger-bg)] p-6 text-sm font-body text-[var(--danger-fg)] shadow-[var(--clay-raised)]">
          Unable to load finance overview. Please refresh or verify permissions.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 6 Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Invoiced */}
            <div className="clay-card group relative rounded-card border border-white/80 bg-surface p-5 shadow-[var(--clay-raised)] transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Total Invoiced</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-200 text-ink-700 shadow-[var(--clay-raised-sm)]">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-900">
                {formatCurrency(summary.invoiced)}
              </div>
              <div className="mt-1 text-xs font-body text-ink-500">Gross billed to clients</div>
            </div>

            {/* Received */}
            <div className="clay-card group relative rounded-card border border-white/80 bg-surface p-5 shadow-[var(--clay-raised)] transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-emerald-800">Received</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-fg)] shadow-[var(--clay-raised-sm)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-emerald-700">
                {formatCurrency(summary.received)}
              </div>
              <div className="mt-1 text-xs font-body text-ink-500">Collected in bank accounts</div>
            </div>

            {/* Pending */}
            <div className="clay-card group relative rounded-card border border-white/80 bg-surface p-5 shadow-[var(--clay-raised)] transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-amber-800">Pending</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--warning-bg)] text-[var(--warning-fg)] shadow-[var(--clay-raised-sm)]">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-amber-600">
                {formatCurrency(summary.pending)}
              </div>
              <div className="mt-1 text-xs font-body text-ink-500">Outstanding awaiting payment</div>
            </div>

            {/* Overdue */}
            <div className="clay-card group relative rounded-card border border-white/80 bg-surface p-5 shadow-[var(--clay-raised)] transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-red-800">Overdue</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger-fg)] shadow-[var(--clay-raised-sm)]">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-red-600">
                {formatCurrency(summary.overdue)}
              </div>
              <div className="mt-1 text-xs font-body text-ink-500">Past agreed due dates</div>
            </div>

            {/* Expenses */}
            <div className="clay-card group relative rounded-card border border-white/80 bg-surface p-5 shadow-[var(--clay-raised)] transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Expenses</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-200 text-ink-700 shadow-[var(--clay-raised-sm)]">
                  <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-900">
                {formatCurrency(summary.expenses)}
              </div>
              <div className="mt-1 text-xs font-body text-ink-500">Operational costs & vendors</div>
            </div>

            {/* Net / Profit - HERO CARD */}
            <div className="clay-card--hero group relative rounded-card border border-white/20 bg-[var(--grad-olive)] p-5 text-white shadow-[var(--clay-green)] transition-all hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-white/80">Net / Profit</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 font-display text-2xl font-bold tracking-tight text-white">
                {formatCurrency(summary.profit)}
              </div>
              <div className="mt-1 text-xs font-body text-white/80">Received revenue minus expenses</div>
            </div>
          </div>

          {/* Jump / Detail Panels */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="clay-card flex flex-col justify-between rounded-card border border-white/80 bg-surface p-6 shadow-[var(--clay-raised)]">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-olive-100 text-olive-700 shadow-[var(--clay-raised-sm)]">
                    <Receipt className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-ink-900">Invoices & Collections</h3>
                </div>
                <p className="text-sm font-body text-ink-500">
                  Generate client invoices, track partial disbursements, configure UPI payment gateways, and download PDF receipts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sand-300/40">
                <Link
                  to="/finance/invoices"
                  className="inline-flex items-center text-sm font-body font-semibold text-olive-700 transition-colors hover:text-olive-800"
                >
                  Manage invoices
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="clay-card flex flex-col justify-between rounded-card border border-white/80 bg-surface p-6 shadow-[var(--clay-raised)]">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-200 text-ink-700 shadow-[var(--clay-raised-sm)]">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-ink-900">Operational Expenses</h3>
                </div>
                <p className="text-sm font-body text-ink-500">
                  Log hardware, contractor wages, software subscriptions, office overhead, and attach vendor receipts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-sand-300/40">
                <Link
                  to="/finance/expenses"
                  className="inline-flex items-center text-sm font-body font-semibold text-olive-700 transition-colors hover:text-olive-800"
                >
                  Manage expenses
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

