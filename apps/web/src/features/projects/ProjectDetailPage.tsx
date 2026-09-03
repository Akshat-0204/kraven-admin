import { PROJECT_STATUSES } from '@kraven/config';
import type { EntityLink } from '@kraven/types';
import type { ProjectInput } from '@kraven/validation';
import { linkSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
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
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ProgressBar } from '../../components/ui/progressBar';
import { Select } from '../../components/ui/select';
import { ProjectStatusBadge } from '../../components/ui/statusBadge';
import { apiUrl } from '../../lib/api';
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

    if (clientId) {
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.detail(clientId) });
    }
  }

  const updateMutation = useMutation({
    mutationFn: (input: ProjectInput) => updateProject(projectId, input),
    onSuccess: (result) => {
      refreshProject(result.client.id);
      toast.success('Project updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const statusMutation = useMutation({
    mutationFn: (status: (typeof PROJECT_STATUSES)[number]) => updateProjectStatus(projectId, status),
    onSuccess: (result) => {
      refreshProject(result.client.id);
      toast.success('Project status updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const progressMutation = useMutation({
    mutationFn: (progressPercentage: number) => updateProjectProgress(projectId, progressPercentage),
    onSuccess: (result) => {
      refreshProject(result.client.id);
      toast.success('Project progress updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const addLinkMutation = useMutation({
    mutationFn: (input: LinkInput) => addProjectLink(projectId, input),
    onSuccess: () => {
      setLinkDraft({ label: '', url: '' });
      refreshProject(projectQuery.data?.client.id);
      toast.success('Link added');
    },
    onError: (error) => toast.error(error.message)
  });

  const removeLinkMutation = useMutation({
    mutationFn: (linkIndex: number) => removeProjectLink(projectId, linkIndex),
    onSuccess: () => {
      refreshProject(projectQuery.data?.client.id);
      toast.success('Link removed');
    },
    onError: (error) => toast.error(error.message)
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => uploadProjectDocument(projectId, file),
    onSuccess: () => {
      refreshProject(projectQuery.data?.client.id);
      toast.success('Document uploaded');
    },
    onError: (error) => toast.error(error.message)
  });

  const removeDocumentMutation = useMutation({
    mutationFn: (fileId: string) => removeProjectDocument(projectId, fileId),
    onSuccess: () => {
      refreshProject(projectQuery.data?.client.id);
      toast.success('Document removed');
    },
    onError: (error) => toast.error(error.message)
  });

  if (projectQuery.isLoading) {
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading project...</div>;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="space-y-4">
        <Button className="bg-transparent text-white hover:bg-white/10" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to projects
        </Button>
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load project.
        </div>
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Link className="inline-flex items-center text-sm text-muted hover:text-white" to="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Projects
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{project.projectName}</h1>
            <p className="mt-1 text-sm text-muted">{client.companyName}</p>
          </div>
          <div className="flex items-center gap-3">
            <ProjectStatusBadge status={project.status} />
            <span className="text-sm text-muted">{project.progressPercentage}% complete</span>
          </div>
        </div>
        <Button className="bg-transparent text-white hover:bg-white/10" onClick={() => setIsEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Overview</h2>
            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Progress</span>
                <span>{project.progressPercentage}%</span>
              </div>
              <ProgressBar value={project.progressPercentage} />
            </div>
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <Info label="Client" value={client.companyName} to={`/clients/${client.id}`} />
              <Info label="Project value" value={formatCurrency(project.projectValue)} />
              <Info label="Assigned" value={project.assignedTeam} />
              <Info label="Priority" value={project.priority} />
              <Info label="Start date" value={formatDate(project.startDate)} />
              <Info label="Expected completion" value={formatDate(project.expectedCompletionDate)} />
              <Info label="Actual completion" value={formatDate(project.actualCompletionDate)} />
              <Info className="md:col-span-2" label="Description" value={project.description} multiline />
              <Info className="md:col-span-2" label="Notes" value={project.notes} multiline />
            </dl>
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Update status</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={project.status}
                onChange={(event) => statusMutation.mutate(event.target.value as typeof project.status)}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min="0"
                max="100"
                defaultValue={project.progressPercentage}
                onBlur={(event) => progressMutation.mutate(Number(event.target.value))}
              />
            </div>
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Deliverables</h2>
            {project.deliverables.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-sm text-muted">
                No deliverables listed.
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {project.deliverables.map((deliverable) => (
                  <li key={deliverable} className="rounded border border-border bg-black p-2">
                    {deliverable}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Financials</h2>
            {financialsQuery.isLoading ? (
              <div className="rounded border border-border p-4 text-sm text-muted">Loading financials...</div>
            ) : financialsQuery.isError || !financialsQuery.data ? (
              <div className="rounded border border-red-400/40 p-4 text-sm text-red-200">
                Unable to load project financials.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <Metric label="Revenue" value={formatCurrency(financialsQuery.data.summary.revenue)} />
                <Metric label="Received" value={formatCurrency(financialsQuery.data.summary.received)} />
                <Metric label="Pending" value={formatCurrency(financialsQuery.data.summary.pending)} />
                <Metric label="Overdue" value={formatCurrency(financialsQuery.data.summary.overdue)} />
                <Metric label="Expenses" value={formatCurrency(financialsQuery.data.summary.expenses)} />
                <Metric label="Profit" value={formatCurrency(financialsQuery.data.summary.profit)} />
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Client</h2>
            <div className="space-y-2 text-sm">
              <Link className="block font-medium hover:text-muted" to={`/clients/${client.id}`}>
                {client.companyName}
              </Link>
              <div className="text-muted">{client.contactPerson}</div>
              <div className="text-muted">{client.email || '-'}</div>
              <div className="text-muted">{client.phone || '-'}</div>
            </div>
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Links</h2>
            <div className="space-y-2">
              {project.links.length === 0 ? (
                <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No links</div>
              ) : (
                project.links.map((link, index) => (
                  <div key={`${link.url}-${index}`} className="flex items-center gap-2 rounded border border-border p-2">
                    <LinkIcon className="h-4 w-4 text-muted" aria-hidden="true" />
                    <a className="min-w-0 flex-1 truncate text-sm hover:text-muted" href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted" aria-hidden="true" />
                    <Button
                      className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                      onClick={() => removeLinkMutation.mutate(index)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Label"
                value={linkDraft.label}
                onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))}
              />
              <Input
                placeholder="https://..."
                value={linkDraft.url}
                onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))}
              />
              <Button className="w-full" onClick={submitLink}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add link
              </Button>
            </div>
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Documents</h2>
              <Button className="h-8 px-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" aria-hidden="true" />
              </Button>
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
              <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No documents</div>
            ) : (
              <div className="space-y-2">
                {project.documents.map((document) => (
                  <div key={document.fileId} className="flex items-center gap-2 rounded border border-border p-2">
                    <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
                    <a
                      className="min-w-0 flex-1 truncate text-sm hover:text-muted"
                      href={apiUrl(`/files/${document.fileId}`)}
                    >
                      {document.filename}
                    </a>
                    <Button
                      className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                      onClick={() => removeDocumentMutation.mutate(document.fileId)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Activity</h2>
            {activity.length === 0 ? (
              <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No activity</div>
            ) : (
              <ol className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="border-l border-border pl-3">
                    <div className="text-xs text-muted">{formatDate(item.timestamp)}</div>
                    <div className="mt-1 text-sm">{item.description}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-black p-3">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
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
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className={multiline ? 'mt-1 whitespace-pre-wrap' : 'mt-1'}>
        {to && value ? (
          <Link className="hover:text-muted" to={to}>
            {value}
          </Link>
        ) : (
          value || '-'
        )}
      </dd>
    </div>
  );
}
