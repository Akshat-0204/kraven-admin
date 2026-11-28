import { zodResolver } from '@hookform/resolvers/zod';
import { LEAD_STATUSES } from '@kraven/config';
import type { LeadRecord } from '@kraven/types';
import { leadSchema, type LeadInput } from '@kraven/validation';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, Textarea } from '../../components/ui';

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
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={lead ? 'Edit Lead' : 'Create New Lead'}
      description={lead ? 'Update lead information and status' : 'Enter lead contact and opportunity details'}
    >
        {/* Modal Form */}
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Contact Name <span className="text-olive-700">*</span>
              </label>
              <Input
                {...register('name')}
                placeholder="e.g. Rahul Sharma"
                className={errors.name ? 'outline-2 outline-[var(--danger-fg)]' : ''}
              />
              {errors.name ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.name.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Company Name <span className="text-olive-700">*</span>
              </label>
              <Input
                {...register('companyName')}
                placeholder="e.g. Acme Studio"
                className={errors.companyName ? 'outline-2 outline-[var(--danger-fg)]' : ''}
              />
              {errors.companyName ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.companyName.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                {...register('email')}
                placeholder="rahul@acme.com"
                className={errors.email ? 'outline-2 outline-[var(--danger-fg)]' : ''}
              />
              {errors.email ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.email.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Phone Number
              </label>
              <Input {...register('phone')} placeholder="+91 98765 43210" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Lead Source
              </label>
              <Input {...register('leadSource')} placeholder="e.g. Referral, Inbound, LinkedIn" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Service Interested
              </label>
              <Input {...register('serviceInterested')} placeholder="e.g. Website Redesign" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Estimated Value (INR)
              </label>
              <Input type="number" min="0" {...register('estimatedValue')} placeholder="250000" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Assigned Person
              </label>
              <Input {...register('assignedPerson')} placeholder="e.g. Akshat" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Last Contacted
              </label>
              <Input
                type="date"
                {...register('lastContactedDate')}
                defaultValue={toDateInput(lead?.lastContactedDate)}
              />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Next Follow-Up
              </label>
              <Input
                type="date"
                {...register('nextFollowUpDate')}
                defaultValue={toDateInput(lead?.nextFollowUpDate)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Status
              </label>
              <Select {...register('status')}>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Notes & Context
              </label>
              <Textarea {...register('notes')} placeholder="Project scope, timeline, client expectations..." />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(120,110,90,0.12)]">
            <Button type="button" className="h-11 px-5" onClick={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn clay-btn--primary h-11 px-6 rounded-pill font-body text-sm font-medium text-white shadow-clay-green disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
