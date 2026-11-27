import { DOCUMENT_STATUSES } from '@kraven/config';
import type { DocumentStatus, DocumentTemplateRecord } from '@kraven/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FilePlus2, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { cn } from '../../lib/utils';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { documentQueryKeys, searchDocuments } from './documentApi';
import { DocumentStatusBadge, relativeTime } from './documentFormat';
import { NewDocumentDialog } from './NewDocumentDialog';
import { TemplateDialog, TemplatesTab } from './TemplatesTab';

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** `/documents` — all documents (default tab) and templates (`?tab=templates`). */
export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'templates' ? 'templates' : 'documents';
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [templateDialog, setTemplateDialog] = useState<{ template?: DocumentTemplateRecord } | null>(null);

  function selectTab(next: 'documents' | 'templates') {
    setSearchParams(next === 'templates' ? { tab: 'templates' } : {}, { replace: true });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Proposals, contracts, agreements</p>
          <h1 className="mt-2 text-2xl font-semibold">Documents</h1>
        </div>
        {tab === 'templates' ? (
          <Button onClick={() => setTemplateDialog({})}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New template
          </Button>
        ) : (
          <Button onClick={() => setIsNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New document
          </Button>
        )}
      </div>

      <div role="tablist" aria-label="Documents sections" className="flex gap-1 border-b border-border">
        {(['documents', 'templates'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => selectTab(value)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition',
              tab === value ? 'border-white text-white' : 'border-transparent text-muted hover:text-white'
            )}
          >
            {value === 'templates' ? 'Templates' : 'Documents'}
          </button>
        ))}
      </div>

      {tab === 'templates' ? <TemplatesTab onEdit={(template) => setTemplateDialog({ template })} /> : <DocumentsTab onNew={() => setIsNewOpen(true)} />}

      {templateDialog ? <TemplateDialog template={templateDialog.template} onClose={() => setTemplateDialog(null)} /> : null}
      <NewDocumentDialog open={isNewOpen} onClose={() => setIsNewOpen(false)} />
    </section>
  );
}

function DocumentsTab({ onNew }: { onNew: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocumentStatus | ''>('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 300);

  useEffect(() => setPage(1), [q, status, clientId]);

  const filters = { q: q || undefined, status: status || undefined, client: clientId || undefined, page, limit: PAGE_SIZE };
  const documentsQuery = useQuery({
    queryKey: documentQueryKeys.search(filters),
    queryFn: () => searchDocuments(filters),
    placeholderData: keepPreviousData
  });
  const clientsQuery = useQuery({ queryKey: clientQueryKeys.list({}), queryFn: () => listClients({}) });

  const documents = documentsQuery.data?.documents ?? [];
  const total = documentsQuery.data?.total ?? 0;
  const limit = documentsQuery.data?.limit ?? PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const hasFilters = Boolean(q || status || clientId);
  const from = `${location.pathname}${location.search}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded border border-border bg-panel p-3 md:grid-cols-[1fr_180px_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          <Input
            className="pl-9"
            aria-label="Search documents"
            placeholder="Search by title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value as DocumentStatus | '')}>
          <option value="">All statuses</option>
          {DOCUMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select aria-label="Client filter" value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">All clients</option>
          {(clientsQuery.data?.clients ?? []).map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName}
            </option>
          ))}
        </Select>
      </div>

      {documentsQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading documents...</div>
      ) : documentsQuery.isError ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">Unable to load documents.</div>
      ) : documents.length === 0 ? (
        hasFilters ? (
          <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
            No documents match the current filters.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded border border-dashed border-border bg-panel p-10 text-center">
            <FilePlus2 className="h-8 w-8 text-muted" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">No documents yet</p>
              <p className="mt-1 text-sm text-muted">Draft a proposal, contract or agreement from a template, then send it to the client portal.</p>
            </div>
            <Button onClick={onNew}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New document
            </Button>
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Template</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr
                  key={document.id}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-white/5"
                  onClick={() => navigate(`/documents/${document.id}`, { state: { from } })}
                >
                  <td className="p-3">
                    <Link
                      className="font-medium hover:text-muted"
                      to={`/documents/${document.id}`}
                      state={{ from }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {document.title}
                    </Link>
                  </td>
                  <td className="p-3">
                    {document.client ? document.client.companyName : <span className="text-muted">Unassigned</span>}
                  </td>
                  <td className="p-3 text-muted">{document.template?.name ?? 'Blank'}</td>
                  <td className="p-3">
                    <DocumentStatusBadge status={document.status} />
                  </td>
                  <td className="p-3 text-muted" title={new Date(document.updatedAt).toLocaleString()}>
                    {relativeTime(document.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit ? (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span>
              Page {page} of {pageCount}
            </span>
            <Button
              className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
