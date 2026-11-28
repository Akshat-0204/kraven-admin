import type { DocumentAccessEntry, DocumentTemplateRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, FileText } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../../components/ui/modal';
import { Select } from '../../components/ui/select';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { googleQueryKeys, listAdmins, useGoogleStatus } from '../google/googleApi';
import { AccessPicker } from './AccessPicker';
import { createDocument, documentQueryKeys, listDocumentTemplates } from './documentApi';

export interface NewDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selects the client (e.g. when opened from a client or project page). */
  defaultClientId?: string;
  /** Attached to the new document while the default client stays selected. */
  defaultProjectId?: string;
}

/** Template picker: creates a Google Doc (copy of a template, or blank), shares it, and opens it in Google Docs. */
export function NewDocumentDialog({ open, onClose, defaultClientId, defaultProjectId }: NewDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState(defaultClientId ?? '');
  const [access, setAccess] = useState<DocumentAccessEntry[]>([]);
  const google = useGoogleStatus();

  useEffect(() => {
    if (open) setClientId(defaultClientId ?? '');
  }, [open, defaultClientId]);

  const adminsQuery = useQuery({ queryKey: googleQueryKeys.admins, queryFn: listAdmins, enabled: open });
  const admins = adminsQuery.data?.admins ?? [];
  // Admins start checked, once, each time the dialog opens.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!open) return setSeeded(false);
    if (!seeded && adminsQuery.data) {
      setAccess(adminsQuery.data.admins.map((admin) => ({ email: admin.email.toLowerCase(), role: 'writer' as const })));
      setSeeded(true);
    }
  }, [open, seeded, adminsQuery.data]);

  const templatesQuery = useQuery({ queryKey: documentQueryKeys.templates, queryFn: listDocumentTemplates, enabled: open });
  const clientsQuery = useQuery({ queryKey: clientQueryKeys.list({}), queryFn: () => listClients({}), enabled: open });

  const createMutation = useMutation({
    mutationFn: (templateId: string | null) =>
      createDocument({
        ...(templateId ? { template: templateId } : {}),
        ...(clientId ? { client: clientId } : {}),
        ...(clientId && clientId === defaultClientId && defaultProjectId ? { project: defaultProjectId } : {}),
        ...(access.length > 0 ? { access } : {})
      }),
    onSuccess: ({ document }) => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      onClose();
      window.open(document.webViewLink, '_blank', 'noopener');
    },
    onError: (error) => toast.error(error.message)
  });

  if (!open) return null;

  const templates = templatesQuery.data?.templates ?? [];
  const clients = clientsQuery.data?.clients ?? [];
  const pendingId = createMutation.isPending ? (createMutation.variables ?? 'blank') : null;

  return (
    <Modal
      open
      size="lg"
      title="New document"
      description="Creates a Google Doc from a template or blank, and opens it in Docs."
      onClose={onClose}
    >
      <div className="space-y-5">
        <label className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="font-body text-sm text-ink-500 sm:w-24">Client</span>
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

        <div>
          <p className="mb-2 font-body text-sm text-ink-500">Access</p>
          <AccessPicker value={access} onChange={setAccess} admins={admins} />
        </div>

        <div className="border-t border-[rgba(120,110,90,0.12)] pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PickerCard
              title="Blank document"
              subtitle="Start from scratch"
              icon={<FilePlus2 className="h-5 w-5" aria-hidden="true" />}
              disabled={createMutation.isPending || !google.ready}
              title_={google.reason}
              pending={pendingId === 'blank'}
              onPick={() => createMutation.mutate(null)}
            />
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                disabled={createMutation.isPending || !google.ready}
                title={google.reason}
                pending={pendingId === template.id}
                onPick={() => createMutation.mutate(template.id)}
              />
            ))}
          </div>
          {templatesQuery.isLoading ? <p className="mt-4 font-body text-sm text-ink-500">Loading templates...</p> : null}
          {templatesQuery.isError ? <p className="mt-4 font-body text-sm text-danger-fg">Unable to load templates.</p> : null}
        </div>
      </div>
    </Modal>
  );
}

function TemplateCard({
  template,
  title,
  disabled,
  pending,
  onPick
}: {
  template: DocumentTemplateRecord;
  title?: string;
  disabled: boolean;
  pending: boolean;
  onPick: () => void;
}) {
  return (
    <PickerCard
      title={template.name}
      subtitle={template.type}
      title_={title}
      icon={<FileText className="h-5 w-5" aria-hidden="true" />}
      disabled={disabled}
      pending={pending}
      onPick={onPick}
    />
  );
}

function PickerCard({
  title,
  title_,
  subtitle,
  snippet,
  icon,
  disabled,
  pending,
  onPick
}: {
  title: string;
  title_?: string;
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
      title={title_}
      disabled={disabled}
      onClick={onPick}
      className="clay-card group flex h-full flex-col overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:shadow-clay-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-300 disabled:cursor-wait disabled:opacity-60"
    >
      <div className="relative h-28 overflow-hidden border-b border-sand-200/40 bg-surface-soft px-4 py-3">
        {snippet ? (
          <p className="text-[10px] leading-snug text-ink-500">{snippet}</p>
        ) : (
          <div className="flex h-full items-center justify-center text-ink-500">{icon}</div>
        )}
      </div>
      <div className="flex items-start gap-2 p-3">
        <span className="mt-0.5 text-ink-500 group-hover:text-olive-700">{icon}</span>
        <div className="min-w-0">
          <p className="truncate font-body text-sm font-medium text-ink-900">{pending ? 'Creating…' : title}</p>
          <p className="truncate font-body text-xs text-ink-500">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
