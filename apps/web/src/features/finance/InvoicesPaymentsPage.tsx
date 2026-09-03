import { INVOICE_PAYMENT_STATUSES } from '@kraven/config';
import type { InvoiceFilterInput, InvoiceInput, PaymentInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { listProjects, projectQueryKeys } from '../projects/projectApi';
import {
  financeQueryKeys,
  createInvoice,
  deleteInvoice,
  listInvoices,
  listPayments,
  recordPayment
} from './financeApi';
import { formatCurrency, formatDate } from './financeFormat';
import { InvoiceFormModal } from './InvoiceFormModal';
import { PaymentFormModal } from './PaymentFormModal';
import type { InvoiceRecord } from '@kraven/types';

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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Finance</p>
          <h1 className="mt-2 text-2xl font-semibold">Invoices / Payments</h1>
        </div>
        <Button onClick={() => setIsInvoiceOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New invoice
        </Button>
      </div>

      <div className="grid gap-3 rounded border border-border bg-panel p-3 md:grid-cols-4">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          <Input className="pl-9" placeholder="Search invoice" value={filters.search ?? ''} onChange={(event) => updateFilter('search', event.target.value)} />
        </label>
        <Select value={filters.paymentStatus ?? ''} onChange={(event) => updateFilter('paymentStatus', event.target.value)}>
          <option value="">All statuses</option>
          {INVOICE_PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
        <Select value={filters.client ?? ''} onChange={(event) => updateFilter('client', event.target.value)}>
          <option value="">All clients</option>
          {(clientsQuery.data?.clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.companyName}</option>)}
        </Select>
        <Select value={filters.project ?? ''} onChange={(event) => updateFilter('project', event.target.value)}>
          <option value="">All projects</option>
          {(projectsQuery.data?.projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
        </Select>
        <Input type="date" value={filters.dateFrom ? String(filters.dateFrom).slice(0, 10) : ''} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
        <Input type="date" value={filters.dateTo ? String(filters.dateTo).slice(0, 10) : ''} onChange={(event) => updateFilter('dateTo', event.target.value)} />
      </div>

      {invoicesQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading invoices...</div>
      ) : invoicesQuery.isError ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">Unable to load invoices.</div>
      ) : invoices.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">No invoices match the current filters.</div>
      ) : (
        <div className="overflow-hidden rounded border border-border bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Invoice</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Paid</th>
                <th className="px-3 py-3 font-medium">Remaining</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Due</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-white/5">
                  <td className="px-3 py-3 font-medium">{invoice.invoiceNumber}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(invoice.amount)}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(invoice.amountPaid)}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(invoice.remainingAmount)}</td>
                  <td className="px-3 py-3 text-muted">{invoice.paymentStatus}</td>
                  <td className="px-3 py-3 text-muted">{formatDate(invoice.dueDate)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button className="h-8 px-2" disabled={invoice.remainingAmount <= 0} onClick={() => setPaymentInvoice(invoice)}>Pay</Button>
                      <Button
                        className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
                        onClick={() => {
                          if (window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) deleteMutation.mutate(invoice.id);
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
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recent payments</h2>
        {(paymentsQuery.data?.payments ?? []).length === 0 ? (
          <div className="rounded border border-dashed border-border bg-panel p-4 text-sm text-muted">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-border bg-panel">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Method</th>
                  <th className="px-3 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(paymentsQuery.data?.payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-3 text-muted">{formatDate(payment.paymentDate)}</td>
                    <td className="px-3 py-3">{formatCurrency(payment.amount)}</td>
                    <td className="px-3 py-3 text-muted">{payment.paymentMethod || '-'}</td>
                    <td className="px-3 py-3 text-muted">{payment.transactionReferenceId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <InvoiceFormModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} onSubmit={handleCreateInvoice} />
      <PaymentFormModal invoice={paymentInvoice} isOpen={Boolean(paymentInvoice)} onClose={() => setPaymentInvoice(null)} onSubmit={handleRecordPayment} />
    </section>
  );
}
