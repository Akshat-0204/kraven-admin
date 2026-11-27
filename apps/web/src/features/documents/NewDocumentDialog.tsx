import type { DocumentTemplateRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, FileText, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { createDocument, documentQueryKeys, listDocumentTemplates } from './documentApi';
import { htmlSnippet } from './documentFormat';

export interface NewDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selects the client (e.g. when opened from a client or project page). */
  defaultClientId?: string;
  /** Attached to the new document while the default client stays selected. */
  defaultProjectId?: string;
}

/** Template picker: creates a Draft (from a template or blank) and opens it in the editor. */
export function NewDocumentDialog({ open, onClose, defaultClientId, defaultProjectId }: NewDocumentDialogProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState(defaultClientId ?? '');

  useEffect(() => {
    if (open) setClientId(defaultClientId ?? '');
  }, [open, defaultClientId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const templatesQuery = useQuery({ queryKey: documentQueryKeys.templates, queryFn: listDocumentTemplates, enabled: open });
  const clientsQuery = useQuery({ queryKey: clientQueryKeys.list({}), queryFn: () => listClients({}), enabled: open });

  const createMutation = useMutation({
    mutationFn: (templateId: string | null) =>
      createDocument({
        ...(templateId ? { template: templateId } : {}),
        ...(clientId ? { client: clientId } : {}),
        ...(clientId && clientId === defaultClientId && defaultProjectId ? { project: defaultProjectId } : {})
      }),
    onSuccess: ({ document }) => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      onClose();
      navigate(`/documents/${document.id}`, { state: { from: `${location.pathname}${location.search}` } });
    },
    onError: (error) => toast.error(error.message)
  });

  if (!open) return null;

  const templates = templatesQuery.data?.templates ?? [];
  const clients = clientsQuery.data?.clients ?? [];
  const pendingId = createMutation.isPending ? (createMutation.variables ?? 'blank') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-document-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded border border-border bg-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="new-document-title" className="text-base font-semibold">
              New document
            </h2>
            <p className="mt-0.5 text-xs text-muted">Start from a template or a blank page. Variables fill in when you send.</p>
          </div>
          <Button className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <label className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-muted sm:w-24">Client</span>
            <Select
              aria-label="Client"
              className="sm:max-w-xs"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">No client yet (assign later)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
              {defaultClientId && !clients.some((client) => client.id === defaultClientId) ? (
                <option value={defaultClientId}>{clientsQuery.isLoading ? 'Loading…' : 'Current client'}</option>
              ) : null}
            </Select>
          </label>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PickerCard
              title="Blank document"
              subtitle="Start from scratch"
              icon={<FilePlus2 className="h-5 w-5" aria-hidden="true" />}
              disabled={createMutation.isPending}
              pending={pendingId === 'blank'}
              onPick={() => createMutation.mutate(null)}
            />
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                disabled={createMutation.isPending}
                pending={pendingId === template.id}
                onPick={() => createMutation.mutate(template.id)}
              />
            ))}
          </div>
          {templatesQuery.isLoading ? <p className="mt-4 text-sm text-muted">Loading templates...</p> : null}
          {templatesQuery.isError ? <p className="mt-4 text-sm text-red-200">Unable to load templates.</p> : null}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  disabled,
  pending,
  onPick
}: {
  template: DocumentTemplateRecord;
  disabled: boolean;
  pending: boolean;
  onPick: () => void;
}) {
  const snippet = htmlSnippet(template.html);
  return (
    <PickerCard
      title={template.name}
      subtitle={`${template.type} · v${template.version}`}
      snippet={snippet || 'Empty template'}
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
      disabled={disabled}
      pending={pending}
      onPick={onPick}
    />
  );
}

function PickerCard({
  title,
  subtitle,
  snippet,
  icon,
  disabled,
  pending,
  onPick
}: {
  title: string;
  subtitle: string;
  snippet?: string;
  icon: ReactNode;
  disabled: boolean;
  pending: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Use ${title}`}
      disabled={disabled}
      onClick={onPick}
      className="group flex h-full flex-col rounded border border-border bg-black text-left transition hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-wait disabled:opacity-60"
    >
      <div className="relative h-28 overflow-hidden border-b border-border bg-white px-4 py-3">
        {snippet ? (
          <p className="text-[10px] leading-snug text-neutral-600">{snippet}</p>
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">{icon}</div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white" />
      </div>
      <div className="flex items-start gap-2 p-3">
        <span className="mt-0.5 text-muted group-hover:text-white">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{pending ? 'Creating…' : title}</p>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
