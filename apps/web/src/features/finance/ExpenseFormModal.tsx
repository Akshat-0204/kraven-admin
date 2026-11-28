import { zodResolver } from '@hookform/resolvers/zod';
import { EXPENSE_CATEGORIES } from '@kraven/config';
import type { ExpenseRecord } from '@kraven/types';
import { expenseSchema, type ExpenseInput } from '@kraven/validation';
import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { errorMessage } from '../../lib/api';
import { applyServerErrors } from '../../lib/formErrors';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
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

// Date inputs need 'YYYY-MM-DD' strings; zod coerces them back to Date on submit.
function dateField(value?: string): Date {
  return (toDateInput(value) || new Date().toISOString().slice(0, 10)) as unknown as Date;
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
      date: dateField(expense?.date),
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
    setError,
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
    try {
      await onSubmit({ ...values, receipt });
    } catch (error) {
      applyServerErrors(error, setError, 'Could not save expense');
      return;
    }
    reset();
    onClose();
  };

  async function handleReceipt(file: File) {
    try {
      const upload = await uploadExpenseReceipt(file);
      setReceipt({
        fileId: upload.file.id,
        filename: upload.file.filename,
        contentType: upload.file.contentType,
        uploadedAt: new Date(upload.file.createdAt)
      });
    } catch (error) {
      toast.error(errorMessage(error, 'Could not upload receipt'));
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      title={expense ? 'Edit Expense' : 'Record Expense'}
      description="Log operational overhead, contractor disbursements, or project expenditures"
    >
        <form noValidate className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Expense Title <span className="text-olive-700">*</span></span>
            <Input placeholder="e.g. AWS Cloud Hosting, Ergonomic Chairs" {...register('name')} />
            {errors.name ? <span className="block text-xs font-body text-danger-fg">{errors.name.message}</span> : null}
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Amount <span className="text-olive-700">*</span></span>
            <Input type="number" min="0" step="any" {...register('amount')} />
            {errors.amount ? <span className="block text-xs font-body text-danger-fg">{errors.amount.message}</span> : null}
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Category <span className="text-olive-700">*</span></span>
            <Select aria-label="Category" {...register('category')}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            {errors.category ? <span className="block text-xs font-body text-danger-fg">{errors.category.message}</span> : null}
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Date <span className="text-olive-700">*</span></span>
            <Input type="date" {...register('date')} />
            {errors.date ? <span className="block text-xs font-body text-danger-fg">{errors.date.message}</span> : null}
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Vendor / Payee</span>
            <Input placeholder="e.g. Amazon Web Services, GitHub" {...register('vendor')} />
            {errors.vendor ? <span className="block text-xs font-body text-danger-fg">{errors.vendor.message}</span> : null}
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
            {errors.associatedProject ? <span className="block text-xs font-body text-danger-fg">{errors.associatedProject.message}</span> : null}
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
                className="clay-btn rounded-pill px-4 py-2 text-xs font-medium text-olive-700 hover:bg-olive-100"
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
            {errors.notes ? <span className="block text-xs font-body text-danger-fg">{errors.notes.message}</span> : null}
          </label>

          <div className="flex items-center justify-end gap-3 pt-2 md:col-span-2">
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
              {isSubmitting ? 'Saving...' : expense ? 'Update expense' : 'Save expense'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

