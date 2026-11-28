import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceRecord } from '@kraven/types';
import { invoiceSchema, type InvoiceInput } from '@kraven/validation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
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
      lineItems: invoice?.lineItems ?? [],
      taxRate: invoice?.taxRate ?? 0,
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
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    values: defaultValues
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const watchedItems = useWatch({ control, name: 'lineItems' }) ?? [];
  const taxRate = Number(useWatch({ control, name: 'taxRate' }) ?? 0);
  const subtotal = watchedItems.reduce((sum, item) => sum + Number(item?.quantity ?? 0) * Number(item?.unitPrice ?? 0), 0);
  const tax = (subtotal * taxRate) / 100;

  if (!isOpen) return null;

  async function submit(values: InvoiceInput) {
    await onSubmit(values);
    reset();
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={invoice ? 'Edit Invoice' : 'Create Invoice'}
      description="Generate an itemized invoice for client billing and automated payment tracking"
    >
        <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Client</span>
            <Select aria-label="Client" {...register('client')}>
              <option value="">Select client</option>
              {(clientsQuery.data?.clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </Select>
            {errors.client ? <span className="block text-xs font-body text-danger-fg">{errors.client.message}</span> : null}
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Project</span>
            <Select aria-label="Project" {...register('project')}>
              <option value="">No project</option>
              {(projectsQuery.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Invoice Number</span>
            <Input placeholder="e.g. INV-2026-001" {...register('invoiceNumber')} />
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">
              Amount{fields.length > 0 ? ' (computed from items)' : ''}
            </span>
            <Input type="number" min="0" step="any" disabled={fields.length > 0} {...register('amount')} />
          </label>

          {/* Line items section */}
          <div className="space-y-3 rounded-card border border-[rgba(120,110,90,0.14)] bg-sand-200/50 p-4 shadow-clay-inset-sm md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-ink-900">Line Items</span>
                <span className="ml-2 text-xs font-body text-ink-500">Optional breakdown of deliverables</span>
              </div>
              <Button
                type="button"
                className="clay-btn h-8 rounded-pill px-3 text-xs font-medium text-olive-700 hover:bg-olive-100"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Add item
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_5.5rem_7.5rem_2.5rem] items-center gap-2">
                <Input
                  placeholder="Item description"
                  aria-label={`Item ${index + 1} description`}
                  {...register(`lineItems.${index}.description`)}
                />
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Qty"
                  aria-label={`Item ${index + 1} quantity`}
                  {...register(`lineItems.${index}.quantity`)}
                />
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Price"
                  aria-label={`Item ${index + 1} unit price`}
                  {...register(`lineItems.${index}.unitPrice`)}
                />
                <Button
                  type="button"
                  className="clay-btn h-10 w-9 rounded-pill p-0 text-ink-500 hover:bg-danger-bg hover:text-danger-fg"
                  aria-label="Remove item"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            {fields.length > 0 ? (
              <div className="border-t border-sand-200/40 pt-2 text-right text-xs font-body text-ink-700">
                Subtotal: <span className="font-semibold text-ink-900">₹{subtotal.toFixed(2)}</span> · Tax: <span className="font-semibold text-ink-900">₹{tax.toFixed(2)}</span> · Total: <span className="font-semibold text-success-fg">₹{(subtotal + tax).toFixed(2)}</span>
              </div>
            ) : null}
          </div>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Tax Rate (%)</span>
            <Input type="number" min="0" max="100" step="any" disabled={fields.length === 0} {...register('taxRate')} />
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Invoice Date</span>
            <Input type="date" {...register('invoiceDate')} defaultValue={toDateInput(invoice?.invoiceDate)} />
          </label>

          <label className="space-y-1.5">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Due Date</span>
            <Input type="date" {...register('dueDate')} defaultValue={toDateInput(invoice?.dueDate)} />
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">UPI Payee Profile</span>
            <Select aria-label="UPI payee" {...register('payeeProfile')}>
              <option value="">Default payee account</option>
              {(payeesQuery.data?.payeeProfiles ?? []).map((payee) => (
                <option key={payee.id} value={payee.id}>
                  {payee.name} ({payee.vpa}){payee.isDefault ? ' · default' : ''}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-700">Notes & Payment Instructions</span>
            <Textarea placeholder="Payment terms, bank routing info, or deliverables summary..." {...register('notes')} />
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
              {isSubmitting ? 'Saving...' : invoice ? 'Update invoice' : 'Save invoice'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
