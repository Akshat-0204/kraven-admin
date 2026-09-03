import { EXPENSE_CATEGORIES } from '@kraven/config';
import type { ExpenseFilterInput, ExpenseInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { listProjects, projectQueryKeys } from '../projects/projectApi';
import { createExpense, deleteExpense, financeQueryKeys, listExpenses } from './financeApi';
import { formatCurrency, formatDate } from './financeFormat';
import { ExpenseFormModal } from './ExpenseFormModal';

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
      toast.success('Expense created');
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Finance</p>
          <h1 className="mt-2 text-2xl font-semibold">Expenses</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New expense
        </Button>
      </div>

      <div className="grid gap-3 rounded border border-border bg-panel p-3 md:grid-cols-5">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          <Input className="pl-9" placeholder="Search expense/vendor" value={filters.search ?? ''} onChange={(event) => updateFilter('search', event.target.value)} />
        </label>
        <Select value={filters.category ?? ''} onChange={(event) => updateFilter('category', event.target.value)}>
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </Select>
        <Select value={filters.associatedProject ?? ''} onChange={(event) => updateFilter('associatedProject', event.target.value)}>
          <option value="">All projects</option>
          {(projectsQuery.data?.projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
        </Select>
        <Input type="date" value={filters.dateFrom ? String(filters.dateFrom).slice(0, 10) : ''} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
        <Input type="date" value={filters.dateTo ? String(filters.dateTo).slice(0, 10) : ''} onChange={(event) => updateFilter('dateTo', event.target.value)} />
      </div>

      {expensesQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading expenses...</div>
      ) : expensesQuery.isError ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">Unable to load expenses.</div>
      ) : expenses.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">No expenses match the current filters.</div>
      ) : (
        <div className="overflow-hidden rounded border border-border bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Expense</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Vendor</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-white/5">
                  <td className="px-3 py-3 font-medium">{expense.name}</td>
                  <td className="px-3 py-3 text-muted">{expense.category}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(expense.amount)}</td>
                  <td className="px-3 py-3 text-muted">{expense.vendor || '-'}</td>
                  <td className="px-3 py-3 text-muted">{formatDate(expense.date)}</td>
                  <td className="px-3 py-3">
                    <Button
                      className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
                      onClick={() => {
                        if (window.confirm(`Delete expense ${expense.name}?`)) deleteMutation.mutate(expense.id);
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
      )}

      <ExpenseFormModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateExpense} />
    </section>
  );
}
