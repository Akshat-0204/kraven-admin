import { INVOICE_PAYMENT_STATUSES } from '@kraven/config';
import type { InvoiceRecord } from '@kraven/types';
import type { InvoiceFilterInput, InvoiceInput, PaymentInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
import { Table, Td, Th } from '../../components/ui/dataTable';
import { EmptyState } from '../../components/ui/emptyState';
import { Input } from '../../components/ui/input';
import { LoadingState } from '../../components/ui/loadingState';
import { PageHeader } from '../../components/ui/pageHeader';
import { Select } from '../../components/ui/select';
import { InvoiceStatusBadge } from '../../components/ui/statusBadge';
import { downloadFile, errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
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
import { FinanceSubNav } from './FinanceSubNav';
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
    }
    // Errors are surfaced by InvoiceFormModal (inline field errors + toast).
  });

  const paymentMutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Payment recorded');
    }
    // Errors are surfaced by PaymentFormModal (inline field errors + toast).
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Invoice deleted');
    },
    onError: toastError('Could not delete invoice')
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
      <PageHeader
        eyebrow="Financial Management"
        title="Invoices & Payments"
        actions={
          <Button className="clay-btn--primary px-4 py-2 text-white" onClick={() => setIsInvoiceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New invoice
          </Button>
        }
      />

      <FinanceSubNav active="invoices" />

      {/* Filter Toolbar */}
      <Card className="p-4">
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
      </Card>

      {/* Invoices List Table */}
      {invoicesQuery.isLoading ? (
        <Card>
          <LoadingState label="Loading invoices..." />
        </Card>
      ) : invoicesQuery.isError ? (
        <Card className="bg-danger-bg p-6 font-body text-sm text-danger-fg">
          Unable to load invoices: {errorMessage(invoicesQuery.error, 'Unknown error')}
        </Card>
      ) : invoices.length === 0 ? (
        <Card>
          <EmptyState title="No invoices match the current filters." />
        </Card>
      ) : (
        <Card padded={false}>
            <Table>
              <thead className="border-b border-sand-200/40 bg-sand-200/50">
                <tr>
                  <Th>Invoice</Th>
                  <Th>Amount</Th>
                  <Th>Paid</Th>
                  <Th>Remaining</Th>
                  <Th>Status</Th>
                  <Th>Due Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200/60">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition-colors hover:bg-surface-soft/60">
                    <Td className="font-semibold text-ink-900">
                      {invoice.invoiceNumber}
                    </Td>
                    <Td className="font-medium text-ink-900">
                      {formatCurrency(invoice.amount)}
                    </Td>
                    <Td className="text-success-fg font-medium">
                      {formatCurrency(invoice.amountPaid)}
                    </Td>
                    <Td className="font-medium text-ink-700">
                      {invoice.remainingAmount > 0 ? (
                        <span className="text-warning-fg">{formatCurrency(invoice.remainingAmount)}</span>
                      ) : (
                        <span className="text-ink-500 font-normal">₹0.00</span>
                      )}
                    </Td>
                    <Td>
                      <InvoiceStatusBadge status={invoice.paymentStatus} />
                    </Td>
                    <Td className="text-ink-500">
                      {formatDate(invoice.dueDate)}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          className="clay-btn h-8 w-8 rounded-pill p-0 text-ink-700 hover:text-olive-700"
                          aria-label={`Download invoice ${invoice.invoiceNumber} PDF`}
                          onClick={() =>
                            downloadFile(`/invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`).catch(
                              toastError('Could not download invoice PDF')
                            )
                          }
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          className="clay-btn h-8 rounded-pill px-3 text-xs font-medium text-olive-700 hover:bg-olive-100"
                          disabled={invoice.remainingAmount <= 0}
                          onClick={() => setPaymentInvoice(invoice)}
                        >
                          Pay
                        </Button>
                        <Button
                          className="clay-btn h-8 w-8 rounded-pill p-0 text-ink-500 hover:bg-danger-bg hover:text-danger-fg"
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
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
        </Card>
      )}

      {/* Recent Payments Section */}
      <section className="space-y-4">
        <CardHeader
          className="mb-0"
          title="Recent Payment Transactions"
          subtitle="Audit trail of cleared client payments and settlement references"
        />
        {paymentsQuery.isError ? (
          <Card className="bg-danger-bg p-6 font-body text-sm text-danger-fg">
            Unable to load payments: {errorMessage(paymentsQuery.error, 'Unknown error')}
          </Card>
        ) : paymentsQuery.isLoading ? (
          <Card>
            <LoadingState label="Loading payments..." />
          </Card>
        ) : (paymentsQuery.data?.payments ?? []).length === 0 ? (
          <Card>
            <EmptyState title="No payments recorded yet." />
          </Card>
        ) : (
          <Card padded={false}>
              <Table>
                <thead className="border-b border-sand-200/40 bg-sand-200/50">
                  <tr>
                    <Th>Date</Th>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                    <Th>Reference</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200/60">
                  {(paymentsQuery.data?.payments ?? []).map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-surface-soft/60">
                      <Td className="text-ink-500">{formatDate(payment.paymentDate)}</Td>
                      <Td className="font-semibold text-success-fg">{formatCurrency(payment.amount)}</Td>
                      <Td className="text-ink-700">{payment.paymentMethod || '—'}</Td>
                      <Td className="font-mono text-xs text-ink-500">{payment.transactionReferenceId || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          </Card>
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

