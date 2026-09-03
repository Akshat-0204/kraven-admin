import { zodResolver } from '@hookform/resolvers/zod';
import { EXPENSE_CATEGORIES } from '@kraven/config';
import type { ExpenseRecord } from '@kraven/types';
import { expenseSchema, type ExpenseInput } from '@kraven/validation';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{expense ? 'Edit expense' : 'Create expense'}</h2>
          <Button className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10" type="button" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-2">
            <span className="text-sm text-muted">Name</span>
            <Input {...register('name')} />
            {errors.name ? <span className="text-xs text-red-300">{errors.name.message}</span> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Amount</span>
            <Input type="number" min="0" {...register('amount')} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Category</span>
            <Select {...register('category')}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Date</span>
            <Input type="date" {...register('date')} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Vendor</span>
            <Input {...register('vendor')} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Project</span>
            <Select {...register('associatedProject')}>
              <option value="">No project</option>
              {(projectsQuery.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.projectName}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Receipt</span>
            <div className="flex gap-2">
              <Input value={receipt?.filename ?? ''} readOnly placeholder="No receipt attached" />
              <Button type="button" onClick={() => fileInputRef.current?.click()}>Upload</Button>
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
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Notes</span>
            <Textarea {...register('notes')} />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button className="bg-transparent text-white hover:bg-white/10" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save expense'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
