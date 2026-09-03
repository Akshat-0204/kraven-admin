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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{client ? 'Edit client' : 'Create client'}</h2>
          <Button className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10" type="button" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-2">
            <span className="text-sm text-muted">Company</span>
            <Input {...register('companyName')} />
            {errors.companyName ? (
              <span className="text-xs text-red-300">{errors.companyName.message}</span>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Contact person</span>
            <Input {...register('contactPerson')} />
            {errors.contactPerson ? (
              <span className="text-xs text-red-300">{errors.contactPerson.message}</span>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Email</span>
            <Input type="email" {...register('email')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Phone</span>
            <Input {...register('phone')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Website</span>
            <Input {...register('website')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Industry</span>
            <Input {...register('industry')} />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Address</span>
            <Textarea {...register('address')} />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Requirements</span>
            <Textarea {...register('requirements')} />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Important info</span>
            <Textarea {...register('importantInfo')} />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Internal notes</span>
            <Textarea {...register('internalNotes')} />
          </label>

          <div className="flex justify-end gap-2 md:col-span-2">
            <Button className="bg-transparent text-white hover:bg-white/10" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
