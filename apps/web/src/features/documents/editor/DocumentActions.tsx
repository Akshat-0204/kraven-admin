import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Download, Search, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { clientQueryKeys, listClients } from '../../clients/clientApi';
import { listProjects, projectQueryKeys } from '../../projects/projectApi';
import { documentPdfDownloadUrl, documentQueryKeys, generateDocumentPdf, shareDocument } from '../documentApi';
import type { EditorActionsApi } from './DocumentEditor';
import { Dialog, PillButton, Popover } from './ui';

export interface DocumentActionsProps {
  documentId: string;
  clientId: string | null;
  clientName?: string;
  projectId: string | null;
  readOnly: boolean;
  api: EditorActionsApi;
  /** Persist an assignment change; the page updates its local state and refetches variables. */
  onAssign: (next: { client: string | null; project: string | null }) => Promise<void>;
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function ClientPicker({
  clientId,
  clientName,
  disabled,
  onSelect
}: {
  clientId: string | null;
  clientName?: string;
  disabled: boolean;
  onSelect: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim(), 250);
  const filters = debounced ? { search: debounced } : {};
  const clients = useQuery({
    queryKey: clientQueryKeys.list(filters),
    queryFn: () => listClients(filters),
    enabled: open
  });
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Client"
        title="Client"
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 max-w-[180px] items-center gap-1 rounded-full border border-[#dadce0] bg-white px-3 text-sm text-[#1f1f1f] hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`truncate ${clientId ? '' : 'text-[#80868b]'}`}>{clientId ? (clientName ?? 'Client') : 'Assign client'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="right-0 w-72 pt-2">
        <label className="mx-2 mb-1 flex items-center gap-2 rounded-full bg-[#f1f3f4] px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#0b57d0]">
          <Search className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />
          <input
            autoFocus
            aria-label="Search clients"
            placeholder="Search clients"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-[#80868b]"
          />
        </label>
        <ul role="listbox" aria-label="Clients" className="max-h-64 overflow-y-auto">
          {clients.isLoading ? <li className="px-3 py-2 text-xs text-[#5f6368]">Loading…</li> : null}
          {clients.data?.clients.length === 0 ? <li className="px-3 py-2 text-xs text-[#5f6368]">No clients found.</li> : null}
          {clients.data?.clients.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                role="option"
                aria-selected={client.id === clientId}
                onClick={() => {
                  setOpen(false);
                  if (client.id !== clientId) onSelect(client.id, client.companyName);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-[#f1f3f4]"
              >
                <span className="truncate">{client.companyName}</span>
                {client.id === clientId ? <Check className="h-4 w-4 text-[#0b57d0]" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </Popover>
    </div>
  );
}

/** Document-mode top-bar: client/project assignment, PDF download, Send. */
export function DocumentActions({ documentId, clientId, clientName, projectId, readOnly, api, onAssign }: DocumentActionsProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const projectFilters = { client: clientId ?? undefined };
  const projects = useQuery({
    queryKey: projectQueryKeys.list(projectFilters),
    queryFn: () => listProjects(projectFilters),
    enabled: Boolean(clientId)
  });

  async function send() {
    setSending(true);
    try {
      await api.flush();
      await shareDocument(documentId);
      toast.success('Document sent — it is now visible in the client portal.');
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.detail(documentId) });
      await queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the document');
    } finally {
      setSending(false);
    }
  }

  const [downloading, setDownloading] = useState(false);

  /** GET /pdf only streams an up-to-date stored PDF (404 otherwise), so render it first via POST. */
  async function download() {
    setDownloading(true);
    try {
      await api.flush();
      await generateDocumentPdf(documentId);
      window.location.assign(documentPdfDownloadUrl(documentId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate the PDF');
    } finally {
      setDownloading(false);
    }
  }

  const sendDisabledReason = !clientId ? 'Assign a client before sending' : undefined;

  return (
    <>
      <ClientPicker
        clientId={clientId}
        clientName={clientName}
        disabled={readOnly}
        onSelect={(id) => void onAssign({ client: id, project: null })}
      />
      <select
        aria-label="Project"
        title={clientId ? 'Project' : 'Assign a client first'}
        disabled={readOnly || !clientId}
        value={projectId ?? ''}
        onChange={(event) => void onAssign({ client: clientId, project: event.target.value || null })}
        className="h-9 max-w-[180px] rounded-full border border-[#dadce0] bg-white px-3 text-sm text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">No project</option>
        {projects.data?.projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.projectName}
          </option>
        ))}
      </select>
      <PillButton
        variant="secondary"
        disabled={downloading}
        onClick={() => void download()}
        title="Download PDF"
        aria-label="Download PDF"
      >
        <Download className="h-4 w-4" />
        {downloading ? 'PDF…' : 'PDF'}
      </PillButton>
      {!readOnly ? (
        <span title={sendDisabledReason} data-testid="send-wrapper">
          <PillButton variant="primary" disabled={!clientId} onClick={() => setConfirming(true)}>
            <Send className="h-4 w-4" />
            Send
          </PillButton>
        </span>
      ) : null}
      <Dialog
        open={confirming}
        title="Send this document?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <PillButton variant="ghost" onClick={() => setConfirming(false)} disabled={sending}>
              Cancel
            </PillButton>
            <PillButton variant="primary" onClick={() => void send()} disabled={sending}>
              {sending ? 'Sending…' : 'Send to client'}
            </PillButton>
          </>
        }
      >
        <p>
          Sending shares the document in {clientName ? <strong>{clientName}</strong> : 'the client'}’s portal.
        </p>
        <p>
          All variables are filled in with the current client and project values and <strong>locked</strong>. The document
          becomes read-only; later changes to the client or project will not update it.
        </p>
      </Dialog>
    </>
  );
}
