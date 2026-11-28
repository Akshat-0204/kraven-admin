import { zodResolver } from '@hookform/resolvers/zod';
import type { ClientRecord, FileReference } from '@kraven/types';
import { clientSchema, type ClientInput } from '@kraven/validation';
import { X } from 'lucide-react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

interface ClientFormModalProps {
  client?: ClientRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ClientInput) => Promise<void>;
}

function toDocumentInputs(documents?: FileReference[]): ClientInput['documents'] {
  return (documents ?? []).map((document) => ({
    ...document,
    uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : undefined
  }));
}

export function ClientFormModal({ client, isOpen, onClose, onSubmit }: ClientFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    values: {
      companyName: client?.companyName ?? '',
      contactPerson: client?.contactPerson ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      website: client?.website ?? '',
      address: client?.address ?? '',
      industry: client?.industry ?? '',
      taxInfo: client?.taxInfo ?? '',
      notes: client?.notes ?? '',
      requirements: client?.requirements ?? '',
      importantInfo: client?.importantInfo ?? '',
      internalNotes: client?.internalNotes ?? '',
      links: client?.links ?? [],
      documents: toDocumentInputs(client?.documents),
      sourceLead: client?.sourceLead
    }
  });

  if (!isOpen) {
    return null;
  }

  const submit: SubmitHandler<ClientInput> = async (values) => {
    await onSubmit(values);
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(235, 233, 227, 0.7)' }}
    >
      <div className="clay-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl p-6 sm:p-8 border border-white/90 shadow-[var(--clay-floating)] bg-surface animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              {client ? 'Edit Client' : 'Create New Client'}
            </h2>
            <p className="font-body text-xs text-ink-500">
              {client ? 'Update client organization details and preferences' : 'Add a new client account to your agency directory'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 text-ink-500 hover:text-ink-900 hover:shadow-[var(--clay-hover)] transition-all"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Form */}
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Company Name <span className="text-olive-700">*</span>
              </label>
              <Input
                {...register('companyName')}
                placeholder="e.g. Acme Corporation"
                className={errors.companyName ? 'outline-2 outline-[var(--danger-fg)]' : ''}
              />
              {errors.companyName ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.companyName.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Primary Contact Person <span className="text-olive-700">*</span>
              </label>
              <Input
                {...register('contactPerson')}
                placeholder="e.g. John Doe"
                className={errors.contactPerson ? 'outline-2 outline-[var(--danger-fg)]' : ''}
              />
              {errors.contactPerson ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.contactPerson.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                {...register('email')}
                placeholder="contact@acme.com"
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
                Website URL
              </label>
              <Input {...register('website')} placeholder="https://acme.com" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Industry
              </label>
              <Input {...register('industry')} placeholder="e.g. FinTech, Healthcare, SaaS" />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Tax / GST Identification
              </label>
              <Input {...register('taxInfo')} placeholder="e.g. 29AAAAA0000A1Z5" />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Registered Address
              </label>
              <Textarea {...register('address')} placeholder="Office address, city, country..." />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Client Requirements
              </label>
              <Textarea {...register('requirements')} placeholder="Scope notes, special technical constraints, or deliverables..." />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Important Information
              </label>
              <Textarea {...register('importantInfo')} placeholder="Critical billing instructions, SLA terms, key contacts..." />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Internal Agency Notes
              </label>
              <Textarea {...register('internalNotes')} placeholder="Private team context, relationship status, or preferences..." />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(120,110,90,0.12)]">
            <button
              type="button"
              className="clay-btn clay-btn--secondary h-11 px-5 rounded-pill font-body text-sm font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-ink-700"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn clay-btn--primary h-11 px-6 rounded-pill font-body text-sm font-medium text-white shadow-[var(--clay-green)] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
