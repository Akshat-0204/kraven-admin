import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceRecord } from '@kraven/types';
import { invoiceSchema, type InvoiceInput } from '@kraven/validation';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { listPayeeProfiles, portalAdminQueryKeys } from '../portal/portalApi';
import { listProjects, projectQueryKeys } from '../projects/projectApi';

interface InvoiceFormModalProps {
  invoice?: InvoiceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: InvoiceInput) => Promise<void>;
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

export function InvoiceFormModal({ invoice, isOpen, onClose, onSubmit }: InvoiceFormModalProps) {
  const clientsQuery = useQuery({
    queryKey: clientQueryKeys.list({ search: '' }),
    queryFn: () => listClients({ search: '' }),
    enabled: isOpen
  });
  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list({}),
    queryFn: () => listProjects({}),
    enabled: isOpen
  });
  const payeesQuery = useQuery({
    queryKey: portalAdminQueryKeys.payees,
    queryFn: listPayeeProfiles,
    enabled: isOpen
  });

  const defaultValues = useMemo<InvoiceInput>(
    () => ({
      client: invoice?.client ?? '',
      project: invoice?.project ?? '',
      invoiceNumber: invoice?.invoiceNumber ?? '',
      amount: invoice?.amount ?? 0,
      invoiceDate: invoice?.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
      dueDate: invoice?.dueDate ? new Date(invoice.dueDate) : new Date(),
      paymentStatus: invoice?.paymentStatus ?? 'Pending',
      amountPaid: invoice?.amountPaid ?? 0,
      paymentDate: invoice?.paymentDate ? new Date(invoice.paymentDate) : undefined,
      paymentMethod: invoice?.paymentMethod ?? '',
      transactionReferenceId: invoice?.transactionReferenceId ?? '',
      notes: invoice?.notes ?? '',
      payeeProfile: invoice?.payeeProfile ?? ''
    }),
    [invoice]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    values: defaultValues
  });

  if (!isOpen) return null;

  async function submit(values: InvoiceInput) {
    await onSubmit(values);
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{invoice ? 'Edit invoice' : 'Create invoice'}</h2>
          <Button className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-2">
            <span className="text-sm text-muted">Client</span>
            <Select aria-label="Client" {...register('client')}>
              <option value="">Select client</option>
              {(clientsQuery.data?.clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>{client.companyName}</option>
              ))}
            </Select>
            {errors.client ? <span className="text-xs text-red-300">{errors.client.message}</span> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Project</span>
            <Select aria-label="Project" {...register('project')}>
              <option value="">No project</option>
              {(projectsQuery.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.projectName}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Invoice number</span>
            <Input {...register('invoiceNumber')} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Amount</span>
            <Input type="number" min="0" {...register('amount')} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Invoice date</span>
            <Input type="date" {...register('invoiceDate')} defaultValue={toDateInput(invoice?.invoiceDate)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted">Due date</span>
            <Input type="date" {...register('dueDate')} defaultValue={toDateInput(invoice?.dueDate)} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">UPI payee (client portal Pay button)</span>
            <Select aria-label="UPI payee" {...register('payeeProfile')}>
              <option value="">Default payee</option>
              {(payeesQuery.data?.payeeProfiles ?? []).map((payee) => (
                <option key={payee.id} value={payee.id}>
                  {payee.name} ({payee.vpa}){payee.isDefault ? ' · default' : ''}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Notes</span>
            <Textarea {...register('notes')} />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button className="bg-transparent text-white hover:bg-white/10" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save invoice'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
