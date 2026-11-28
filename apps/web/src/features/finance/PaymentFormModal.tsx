import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceRecord } from '@kraven/types';
import { paymentSchema, type PaymentInput } from '@kraven/validation';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { formatCurrency } from './financeFormat';

interface PaymentFormModalProps {
  invoice: InvoiceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: PaymentInput) => Promise<void>;
}

export function PaymentFormModal({ invoice, isOpen, onClose, onSubmit }: PaymentFormModalProps) {
  const defaultValues = useMemo<PaymentInput>(
    () => ({
      invoice: invoice?.id ?? '',
      amount: invoice?.remainingAmount ?? 0,
      paymentDate: new Date(),
      paymentMethod: '',
      transactionReferenceId: '',
      notes: ''
    }),
    [invoice]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    values: defaultValues
  });

  if (!isOpen || !invoice) return null;

  async function submit(values: PaymentInput) {
    await onSubmit(values);
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#EBE9E3]/70 p-4">
      <div className="clay-card w-full max-w-md rounded-card border border-white/80 bg-surface p-6 shadow-[var(--clay-raised-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-300/40 pb-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">Record Payment</h2>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-body text-ink-500">Invoice: <strong className="text-ink-900">{invoice.invoiceNumber}</strong></span>
              <span className="clay-chip inline-flex items-center rounded-pill border border-amber-200/60 bg-[var(--warning-bg)] px-2 py-0.5 text-xs font-body font-medium text-[var(--warning-fg)] shadow-[var(--clay-raised-sm)]">
                Due: {formatCurrency(invoice.remainingAmount)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            className="clay-btn h-8 w-8 rounded-pill bg-surface p-0 text-ink-500 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-ink-900"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(submit)}>
          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Payment Amount</span>
            <Input type="number" min="1" max={invoice.remainingAmount} step="any" {...register('amount')} />
            {errors.amount ? <span className="block text-xs font-body text-red-600">{errors.amount.message}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Payment Date</span>
            <Input type="date" {...register('paymentDate')} />
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Payment Method</span>
            <Input placeholder="e.g. Bank Transfer, UPI, Credit Card" {...register('paymentMethod')} />
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Transaction Reference ID</span>
            <Input placeholder="e.g. UTR / Transaction #123456" {...register('transactionReferenceId')} />
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Notes</span>
            <Textarea placeholder="Optional clearing notes or bank account reference..." {...register('notes')} />
          </label>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              className="clay-btn rounded-pill bg-surface px-4 py-2 font-body text-sm font-medium text-ink-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-surface-soft hover:text-ink-900"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn--primary rounded-pill bg-[var(--grad-olive)] px-5 py-2 font-body text-sm font-medium text-white shadow-[var(--clay-raised-sm)] transition-all hover:opacity-95"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

