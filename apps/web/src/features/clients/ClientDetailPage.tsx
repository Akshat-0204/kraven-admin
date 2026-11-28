import type { EntityLink } from '@kraven/types';
import type { ClientInput } from '@kraven/validation';
import { linkSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  FileText,
  FolderGit2,
  Globe,
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
import { ProjectStatusBadge } from '../../components/ui/statusBadge';
import { apiUrl } from '../../lib/api';
import {
  addClientLink,
  clientQueryKeys,
  getClient,
  removeClientDocument,
  removeClientLink,
  updateClient,
  uploadClientDocument
} from './clientApi';
import { clientInitials, formatDate } from './clientFormat';
import { ClientFormModal } from './ClientFormModal';
import { DocumentsPanel } from '../documents/DocumentsPanel';
import { EmailLogPanel } from '../portal/EmailLogPanel';
import { PacksPanel } from '../portal/PacksPanel';
import { PortalPanel, slugifyCompanyName } from '../portal/PortalPanel';
import { SharedFilesPanel } from '../portal/SharedFilesPanel';

type LinkInput = EntityLink;

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState<LinkInput>({ label: '', url: '' });

  const clientId = id ?? '';
  const clientQuery = useQuery({
    queryKey: clientQueryKeys.detail(clientId),
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId)
  });

  function refreshClient() {
    queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: clientQueryKeys.detail(clientId) });
    queryClient.invalidateQueries({ queryKey: ['files'] });
  }

  const updateMutation = useMutation({
    mutationFn: (input: ClientInput) => updateClient(clientId, input),
    onSuccess: () => {
      refreshClient();
      toast.success('Client updated');
    },
    onError: (error) => toast.error(error.message)
  });

  const addLinkMutation = useMutation({
    mutationFn: (input: LinkInput) => addClientLink(clientId, input),
    onSuccess: () => {
      setLinkDraft({ label: '', url: '' });
      refreshClient();
      toast.success('Link added');
    },
    onError: (error) => toast.error(error.message)
  });

  const removeLinkMutation = useMutation({
    mutationFn: (linkIndex: number) => removeClientLink(clientId, linkIndex),
    onSuccess: () => {
      refreshClient();
      toast.success('Link removed');
    },
    onError: (error) => toast.error(error.message)
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => uploadClientDocument(clientId, file),
    onSuccess: () => {
      refreshClient();
      toast.success('Document uploaded');
    },
    onError: (error) => toast.error(error.message)
  });

  const removeDocumentMutation = useMutation({
    mutationFn: (fileId: string) => removeClientDocument(clientId, fileId),
    onSuccess: () => {
      refreshClient();
      toast.success('Document removed');
    },
    onError: (error) => toast.error(error.message)
  });

  if (clientQuery.isLoading) {
    return (
      <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
        <p>Loading client details...</p>
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Link
          to="/clients"
          className="clay-btn clay-btn--secondary inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to clients</span>
        </Link>
        <div className="clay-card p-8 text-center font-body text-sm text-danger-fg">
          Unable to load client. Please check the URL or return to clients list.
        </div>
      </div>
    );
  }

  const { client, projects, activity } = clientQuery.data;

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
            to="/clients"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to clients</span>
          </Link>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-800 font-bold text-base shadow-[var(--clay-raised-sm)] border border-white/90">
              {clientInitials(client.companyName)}
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
                {client.companyName}
              </h1>
              <p className="font-body text-sm text-ink-500">Contact: {client.contactPerson}</p>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="clay-btn clay-btn--secondary inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Edit Client</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (col-span-2) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info Card */}
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-6">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Account Details</h2>
              <p className="font-body text-xs text-ink-500">Company registration, industry classification, and contact routes</p>
            </div>

            <dl className="grid gap-6 text-sm sm:grid-cols-2">
              <Info label="Email Address" value={client.email} />
              <Info label="Phone Number" value={client.phone} />
              <Info label="Website" value={client.website} isLink />
              <Info label="Industry" value={client.industry} />
              <Info label="Tax / GST Info" value={client.taxInfo} />
              <Info label="Account Source" value={client.sourceLead ? 'Converted from Lead' : 'Direct Agency Client'} />
              <Info className="sm:col-span-2" label="Registered Address" value={client.address} multiline />
            </dl>
          </section>

          {/* Operational & Brief Information */}
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-6">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Requirements & Notes</h2>
              <p className="font-body text-xs text-ink-500">Client preferences, technical guidelines, and confidential context</p>
            </div>

            <dl className="grid gap-6 text-sm">
              <Info label="General Notes" value={client.notes} multiline />
              <Info label="Client Requirements" value={client.requirements} multiline />
              <Info label="Important Information" value={client.importantInfo} multiline />
              <Info label="Internal Agency Notes" value={client.internalNotes} multiline />
            </dl>
          </section>

          {/* Linked Projects Card */}
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">Associated Projects</h2>
                <p className="font-body text-xs text-ink-500">Current and historical delivery contracts</p>
              </div>
              <span className="font-mono text-xs font-medium text-ink-600 bg-sand-200 px-2.5 py-0.5 rounded-pill border border-[rgba(120,110,90,0.12)]">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center font-body text-xs text-ink-500">
                No active or past projects associated with this client.
              </div>
            ) : (
              <div className="space-y-2.5">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-3.5 transition-colors hover:bg-surface group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-olive-100 text-olive-700 shadow-[var(--clay-raised-sm)]">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-ink-900 group-hover:text-olive-700 transition-colors truncate">
                          {project.projectName}
                        </p>
                        <p className="font-body text-xs text-ink-500">
                          {project.expectedCompletionDate ? `Target: ${formatDate(project.expectedCompletionDate)}` : 'In progress'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ProjectStatusBadge status={project.status} />
                      <span className="clay-chip text-xs bg-sand-200 text-ink-800 font-mono">
                        {project.progressPercentage}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (col-span-1) */}
        <div className="space-y-6">
          {/* Resource Links Card */}
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Resource Links</h2>
              <p className="font-body text-xs text-ink-500">Shared Drive, Slack channel, or documentation links</p>
            </div>

            <div className="space-y-2">
              {client.links.length === 0 ? (
                <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center text-xs text-ink-500">
                  No links added yet
                </div>
              ) : (
                client.links.map((link, index) => (
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
                    <ExternalLink className="h-3 w-3 text-ink-400 shrink-0" aria-hidden="true" />
                    <button
                      type="button"
                      aria-label="Remove link"
                      className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-400 hover:text-danger-fg transition-colors"
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
                placeholder="Link Label (e.g. Shared Google Drive)"
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
                className="clay-btn clay-btn--secondary w-full h-10 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700 flex items-center justify-center gap-1.5"
                onClick={submitLink}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Link</span>
              </button>
            </div>
          </section>

          {/* Uploaded Documents Card */}
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">Client Files</h2>
                <p className="font-body text-xs text-ink-500">Master contracts, NDAs, and onboarding assets</p>
              </div>
              <button
                type="button"
                aria-label="Upload document"
                className="clay-btn clay-btn--secondary h-9 w-9 rounded-pill flex items-center justify-center p-0 text-ink-700 hover:text-olive-700 shadow-[var(--clay-raised-sm)] border border-white/80"
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

            {client.documents.length === 0 ? (
              <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center text-xs text-ink-500">
                No documents uploaded
              </div>
            ) : (
              <div className="space-y-2">
                {client.documents.map((document) => (
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
                      className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-400 hover:text-danger-fg transition-colors"
                      onClick={() => removeDocumentMutation.mutate(document.fileId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Generated Documents Panel */}
          <DocumentsPanel scope={{ client: client.id }} />

          {/* Portal Settings Panel */}
          <PortalPanel clientId={client.id} defaultSlug={slugifyCompanyName(client.companyName)} />

          {/* Email Log Panel */}
          <EmailLogPanel clientId={client.id} hasEmail={Boolean(client.email)} />

          {/* Packs Panel */}
          <PacksPanel clientId={client.id} />

          {/* Shared Files Panel */}
          <SharedFilesPanel entityType="Client" entityId={client.id} />

          {/* Activity Log Card */}
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
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
                    <div className="font-body text-xs text-ink-800 font-medium">{item.description}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <ClientFormModal
        client={client}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={(input) => updateMutation.mutateAsync(input).then(() => undefined)}
      />
    </section>
  );
}

function Info({
  label,
  value,
  className,
  isLink = false,
  multiline = false
}: {
  label: string;
  value?: string;
  className?: string;
  isLink?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <dt className="font-display text-xs uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className={multiline ? 'mt-1.5 whitespace-pre-wrap font-body text-sm text-ink-800 bg-surface-soft p-3 rounded-md border border-[rgba(120,110,90,0.1)] leading-relaxed' : 'mt-1 font-body text-sm font-medium text-ink-900'}>
        {isLink && value ? (
          <a
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-olive-800 hover:text-olive-600 transition-colors font-medium"
          >
            <Globe className="h-3.5 w-3.5 text-olive-600" />
            <span>{value}</span>
          </a>
        ) : (
          value || '-'
        )}
      </dd>
    </div>
  );
}
