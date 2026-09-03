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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{project ? 'Edit project' : 'Create project'}</h2>
          <Button className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10" type="button" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form className="grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          <label className="space-y-2">
            <span className="text-sm text-muted">Project name</span>
            <Input {...register('projectName')} />
            {errors.projectName ? (
              <span className="text-xs text-red-300">{errors.projectName.message}</span>
            ) : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Find client</span>
            <Input
              placeholder="Search existing clients"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Client</span>
            <Select aria-label="Client" {...register('client')} disabled={Boolean(project)}>
              <option value="">Select an existing client</option>
              {(clientsQuery.data?.clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName} - {client.contactPerson}
                </option>
              ))}
            </Select>
            {errors.client ? <span className="text-xs text-red-300">{errors.client.message}</span> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Project value</span>
            <Input type="number" min="0" {...register('projectValue')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Assigned team/person</span>
            <Input {...register('assignedTeam')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Priority</span>
            <Input {...register('priority')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Status</span>
            <Select aria-label="Status" {...register('status')}>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Progress</span>
            <Input type="number" min="0" max="100" {...register('progressPercentage')} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Start date</span>
            <Input type="date" {...register('startDate')} defaultValue={toDateInput(project?.startDate)} />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Expected completion</span>
            <Input
              type="date"
              {...register('expectedCompletionDate')}
              defaultValue={toDateInput(project?.expectedCompletionDate)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-muted">Actual completion</span>
            <Input
              type="date"
              {...register('actualCompletionDate')}
              defaultValue={toDateInput(project?.actualCompletionDate)}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Description</span>
            <Textarea {...register('description')} />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Deliverables</span>
            <Textarea
              placeholder="One deliverable per line"
              defaultValue={project?.deliverables.join('\n') ?? ''}
              onChange={(event) => {
                const deliverables = event.target.value
                  .split('\n')
                  .map((item) => item.trim())
                  .filter(Boolean);
                setValue('deliverables', deliverables, { shouldDirty: true });
              }}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted">Notes</span>
            <Textarea {...register('notes')} />
          </label>

          <div className="flex justify-end gap-2 md:col-span-2">
            <Button className="bg-transparent text-white hover:bg-white/10" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
