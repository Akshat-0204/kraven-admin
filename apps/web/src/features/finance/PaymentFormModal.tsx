import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceRecord } from '@kraven/types';
import { paymentSchema, type PaymentInput } from '@kraven/validation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors } from '../../lib/formErrors';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
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
      paymentDate: new Date().toISOString().slice(0, 10) as unknown as Date,
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
    setError,
    formState: { isSubmitting, errors }
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    values: defaultValues
  });

  if (!isOpen || !invoice) return null;

  async function submit(values: PaymentInput) {
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, setError, 'Could not record payment');
      return;
    }
    reset();
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="Record Payment"
      description={
        <span className="flex items-center gap-2 pt-1">
          <span className="text-xs font-body text-ink-500">
            Invoice: <strong className="text-ink-900">{invoice.invoiceNumber}</strong>
          </span>
          <span className="clay-chip inline-flex items-center rounded-pill border bg-warning-bg px-2 py-0.5 text-xs font-body font-medium text-warning-fg shadow-clay-sm">
            Due: {formatCurrency(invoice.remainingAmount)}
          </span>
        </span>
      }
    >
        <form noValidate className="space-y-4" onSubmit={handleSubmit(submit)}>
          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Payment Amount <span className="text-olive-700">*</span></span>
            <Input type="number" min="1" max={invoice.remainingAmount} step="any" {...register('amount')} />
            {errors.amount ? <span className="block text-xs font-body text-danger-fg">{errors.amount.message}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Payment Date <span className="text-olive-700">*</span></span>
            <Input type="date" {...register('paymentDate')} />
            {errors.paymentDate ? <span className="block text-xs font-body text-danger-fg">{errors.paymentDate.message}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Payment Method</span>
            <Input placeholder="e.g. Bank Transfer, UPI, Credit Card" {...register('paymentMethod')} />
            {errors.paymentMethod ? <span className="block text-xs font-body text-danger-fg">{errors.paymentMethod.message}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Transaction Reference ID</span>
            <Input placeholder="e.g. UTR / Transaction #123456" {...register('transactionReferenceId')} />
            {errors.transactionReferenceId ? <span className="block text-xs font-body text-danger-fg">{errors.transactionReferenceId.message}</span> : null}
          </label>

          <label className="block space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Notes</span>
            <Textarea placeholder="Optional clearing notes or bank account reference..." {...register('notes')} />
            {errors.notes ? <span className="block text-xs font-body text-danger-fg">{errors.notes.message}</span> : null}
          </label>

          {errors.invoice ? <span className="block text-xs font-body text-danger-fg">Invoice: {errors.invoice.message}</span> : null}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              className="clay-btn rounded-pill px-4 py-2 font-body text-sm font-medium text-ink-700"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn--primary rounded-pill px-5 py-2 font-body text-sm font-medium text-white"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

