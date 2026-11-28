import { EXPENSE_CATEGORIES } from '@kraven/config';
import type { ExpenseFilterInput, ExpenseInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { listProjects, projectQueryKeys } from '../projects/projectApi';
import { ExpenseFormModal } from './ExpenseFormModal';
import { createExpense, deleteExpense, financeQueryKeys, listExpenses } from './financeApi';
import { formatCurrency, formatDate } from './financeFormat';

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExpenseFilterInput>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const expensesQuery = useQuery({
    queryKey: financeQueryKeys.expenses(filters),
    queryFn: () => listExpenses(filters)
  });
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list({}),
    queryFn: () => listProjects({})
  });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense recorded');
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense deleted');
    },
    onError: (error) => toast.error(error.message)
  });

  const expenses = expensesQuery.data?.expenses ?? [];

  function updateFilter(key: keyof ExpenseFilterInput, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  }

  async function handleCreateExpense(input: ExpenseInput) {
    await createMutation.mutateAsync(input);
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">Financial Management</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Expenses</h1>
        </div>
        <Button
          className="clay-btn--primary rounded-pill bg-[var(--grad-olive)] px-4 py-2 font-body text-sm font-medium text-white shadow-[var(--clay-raised-sm)] transition-all hover:opacity-95"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New expense
        </Button>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-sand-300/40 pb-4">
        <Link
          to="/finance"
          className="rounded-pill bg-surface px-4 py-1.5 text-xs font-body font-medium text-ink-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-ink-900"
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
          className="rounded-pill bg-ink-900 px-4 py-1.5 text-xs font-body font-semibold text-white shadow-[var(--clay-raised-sm)]"
        >
          Expenses
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="clay-card rounded-card border border-white/80 bg-surface p-4 shadow-[var(--clay-raised)]">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <div className="sm:col-span-2">
            <Input
              startIcon={<Search className="h-4 w-4 text-ink-500" aria-hidden="true" />}
              placeholder="Search expense description or vendor..."
              value={filters.search ?? ''}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>
          <Select
            aria-label="Filter by expense category"
            value={filters.category ?? ''}
            onChange={(event) => updateFilter('category', event.target.value)}
          >
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by project"
            value={filters.associatedProject ?? ''}
            onChange={(event) => updateFilter('associatedProject', event.target.value)}
          >
            <option value="">All projects</option>
            {(projectsQuery.data?.projects ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectName}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              aria-label="Filter from date"
              value={filters.dateFrom ? String(filters.dateFrom).slice(0, 10) : ''}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      {expensesQuery.isLoading ? (
        <div className="clay-card rounded-card border border-white/80 bg-surface p-8 text-center text-sm font-body text-ink-500 shadow-[var(--clay-raised)]">
          Loading expenses...
        </div>
      ) : expensesQuery.isError ? (
        <div className="clay-card rounded-card border border-red-200/60 bg-[var(--danger-bg)] p-6 text-sm font-body text-[var(--danger-fg)] shadow-[var(--clay-raised)]">
          Unable to load expenses.
        </div>
      ) : expenses.length === 0 ? (
        <div className="clay-card rounded-card border border-dashed border-sand-300/60 bg-surface p-12 text-center text-sm font-body text-ink-500 shadow-[var(--clay-raised)]">
          No expenses recorded matching the current filters.
        </div>
      ) : (
        <div className="clay-card overflow-hidden rounded-card border border-white/80 bg-surface shadow-[var(--clay-raised)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm font-body">
              <thead className="border-b border-sand-300/40 bg-sand-100/50">
                <tr>
                  <th className="px-5 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Expense</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Category</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Amount</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Vendor</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Date</th>
                  <th className="px-5 py-3.5 text-right font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/60">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-sand-50/60">
                    <td className="px-5 py-4 font-semibold text-ink-900">
                      {expense.name}
                    </td>
                    <td className="px-4 py-4">
                      <span className="clay-chip inline-flex items-center rounded-pill border border-[rgba(120,110,90,0.18)] bg-sand-200 px-2.5 py-0.5 text-xs font-body font-medium text-ink-800 shadow-[var(--clay-raised-sm)]">
                        <Tag className="mr-1 h-3 w-3 text-ink-500" aria-hidden="true" />
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-display font-semibold text-ink-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-4 text-ink-600">
                      {expense.vendor || '—'}
                    </td>
                    <td className="px-4 py-4 text-ink-500">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        className="clay-btn h-8 w-8 rounded-pill bg-surface p-0 text-ink-400 shadow-[var(--clay-raised-sm)] transition-all hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete expense ${expense.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete expense ${expense.name}?`)) {
                            deleteMutation.mutate(expense.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExpenseFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateExpense} />
    </section>
  );
}

