import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceRecord } from '@kraven/types';
import { paymentSchema, type PaymentInput } from '@kraven/validation';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded border border-border bg-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Record payment</h2>
          <p className="mt-1 text-sm text-muted">
            Outstanding: {formatCurrency(invoice.remainingAmount)}
          </p>
        </div>
        <form className="space-y-4 p-5" onSubmit={handleSubmit(submit)}>
          <label className="block space-y-2">
            <span className="text-sm text-muted">Amount</span>
            <Input type="number" min="1" max={invoice.remainingAmount} {...register('amount')} />
            {errors.amount ? <span className="text-xs text-red-300">{errors.amount.message}</span> : null}
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted">Payment date</span>
            <Input type="date" {...register('paymentDate')} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted">Method</span>
            <Input {...register('paymentMethod')} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted">Transaction reference</span>
            <Input {...register('transactionReferenceId')} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-muted">Notes</span>
            <Textarea {...register('notes')} />
          </label>
          <div className="flex justify-end gap-2">
            <Button className="bg-transparent text-white hover:bg-white/10" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Record'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
