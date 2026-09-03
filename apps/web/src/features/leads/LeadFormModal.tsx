import { zodResolver } from '@hookform/resolvers/zod';
import { LEAD_STATUSES } from '@kraven/config';
import type { LeadRecord } from '@kraven/types';
import { leadSchema, type LeadInput } from '@kraven/validation';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';

interface LeadFormModalProps {
  lead?: LeadRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: LeadInput) => Promise<void>;
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function toDateValue(value?: string) {
  return value ? new Date(value) : undefined;
}

export function LeadFormModal({ lead, isOpen, onClose, onSubmit }: LeadFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    values: {
      name: lead?.name ?? '',
      companyName: lead?.companyName ?? '',
      email: lead?.email ?? '',
      phone: lead?.phone ?? '',
      leadSource: lead?.leadSource ?? '',
      serviceInterested: lead?.serviceInterested ?? '',
      estimatedValue: lead?.estimatedValue ?? undefined,
      assignedPerson: lead?.assignedPerson ?? '',
      dateCreated: toDateValue(lead?.dateCreated),
      lastContactedDate: toDateValue(lead?.lastContactedDate),
      nextFollowUpDate: toDateValue(lead?.nextFollowUpDate),
      status: lead?.status ?? 'New',
      notes: lead?.notes ?? ''
    }
  });

  if (!isOpen) {
    return null;
  }

  async function submit(values: LeadInput) {
    await onSubmit(values);
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{lead ? 'Edit lead' : 'Create lead'}</h2>
          <Button className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-2">
            <span className="text-sm text-muted">Contact name</span>
            <Input {...register('name')} />
            {errors.name ? <span className="text-xs text-red-300">{errors.name.message}</span> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Company</span>
            <Input {...register('companyName')} />
            {errors.companyName ? (
              <span className="text-xs text-red-300">{errors.companyName.message}</span>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Email</span>
            <Input type="email" {...register('email')} />
            {errors.email ? <span className="text-xs text-red-300">{errors.email.message}</span> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Phone</span>
            <Input {...register('phone')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Lead source</span>
            <Input {...register('leadSource')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Service interested</span>
            <Input {...register('serviceInterested')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Estimated value</span>
            <Input type="number" min="0" {...register('estimatedValue')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Assigned person</span>
            <Input {...register('assignedPerson')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Last contacted</span>
            <Input type="date" {...register('lastContactedDate')} defaultValue={toDateInput(lead?.lastContactedDate)} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Next follow-up</span>
            <Input type="date" {...register('nextFollowUpDate')} defaultValue={toDateInput(lead?.nextFollowUpDate)} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Status</span>
            <Select {...register('status')}>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Notes</span>
            <Textarea {...register('notes')} />
          </label>

          <div className="flex justify-end gap-2 md:col-span-2">
            <Button className="bg-transparent text-white hover:bg-white/10" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
