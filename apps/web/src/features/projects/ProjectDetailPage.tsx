import { PROJECT_STATUSES } from '@kraven/config';
import type { EntityLink } from '@kraven/types';
import type { ProjectInput } from '@kraven/validation';
import { linkSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FileText,
  LinkIcon,
  Pencil,
  Plus,
  Trash2,
  Upload
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CardHeader,
  Input,
  LoadingState,
  ProgressBar,
  ProjectStatusBadge,
  Select
} from '../../components/ui';
import { apiUrl, errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
import { clientQueryKeys } from '../clients/clientApi';
import { financeQueryKeys, getProjectFinancials } from '../finance/financeApi';
import {
  addProjectLink,
  getProject,
  projectQueryKeys,
  removeProjectDocument,
  removeProjectLink,
  updateProject,
  updateProjectProgress,
  updateProjectStatus,
  uploadProjectDocument
} from './projectApi';
import { formatCurrency, formatDate } from './projectFormat';
import { ProjectFormModal } from './ProjectFormModal';
import { DocumentsPanel } from '../documents/DocumentsPanel';
import { ProjectUpdatesPanel } from '../portal/ProjectUpdatesPanel';
import { SharedFilesPanel } from '../portal/SharedFilesPanel';

type LinkInput = EntityLink;

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState<LinkInput>({ label: '', url: '' });

  const projectId = id ?? '';
  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId)
  });
  const financialsQuery = useQuery({
    queryKey: financeQueryKeys.project(projectId),
    queryFn: () => getProjectFinancials(projectId),
    enabled: Boolean(projectId)
  });

  function refreshProject(clientId?: string) {
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: ['files'] });

    if (clientId) {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.detail(clientId) });
    }
  }

  const updateMutation = useMutation({
    mutationFn: (input: ProjectInput) => updateProject(projectId, input),
    onSuccess: (result) => {
      refreshProject(result.client.id);
      toast.success('Project updated');
    }
    // Errors are surfaced by ProjectFormModal (inline field errors + toast).
  });

  const statusMutation = useMutation({
    mutationFn: (status: (typeof PROJECT_STATUSES)[number]) => updateProjectStatus(projectId, status),
    onSuccess: (result) => {
      refreshProject(result.client.id);
      toast.success('Project status updated');
    },
    onError: toastError('Could not update status')
  });

  const progressMutation = useMutation({
    mutationFn: (progressPercentage: number) => updateProjectProgress(projectId, progressPercentage),
    onSuccess: (result) => {
      refreshProject(result.client.id);
      toast.success('Project progress updated');
    },
    onError: toastError('Could not update progress')
  });

  const addLinkMutation = useMutation({
    mutationFn: (input: LinkInput) => addProjectLink(projectId, input),
    onSuccess: () => {
      setLinkDraft({ label: '', url: '' });
      refreshProject(projectQuery.data?.client.id);
      toast.success('Link added');
    },
    onError: toastError('Could not add link')
  });

  const removeLinkMutation = useMutation({
    mutationFn: (linkIndex: number) => removeProjectLink(projectId, linkIndex),
    onSuccess: () => {
      refreshProject(projectQuery.data?.client.id);
      toast.success('Link removed');
    },
    onError: toastError('Could not remove link')
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => uploadProjectDocument(projectId, file),
    onSuccess: () => {
      refreshProject(projectQuery.data?.client.id);
      toast.success('Document uploaded');
    },
    onError: toastError('Could not upload document')
  });

  const removeDocumentMutation = useMutation({
    mutationFn: (fileId: string) => removeProjectDocument(projectId, fileId),
    onSuccess: () => {
      refreshProject(projectQuery.data?.client.id);
      toast.success('Document removed');
    },
    onError: toastError('Could not remove document')
  });

  if (projectQuery.isLoading) {
    return (
      <Card>
        <LoadingState label="Loading project details..." />
      </Card>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="space-y-4">
        <Link
          to="/projects"
          className="clay-btn clay-btn--secondary inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to projects</span>
        </Link>
        <Card className="p-8 text-center font-body text-sm text-danger-fg">
          {errorMessage(projectQuery.error, 'Unable to load project. Please check the URL or return to projects list.')}
        </Card>
      </div>
    );
  }

  const { project, client, activity } = projectQuery.data;

  function submitLink() {
    const parsed = linkSchema.safeParse(linkDraft);

    if (!parsed.success) {
      toast.error('Enter a valid link label and URL');
      return;
    }

    addLinkMutation.mutate(parsed.data);
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-ink-500 hover:text-olive-700 transition-colors"
            to="/projects"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to projects</span>
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
                {project.projectName}
              </h1>
              <ProjectStatusBadge status={project.status} />
              <span className="clay-chip bg-sand-200 text-ink-900 text-xs font-mono">
                {project.progressPercentage}% complete
              </span>
            </div>
            <p className="font-body text-sm text-ink-500">Client: {client.companyName}</p>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="clay-btn clay-btn--secondary inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium text-ink-900 bg-surface shadow-clay-sm border border-white/80 hover:text-olive-700"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit Project</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (col-span-2) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview Card */}
          <Card className="space-y-6">
            <CardHeader title="Project Overview" subtitle="Milestones, schedule, and team assignment" />

            {/* Progress Bar Container */}
            <div className="rounded-md bg-surface-soft p-4 border border-[rgba(120,110,90,0.12)] space-y-2">
              <div className="flex items-center justify-between text-xs font-body font-medium">
                <span className="text-ink-700">Overall Progress</span>
                <span className="font-mono text-olive-900 font-bold">{project.progressPercentage}%</span>
              </div>
              <ProgressBar value={project.progressPercentage} />
            </div>

            <dl className="grid gap-6 text-sm sm:grid-cols-2">
              <Info label="Client" value={client.companyName} to={`/clients/${client.id}`} />
              <Info label="Project value" value={formatCurrency(project.projectValue)} />
              <Info label="Assigned Team" value={project.assignedTeam} />
              <Info label="Priority" value={project.priority} />
              <Info label="Start date" value={formatDate(project.startDate)} />
              <Info label="Expected completion" value={formatDate(project.expectedCompletionDate)} />
              <Info label="Actual completion" value={formatDate(project.actualCompletionDate)} />
              <Info className="sm:col-span-2" label="Description" value={project.description} multiline />
              <Info className="sm:col-span-2" label="Notes" value={project.notes} multiline />
            </dl>
          </Card>

          {/* Quick Status & Progress Control */}
          <Card className="space-y-4">
            <CardHeader title="Update Status & Progress" subtitle="Quickly adjust current phase and completion percentage" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-2">
                  Status Phase
                </label>
                <Select
                  value={project.status}
                  onChange={(event) => statusMutation.mutate(event.target.value as typeof project.status)}
                  className="w-full"
                >
                  {PROJECT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-2">
                  Progress Percentage (0-100)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={project.progressPercentage}
                  onBlur={(event) => progressMutation.mutate(Number(event.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          {/* Deliverables */}
          <Card className="space-y-4">
            <CardHeader title="Deliverables" subtitle="Agreed scope of work and completion items" />
            {project.deliverables.length === 0 ? (
              <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center font-body text-xs text-ink-500">
                No deliverables listed for this project.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {project.deliverables.map((deliverable) => (
                  <li
                    key={deliverable}
                    className="flex items-center gap-2.5 rounded-md bg-surface-soft p-3 border border-[rgba(120,110,90,0.12)] text-sm font-body text-ink-900"
                  >
                    <span className="h-2 w-2 rounded-full bg-olive-700 shrink-0" />
                    <span>{deliverable}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Financials Summary */}
          <Card className="space-y-4">
            <CardHeader title="Project Financials" subtitle="Invoiced revenue, received payments, and expenses" />
            {financialsQuery.isLoading ? (
              <div className="p-6 text-center font-body text-xs text-ink-500">Loading financials...</div>
            ) : financialsQuery.isError || !financialsQuery.data ? (
              <div className="rounded-md border border-danger-fg/30 bg-surface-soft p-4 text-xs text-danger-fg">
                {errorMessage(financialsQuery.error, 'Unable to load project financials.')}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Revenue" value={formatCurrency(financialsQuery.data.summary.revenue)} />
                <Metric label="Received" value={formatCurrency(financialsQuery.data.summary.received)} />
                <Metric label="Pending" value={formatCurrency(financialsQuery.data.summary.pending)} />
                <Metric label="Overdue" value={formatCurrency(financialsQuery.data.summary.overdue)} />
                <Metric label="Expenses" value={formatCurrency(financialsQuery.data.summary.expenses)} />
                <Metric label="Profit" value={formatCurrency(financialsQuery.data.summary.profit)} isHero />
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (col-span-1) */}
        <div className="space-y-6">
          {/* Client Details Card */}
          <Card className="space-y-3">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Client Details</h2>
            </div>
            <div className="space-y-2 text-sm font-body">
              <Link
                className="font-semibold text-ink-900 hover:text-olive-700 transition-colors block text-base"
                to={`/clients/${client.id}`}
              >
                {client.companyName}
              </Link>
              <div className="text-ink-700">{client.contactPerson}</div>
              <div className="text-xs text-ink-500">{client.email || '-'}</div>
              <div className="text-xs text-ink-500">{client.phone || '-'}</div>
            </div>
          </Card>

          {/* Links Card */}
          <Card className="space-y-4">
            <CardHeader title="Resource Links" subtitle="Figma, GitHub, Staging, or Drive URLs" />
            <div className="space-y-2">
              {project.links.length === 0 ? (
                <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center text-xs text-ink-500">
                  No links added yet
                </div>
              ) : (
                project.links.map((link, index) => (
                  <div
                    key={`${link.url}-${index}`}
                    className="flex items-center gap-2.5 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-2.5 transition-colors"
                  >
                    <LinkIcon className="h-4 w-4 text-olive-700 shrink-0" aria-hidden="true" />
                    <a
                      className="min-w-0 flex-1 truncate text-xs font-body font-medium text-ink-900 hover:text-olive-700 transition-colors"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                    <ExternalLink className="h-3 w-3 text-ink-500 shrink-0" aria-hidden="true" />
                    <button
                      type="button"
                      aria-label="Remove link"
                      className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-500 hover:text-danger-fg transition-colors"
                      onClick={() => removeLinkMutation.mutate(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2.5 pt-2 border-t border-[rgba(120,110,90,0.1)]">
              <Input
                placeholder="Link Label (e.g. Figma)"
                value={linkDraft.label}
                onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))}
              />
              <Input
                placeholder="https://..."
                value={linkDraft.url}
                onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))}
              />
              <button
                type="button"
                className="clay-btn clay-btn--secondary w-full h-10 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-clay-sm border border-white/80 hover:text-olive-700 flex items-center justify-center gap-1.5"
                onClick={submitLink}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Link</span>
              </button>
            </div>
          </Card>

          {/* Project Documents Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">Project Files</h2>
                <p className="font-body text-xs text-ink-500">Uploaded briefs, specs, and assets</p>
              </div>
              <button
                type="button"
                aria-label="Upload document"
                className="clay-btn clay-btn--secondary h-9 w-9 rounded-pill flex items-center justify-center p-0 text-ink-700 hover:text-olive-700 shadow-clay-sm border border-white/80"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
              </button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    uploadDocumentMutation.mutate(file);
                    event.target.value = '';
                  }
                }}
              />
            </div>
            {project.documents.length === 0 ? (
              <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center text-xs text-ink-500">
                No documents uploaded
              </div>
            ) : (
              <div className="space-y-2">
                {project.documents.map((document) => (
                  <div
                    key={document.fileId}
                    className="flex items-center gap-2.5 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-2.5 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-olive-700 shrink-0" aria-hidden="true" />
                    <a
                      className="min-w-0 flex-1 truncate text-xs font-body font-medium text-ink-900 hover:text-olive-700 transition-colors"
                      href={apiUrl(`/files/${document.fileId}`)}
                    >
                      {document.filename}
                    </a>
                    <button
                      type="button"
                      aria-label="Remove document"
                      className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-500 hover:text-danger-fg transition-colors"
                      onClick={() => removeDocumentMutation.mutate(document.fileId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Generated Documents Panel */}
          <DocumentsPanel scope={{ client: client.id, project: project.id }} />

          {/* Project Updates Portal Panel */}
          <ProjectUpdatesPanel projectId={project.id} />

          {/* Shared Files Portal Panel */}
          <SharedFilesPanel entityType="Project" entityId={project.id} />

          {/* Activity History */}
          <Card className="space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-olive-700" />
              <h2 className="font-display text-base font-bold text-ink-900">Activity History</h2>
            </div>
            {activity.length === 0 ? (
              <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center text-xs text-ink-500">
                No activity recorded
              </div>
            ) : (
              <ol className="space-y-3 pt-1">
                {activity.map((item) => (
                  <li key={item.id} className="relative pl-3.5 border-l-2 border-olive-500/50 space-y-0.5">
                    <div className="font-mono text-[11px] text-ink-500">{formatDate(item.timestamp)}</div>
                    <div className="font-body text-xs text-ink-900 font-medium">{item.description}</div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <ProjectFormModal
        project={project}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={(input) => updateMutation.mutateAsync(input).then(() => undefined)}
      />
    </section>
  );
}

function Metric({ label, value, isHero = false }: { label: string; value: string; isHero?: boolean }) {
  return (
    <div
      className={
        isHero
          ? 'rounded-md p-4 bg-olive-100/70 border border-olive-300 shadow-clay-sm'
          : 'rounded-md p-4 bg-surface-soft border border-[rgba(120,110,90,0.12)] shadow-clay-sm'
      }
    >
      <div className="font-display text-xs uppercase tracking-wider text-ink-500">{label}</div>
      <div className={isHero ? 'mt-1.5 font-body text-lg font-bold text-olive-900' : 'mt-1.5 font-body text-base font-semibold text-ink-900'}>
        {value}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  to,
  className,
  multiline = false
}: {
  label: string;
  value?: string;
  to?: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="font-display text-xs uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className={multiline ? 'mt-1.5 whitespace-pre-wrap font-body text-sm text-ink-900 bg-surface-soft p-3 rounded-md border border-[rgba(120,110,90,0.1)] leading-relaxed' : 'mt-1 font-body text-sm font-medium text-ink-900'}>
        {to && value ? (
          <Link className="font-semibold text-olive-900 hover:text-olive-700 transition-colors" to={to}>
            {value}
          </Link>
        ) : (
          value || '-'
        )}
      </dd>
    </div>
  );
}
