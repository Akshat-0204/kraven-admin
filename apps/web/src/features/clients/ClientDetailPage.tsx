import type { EntityLink } from '@kraven/types';
import type { ClientInput } from '@kraven/validation';
import { linkSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, FileText, LinkIcon, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading client...</div>;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Button className="bg-transparent text-white hover:bg-white/10" onClick={() => navigate('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to clients
        </Button>
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load client.
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Link className="inline-flex items-center text-sm text-muted hover:text-white" to="/clients">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Clients
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-black text-sm">
              {clientInitials(client.companyName)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{client.companyName}</h1>
              <p className="mt-1 text-sm text-muted">{client.contactPerson}</p>
            </div>
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
            <h2 className="mb-4 text-sm font-semibold">Basic info</h2>
            <dl className="grid gap-4 text-sm md:grid-cols-2">
              <Info label="Email" value={client.email} />
              <Info label="Phone" value={client.phone} />
              <Info label="Website" value={client.website} isLink />
              <Info label="Industry" value={client.industry} />
              <Info label="Tax info" value={client.taxInfo} />
              <Info label="Source lead" value={client.sourceLead ? 'Converted lead' : 'Manual client'} />
              <Info className="md:col-span-2" label="Address" value={client.address} />
            </dl>
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">General info</h2>
            <dl className="grid gap-4 text-sm">
              <Info label="Notes" value={client.notes} multiline />
              <Info label="Requirements" value={client.requirements} multiline />
              <Info label="Important info" value={client.importantInfo} multiline />
              <Info label="Internal notes" value={client.internalNotes} multiline />
            </dl>
          </section>

          <section className="rounded border border-border bg-panel p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Projects</h2>
              <span className="text-xs text-muted">{projects.length}</span>
            </div>
            {projects.length === 0 ? (
              <div className="rounded border border-dashed border-border p-4 text-sm text-muted">
                No projects are associated with this client yet.
              </div>
            ) : (
              <div className="divide-y divide-border rounded border border-border">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="grid gap-2 p-3 text-sm hover:bg-white/5 md:grid-cols-4"
                  >
                    <div className="font-medium md:col-span-2">{project.projectName}</div>
                    <div className="text-muted">{project.status}</div>
                    <div className="text-muted">{project.progressPercentage}%</div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded border border-border bg-panel p-4">
            <h2 className="mb-4 text-sm font-semibold">Links</h2>
            <div className="space-y-2">
              {client.links.length === 0 ? (
                <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No links</div>
              ) : (
                client.links.map((link, index) => (
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
            {client.documents.length === 0 ? (
              <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No documents</div>
            ) : (
              <div className="space-y-2">
                {client.documents.map((document) => (
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
      <dt className="text-xs uppercase text-muted">{label}</dt>
      <dd className={multiline ? 'mt-1 whitespace-pre-wrap' : 'mt-1'}>
        {isLink && value ? (
          <a href={value} target="_blank" rel="noreferrer" className="hover:text-muted">
            {value}
          </a>
        ) : (
          value || '-'
        )}
      </dd>
    </div>
  );
}
