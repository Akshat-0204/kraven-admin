import { zodResolver } from '@hookform/resolvers/zod';
import type { ClientRecord, FileReference } from '@kraven/types';
import { clientSchema, type ClientInput } from '@kraven/validation';
import { type FieldErrors, type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { applyServerErrors } from '../../lib/formErrors';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
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
    setError,
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
    try {
      await onSubmit(values);
    } catch (error) {
      applyServerErrors(error, setError, 'Could not save client');
      return;
    }
    reset();
    onClose();
  };

  // Fields without inputs here (links, documents, sourceLead) can fail validation silently; surface them.
  const onInvalid = (invalid: FieldErrors<ClientInput>) => {
    const hidden = (['links', 'documents', 'sourceLead'] as const).filter((key) => invalid[key]);
    if (hidden.length > 0) {
      toast.error(`Invalid data in: ${hidden.join(', ')}. Edit them from the client page.`);
    } else {
      toast.error('Please fix the highlighted fields');
    }
  };

  return (
    <Modal open onClose={onClose} title={client ? 'Edit Client' : 'Create New Client'} description={client ? 'Update client organization details and preferences' : 'Add a new client account to your agency directory'} size="lg">
        <form className="space-y-6" onSubmit={handleSubmit(submit, onInvalid)}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Company Name <span className="text-olive-700">*</span>
              </label>
              <Input
                {...register('companyName')}
                placeholder="e.g. Acme Corporation"
                className={errors.companyName ? 'outline-2 outline-danger-fg' : ''}
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
                className={errors.contactPerson ? 'outline-2 outline-danger-fg' : ''}
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
                className={errors.email ? 'outline-2 outline-danger-fg' : ''}
              />
              {errors.email ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.email.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Phone Number
              </label>
              <Input {...register('phone')} placeholder="+91 98765 43210" className={errors.phone ? 'outline-2 outline-danger-fg' : ''} />
              {errors.phone ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.phone.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Website URL
              </label>
              <Input {...register('website')} placeholder="https://acme.com" className={errors.website ? 'outline-2 outline-danger-fg' : ''} />
              {errors.website ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.website.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Industry
              </label>
              <Input {...register('industry')} placeholder="e.g. FinTech, Healthcare, SaaS" />
              {errors.industry ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.industry.message}</span>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Tax / GST Identification
              </label>
              <Input {...register('taxInfo')} placeholder="e.g. 29AAAAA0000A1Z5" />
              {errors.taxInfo ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.taxInfo.message}</span>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Registered Address
              </label>
              <Textarea {...register('address')} placeholder="Office address, city, country..." />
              {errors.address ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.address.message}</span>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Client Requirements
              </label>
              <Textarea {...register('requirements')} placeholder="Scope notes, special technical constraints, or deliverables..." />
              {errors.requirements ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.requirements.message}</span>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Important Information
              </label>
              <Textarea {...register('importantInfo')} placeholder="Critical billing instructions, SLA terms, key contacts..." />
              {errors.importantInfo ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.importantInfo.message}</span>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Internal Agency Notes
              </label>
              <Textarea {...register('internalNotes')} placeholder="Private team context, relationship status, or preferences..." />
              {errors.internalNotes ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.internalNotes.message}</span>
              ) : null}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(120,110,90,0.12)]">
            <button
              type="button"
              className="clay-btn clay-btn--secondary h-11 px-5 rounded-pill font-body text-sm font-medium text-ink-900 bg-surface shadow-clay-sm border border-white/80 hover:text-ink-700"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn clay-btn--primary h-11 px-6 rounded-pill font-body text-sm font-medium text-white shadow-clay-green disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        </form>
    </Modal>
  );
}
