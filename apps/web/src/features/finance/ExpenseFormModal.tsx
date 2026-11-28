import { zodResolver } from '@hookform/resolvers/zod';
import { EXPENSE_CATEGORIES } from '@kraven/config';
import type { ExpenseRecord } from '@kraven/types';
import { expenseSchema, type ExpenseInput } from '@kraven/validation';
import { useQuery } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { listProjects, projectQueryKeys } from '../projects/projectApi';
import { uploadExpenseReceipt } from './financeApi';

interface ExpenseFormModalProps {
  expense?: ExpenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ExpenseInput) => Promise<void>;
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function toReceiptInput(receipt?: ExpenseRecord['receipt']): ExpenseInput['receipt'] {
  if (!receipt) {
    return undefined;
  }

  return {
    ...receipt,
    uploadedAt: receipt.uploadedAt ? new Date(receipt.uploadedAt) : undefined
  };
}

export function ExpenseFormModal({ expense, isOpen, onClose, onSubmit }: ExpenseFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [receipt, setReceipt] = useState<ExpenseInput['receipt']>(() => toReceiptInput(expense?.receipt));
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list({}),
    queryFn: () => listProjects({}),
    enabled: isOpen
  });

  const defaultValues = useMemo<ExpenseInput>(
    () => ({
      name: expense?.name ?? '',
      amount: expense?.amount ?? 0,
      category: expense?.category ?? 'Other',
      date: expense?.date ? new Date(expense.date) : new Date(),
      vendor: expense?.vendor ?? '',
      associatedProject: expense?.associatedProject ?? '',
      receipt,
      notes: expense?.notes ?? ''
    }),
    [expense, receipt]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors }
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    values: defaultValues
  });

  useEffect(() => {
    setReceipt(toReceiptInput(expense?.receipt));
  }, [expense]);

  if (!isOpen) return null;

  const submit: SubmitHandler<ExpenseInput> = async (values) => {
    await onSubmit({ ...values, receipt });
    reset();
    onClose();
  };

  async function handleReceipt(file: File) {
    const upload = await uploadExpenseReceipt(file);
    setReceipt({
      fileId: upload.file.id,
      filename: upload.file.filename,
      contentType: upload.file.contentType,
      uploadedAt: new Date(upload.file.createdAt)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#EBE9E3]/70 p-4">
      <div className="clay-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border border-white/80 bg-surface p-6 shadow-[var(--clay-raised-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sand-300/40 pb-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
              {expense ? 'Edit Expense' : 'Record Expense'}
            </h2>
            <p className="text-xs font-body text-ink-500">
              Log operational overhead, contractor disbursements, or project expenditures
            </p>
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
        <form className="mt-6 grid gap-6 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Expense Title</span>
            <Input placeholder="e.g. AWS Cloud Hosting, Ergonomic Chairs" {...register('name')} />
            {errors.name ? <span className="block text-xs font-body text-red-600">{errors.name.message}</span> : null}
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Amount</span>
            <Input type="number" min="0" step="any" {...register('amount')} />
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Category</span>
            <Select aria-label="Category" {...register('category')}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Date</span>
            <Input type="date" {...register('date')} defaultValue={toDateInput(expense?.date)} />
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Vendor / Payee</span>
            <Input placeholder="e.g. Amazon Web Services, GitHub" {...register('vendor')} />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Associated Project</span>
            <Select aria-label="Associated project" {...register('associatedProject')}>
              <option value="">No project (General Company Overhead)</option>
              {(projectsQuery.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName}
                </option>
              ))}
            </Select>
          </label>

          <div className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Receipt Attachment</span>
            <div className="flex gap-2">
              <Input
                value={receipt?.filename ?? ''}
                readOnly
                placeholder="No receipt attached"
                className="clay-input flex-1"
              />
              <Button
                type="button"
                className="clay-btn rounded-pill bg-surface px-4 py-2 text-xs font-medium text-olive-700 shadow-[var(--clay-raised-sm)] transition-all hover:bg-olive-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleReceipt(file);
                }}
              />
            </div>
          </div>

          <label className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Notes</span>
            <Textarea placeholder="Business purpose or item details..." {...register('notes')} />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2 md:col-span-2">
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
              {isSubmitting ? 'Saving...' : expense ? 'Update expense' : 'Save expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

