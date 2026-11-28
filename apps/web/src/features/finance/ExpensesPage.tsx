import { EXPENSE_CATEGORIES } from '@kraven/config';
import type { ExpenseFilterInput, ExpenseInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Table, Td, Th } from '../../components/ui/dataTable';
import { EmptyState } from '../../components/ui/emptyState';
import { Input } from '../../components/ui/input';
import { LoadingState } from '../../components/ui/loadingState';
import { PageHeader } from '../../components/ui/pageHeader';
import { Select } from '../../components/ui/select';
import { listProjects, projectQueryKeys } from '../projects/projectApi';
import { ExpenseFormModal } from './ExpenseFormModal';
import { createExpense, deleteExpense, financeQueryKeys, listExpenses } from './financeApi';
import { FinanceSubNav } from './FinanceSubNav';
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
    }
    // Errors are surfaced by ExpenseFormModal (inline field errors + toast).
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense deleted');
    },
    onError: toastError('Could not delete expense')
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
      <PageHeader
        eyebrow="Financial Management"
        title="Expenses"
        actions={
          <Button className="clay-btn--primary px-4 py-2 text-white" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New expense
          </Button>
        }
      />

      <FinanceSubNav active="expenses" />

      {/* Filter Toolbar */}
      <Card className="p-4">
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
      </Card>

      {/* Expenses Table */}
      {expensesQuery.isLoading ? (
        <Card>
          <LoadingState label="Loading expenses..." />
        </Card>
      ) : expensesQuery.isError ? (
        <Card className="bg-danger-bg p-6 font-body text-sm text-danger-fg">
          Unable to load expenses: {errorMessage(expensesQuery.error, 'Unknown error')}
        </Card>
      ) : expenses.length === 0 ? (
        <Card>
          <EmptyState title="No expenses recorded matching the current filters." />
        </Card>
      ) : (
        <Card padded={false}>
            <Table>
              <thead className="border-b border-sand-200/40 bg-sand-200/50">
                <tr>
                  <Th>Expense</Th>
                  <Th>Category</Th>
                  <Th>Amount</Th>
                  <Th>Vendor</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/60">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-surface-soft/60">
                    <Td className="font-semibold text-ink-900">
                      {expense.name}
                    </Td>
                    <Td>
                      <span className="clay-chip inline-flex items-center rounded-pill border border-[rgba(120,110,90,0.18)] bg-sand-200 px-2.5 py-0.5 text-xs font-body font-medium text-ink-900 shadow-clay-sm">
                        <Tag className="mr-1 h-3 w-3 text-ink-500" aria-hidden="true" />
                        {expense.category}
                      </span>
                    </Td>
                    <Td className="font-display font-semibold text-ink-900">
                      {formatCurrency(expense.amount)}
                    </Td>
                    <Td className="text-ink-700">
                      {expense.vendor || '—'}
                    </Td>
                    <Td className="text-ink-500">
                      {formatDate(expense.date)}
                    </Td>
                    <Td className="text-right">
                      <Button
                        className="clay-btn h-8 w-8 rounded-pill p-0 text-ink-500 hover:bg-danger-bg hover:text-danger-fg"
                        aria-label={`Delete expense ${expense.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete expense ${expense.name}?`)) {
                            deleteMutation.mutate(expense.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
        </Card>
      )}

      <ExpenseFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateExpense} />
    </section>
  );
}

