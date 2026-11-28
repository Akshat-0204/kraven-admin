import { INVOICE_PAYMENT_STATUSES } from '@kraven/config';
import type { InvoiceRecord } from '@kraven/types';
import type { InvoiceFilterInput, InvoiceInput, PaymentInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { InvoiceStatusBadge } from '../../components/ui/statusBadge';
import { downloadFile } from '../../lib/api';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { listProjects, projectQueryKeys } from '../projects/projectApi';
import {
  createInvoice,
  deleteInvoice,
  financeQueryKeys,
  listInvoices,
  listPayments,
  recordPayment
} from './financeApi';
import { formatCurrency, formatDate } from './financeFormat';
import { InvoiceFormModal } from './InvoiceFormModal';
import { PaymentFormModal } from './PaymentFormModal';

export function InvoicesPaymentsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InvoiceFilterInput>({});
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRecord | null>(null);

  const invoicesQuery = useQuery({
    queryKey: financeQueryKeys.invoices(filters),
    queryFn: () => listInvoices(filters)
  });
  const paymentsQuery = useQuery({
    queryKey: financeQueryKeys.payments({}),
    queryFn: () => listPayments({})
  });
  const clientsQuery = useQuery({
    queryKey: clientQueryKeys.list({ search: '' }),
    queryFn: () => listClients({ search: '' })
  });
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list({}),
    queryFn: () => listProjects({})
  });

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Invoice created');
    },
    onError: (error) => toast.error(error.message)
  });

  const paymentMutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Payment recorded');
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Invoice deleted');
    },
    onError: (error) => toast.error(error.message)
  });

  const invoices = invoicesQuery.data?.invoices ?? [];

  function updateFilter(key: keyof InvoiceFilterInput, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  }

  async function handleCreateInvoice(input: InvoiceInput) {
    await createMutation.mutateAsync(input);
  }

  async function handleRecordPayment(input: PaymentInput) {
    await paymentMutation.mutateAsync(input);
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">Financial Management</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">Invoices & Payments</h1>
        </div>
        <Button
          className="clay-btn--primary rounded-pill bg-[var(--grad-olive)] px-4 py-2 font-body text-sm font-medium text-white shadow-[var(--clay-raised-sm)] transition-all hover:opacity-95"
          onClick={() => setIsInvoiceOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New invoice
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
          className="rounded-pill bg-ink-900 px-4 py-1.5 text-xs font-body font-semibold text-white shadow-[var(--clay-raised-sm)]"
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

      {/* Filter Toolbar */}
      <div className="clay-card rounded-card border border-white/80 bg-surface p-4 shadow-[var(--clay-raised)]">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <Input
              startIcon={<Search className="h-4 w-4 text-ink-500" aria-hidden="true" />}
              placeholder="Search invoice number..."
              value={filters.search ?? ''}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>
          <Select
            aria-label="Filter by payment status"
            value={filters.paymentStatus ?? ''}
            onChange={(event) => updateFilter('paymentStatus', event.target.value)}
          >
            <option value="">All statuses</option>
            {INVOICE_PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by client"
            value={filters.client ?? ''}
            onChange={(event) => updateFilter('client', event.target.value)}
          >
            <option value="">All clients</option>
            {(clientsQuery.data?.clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by project"
            value={filters.project ?? ''}
            onChange={(event) => updateFilter('project', event.target.value)}
          >
            <option value="">All projects</option>
            {(projectsQuery.data?.projects ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectName}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 sm:col-span-2 md:col-span-4 lg:col-span-1">
            <Input
              type="date"
              aria-label="Filter from date"
              value={filters.dateFrom ? String(filters.dateFrom).slice(0, 10) : ''}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      {invoicesQuery.isLoading ? (
        <div className="clay-card rounded-card border border-white/80 bg-surface p-8 text-center text-sm font-body text-ink-500 shadow-[var(--clay-raised)]">
          Loading invoices...
        </div>
      ) : invoicesQuery.isError ? (
        <div className="clay-card rounded-card border border-red-200/60 bg-[var(--danger-bg)] p-6 text-sm font-body text-[var(--danger-fg)] shadow-[var(--clay-raised)]">
          Unable to load invoices.
        </div>
      ) : invoices.length === 0 ? (
        <div className="clay-card rounded-card border border-dashed border-sand-300/60 bg-surface p-12 text-center text-sm font-body text-ink-500 shadow-[var(--clay-raised)]">
          No invoices match the current filters.
        </div>
      ) : (
        <div className="clay-card overflow-hidden rounded-card border border-white/80 bg-surface shadow-[var(--clay-raised)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm font-body">
              <thead className="border-b border-sand-300/40 bg-sand-100/50">
                <tr>
                  <th className="px-5 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Invoice</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Amount</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Paid</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Remaining</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Status</th>
                  <th className="px-4 py-3.5 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Due Date</th>
                  <th className="px-5 py-3.5 text-right font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/60">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-sand-50/60">
                    <td className="px-5 py-4 font-semibold text-ink-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-4 font-medium text-ink-900">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-4 py-4 text-emerald-700 font-medium">
                      {formatCurrency(invoice.amountPaid)}
                    </td>
                    <td className="px-4 py-4 font-medium text-ink-700">
                      {invoice.remainingAmount > 0 ? (
                        <span className="text-amber-700">{formatCurrency(invoice.remainingAmount)}</span>
                      ) : (
                        <span className="text-ink-400 font-normal">₹0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <InvoiceStatusBadge status={invoice.paymentStatus} />
                    </td>
                    <td className="px-4 py-4 text-ink-500">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          className="clay-btn h-8 w-8 rounded-pill bg-surface p-0 text-ink-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-olive-700"
                          aria-label={`Download invoice ${invoice.invoiceNumber} PDF`}
                          onClick={() =>
                            downloadFile(`/invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`).catch((error: Error) =>
                              toast.error(error.message)
                            )
                          }
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          className="clay-btn h-8 rounded-pill bg-surface px-3 text-xs font-medium text-olive-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-olive-50 disabled:opacity-40 disabled:hover:bg-surface"
                          disabled={invoice.remainingAmount <= 0}
                          onClick={() => setPaymentInvoice(invoice)}
                        >
                          Pay
                        </Button>
                        <Button
                          className="clay-btn h-8 w-8 rounded-pill bg-surface p-0 text-ink-400 shadow-[var(--clay-raised-sm)] transition-all hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete invoice ${invoice.invoiceNumber}`}
                          onClick={() => {
                            if (window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
                              deleteMutation.mutate(invoice.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Payments Section */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="font-display text-lg font-bold text-ink-900">Recent Payment Transactions</h2>
          <p className="text-xs font-body text-ink-500">Audit trail of cleared client payments and settlement references</p>
        </div>
        {(paymentsQuery.data?.payments ?? []).length === 0 ? (
          <div className="clay-card rounded-card border border-dashed border-sand-300/60 bg-surface p-8 text-center text-sm font-body text-ink-500 shadow-[var(--clay-raised)]">
            No payments recorded yet.
          </div>
        ) : (
          <div className="clay-card overflow-hidden rounded-card border border-white/80 bg-surface shadow-[var(--clay-raised)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm font-body">
                <thead className="border-b border-sand-300/40 bg-sand-100/50">
                  <tr>
                    <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Date</th>
                    <th className="px-4 py-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Amount</th>
                    <th className="px-4 py-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Method</th>
                    <th className="px-5 py-3 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/60">
                  {(paymentsQuery.data?.payments ?? []).map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-sand-50/60">
                      <td className="px-5 py-3.5 text-ink-500">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-700">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3.5 text-ink-700">{payment.paymentMethod || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink-500">{payment.transactionReferenceId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <InvoiceFormModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} onSubmit={handleCreateInvoice} />
      <PaymentFormModal
        invoice={paymentInvoice}
        isOpen={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        onSubmit={handleRecordPayment}
      />
    </section>
  );
}

