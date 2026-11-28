import { zodResolver } from '@hookform/resolvers/zod';
import { PROJECT_STATUSES } from '@kraven/config';
import type { FileReference, ProjectRecord } from '@kraven/types';
import { projectSchema, type ProjectInput } from '@kraven/validation';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { clientQueryKeys, listClients } from '../clients/clientApi';

interface ProjectFormModalProps {
  project?: ProjectRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ProjectInput) => Promise<void>;
}

function toDateInput(value?: string) {
  return value ? value.slice(0, 10) : '';
}

function toDateValue(value?: string) {
  return value ? new Date(value) : undefined;
}

function toDocumentInputs(documents?: FileReference[]): ProjectInput['documents'] {
  return (documents ?? []).map((document) => ({
    ...document,
    uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : undefined
  }));
}

export function ProjectFormModal({ project, isOpen, onClose, onSubmit }: ProjectFormModalProps) {
  const [clientSearch, setClientSearch] = useState('');
  const clientsQuery = useQuery({
    queryKey: clientQueryKeys.list({ search: clientSearch }),
    queryFn: () => listClients({ search: clientSearch }),
    enabled: isOpen
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    values: {
      projectName: project?.projectName ?? '',
      client: project?.client ?? '',
      description: project?.description ?? '',
      projectValue: project?.projectValue ?? undefined,
      startDate: toDateValue(project?.startDate),
      expectedCompletionDate: toDateValue(project?.expectedCompletionDate),
      actualCompletionDate: toDateValue(project?.actualCompletionDate),
      status: project?.status ?? 'Not Started',
      progressPercentage: project?.progressPercentage ?? 0,
      assignedTeam: project?.assignedTeam ?? '',
      priority: project?.priority ?? '',
      notes: project?.notes ?? '',
      deliverables: project?.deliverables ?? [],
      links: project?.links ?? [],
      documents: toDocumentInputs(project?.documents)
    }
  });

  if (!isOpen) {
    return null;
  }

  const submit: SubmitHandler<ProjectInput> = async (values) => {
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
              {project ? 'Edit Project' : 'Create New Project'}
            </h2>
            <p className="font-body text-xs text-ink-500">
              {project ? 'Update project scope, team, and delivery timelines' : 'Define new project scope, client, and parameters'}
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
                Project Name <span className="text-olive-700">*</span>
              </label>
              <Input
                {...register('projectName')}
                placeholder="e.g. Brand Identity & Design System"
                className={errors.projectName ? 'outline-2 outline-[var(--danger-fg)]' : ''}
              />
              {errors.projectName ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.projectName.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Search Clients
              </label>
              <Input
                placeholder="Filter client list..."
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Client <span className="text-olive-700">*</span>
              </label>
              <Select
                aria-label="Client"
                {...register('client')}
                disabled={Boolean(project)}
                className={errors.client ? 'w-full outline-2 outline-[var(--danger-fg)]' : 'w-full'}
              >
                <option value="">Select an existing client</option>
                {(clientsQuery.data?.clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName} — {client.contactPerson}
                  </option>
                ))}
              </Select>
              {errors.client ? (
                <span className="block mt-1 font-body text-xs text-danger-fg">{errors.client.message}</span>
              ) : null}
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Project Value (INR)
              </label>
              <Input type="number" min="0" {...register('projectValue')} placeholder="500000" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Assigned Team or Person
              </label>
              <Input {...register('assignedTeam')} placeholder="e.g. Design Team, Akshat" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Priority
              </label>
              <Input {...register('priority')} placeholder="e.g. High, Medium, Urgent" />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Status
              </label>
              <Select aria-label="Status" {...register('status')} className="w-full">
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Progress Percentage (0 - 100)
              </label>
              <Input type="number" min="0" max="100" {...register('progressPercentage')} />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Start Date
              </label>
              <Input type="date" {...register('startDate')} defaultValue={toDateInput(project?.startDate)} />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Expected Completion
              </label>
              <Input
                type="date"
                {...register('expectedCompletionDate')}
                defaultValue={toDateInput(project?.expectedCompletionDate)}
              />
            </div>

            <div>
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Actual Completion
              </label>
              <Input
                type="date"
                {...register('actualCompletionDate')}
                defaultValue={toDateInput(project?.actualCompletionDate)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Project Description
              </label>
              <Textarea {...register('description')} placeholder="Detailed summary of project scope and requirements..." />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Deliverables (One deliverable per line)
              </label>
              <Textarea
                placeholder="Figma Component Library&#10;Next.js Web Portal&#10;API Documentation"
                defaultValue={project?.deliverables.join('\n') ?? ''}
                onChange={(event) => {
                  const deliverables = event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean);
                  setValue('deliverables', deliverables, { shouldDirty: true });
                }}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-body text-sm font-medium text-ink-700 mb-2">
                Internal Notes
              </label>
              <Textarea {...register('notes')} placeholder="Operational notes, credentials reference, or team remarks..." />
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
              {isSubmitting ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
