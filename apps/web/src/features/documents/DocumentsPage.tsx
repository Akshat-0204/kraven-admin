import { DOCUMENT_STATUSES } from '@kraven/config';
import type { DocumentStatus, DocumentTemplateRecord } from '@kraven/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FilePlus2, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Table, Td, Th } from '../../components/ui/dataTable';
import { EmptyState } from '../../components/ui/emptyState';
import { Input } from '../../components/ui/input';
import { LoadingState } from '../../components/ui/loadingState';
import { PageHeader } from '../../components/ui/pageHeader';
import { Select } from '../../components/ui/select';
import { Tabs } from '../../components/ui/tabs';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import { documentQueryKeys, searchDocuments } from './documentApi';
import { DocumentActions, StalePdfBadge } from './DocumentActions';
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
      <PageHeader
        eyebrow="Proposals, contracts, agreements"
        title="Documents"
        actions={
          tab === 'templates' ? (
            <Button onClick={() => setTemplateDialog({})}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New template
            </Button>
          ) : (
            <Button onClick={() => setIsNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New document
            </Button>
          )
        }
      />

      <Tabs
        aria-label="Documents sections"
        value={tab}
        onChange={(id) => selectTab(id === 'templates' ? 'templates' : 'documents')}
        items={[
          { id: 'documents', label: 'Documents' },
          { id: 'templates', label: 'Templates' }
        ]}
      />

      {tab === 'templates' ? <TemplatesTab onEdit={(template) => setTemplateDialog({ template })} /> : <DocumentsTab onNew={() => setIsNewOpen(true)} />}

      {templateDialog ? <TemplateDialog template={templateDialog.template} onClose={() => setTemplateDialog(null)} /> : null}
      <NewDocumentDialog open={isNewOpen} onClose={() => setIsNewOpen(false)} />
    </section>
  );
}

function DocumentsTab({ onNew }: { onNew: () => void }) {
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

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-3 md:grid-cols-[1fr_180px_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 z-10 h-4 w-4 text-ink-500" aria-hidden="true" />
          <Input
            className="!pl-10"
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
      </Card>

      {documentsQuery.isLoading ? (
        <Card>
          <LoadingState label="Loading documents..." />
        </Card>
      ) : documentsQuery.isError ? (
        <Card role="alert" className="font-body text-sm text-danger-fg">{errorMessage(documentsQuery.error, 'Unable to load documents.')}</Card>
      ) : documents.length === 0 ? (
        hasFilters ? (
          <Card>
            <EmptyState title="No documents match the current filters." />
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={<FilePlus2 className="h-5 w-5" aria-hidden="true" />}
              title="No documents yet"
              description="Draft a proposal, contract or agreement from a template, then send it to the client portal."
              action={
                <Button onClick={onNew}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  New document
                </Button>
              }
            />
          </Card>
        )
      ) : (
        <Card padded={false}>
          <Table className="min-w-[820px]">
            <thead className="border-b border-sand-200/40 bg-sand-200/50">
              <tr>
                <Th>Title</Th>
                <Th>Client</Th>
                <Th>Template</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200/30">
              {documents.map((document) => (
                <tr key={document.id} className="transition-colors hover:bg-surface-soft/60">
                  <Td>
                    <a className="font-medium text-ink-900 hover:text-olive-700" href={document.webViewLink} target="_blank" rel="noreferrer">
                      {document.title}
                    </a>
                    <StalePdfBadge document={document} />
                  </Td>
                  <Td>
                    {document.client ? document.client.companyName : <span className="text-ink-500">Unassigned</span>}
                  </Td>
                  <Td className="text-ink-500">{document.template?.name ?? 'Blank'}</Td>
                  <Td>
                    <DocumentStatusBadge status={document.status} />
                  </Td>
                  <Td className="text-ink-500" title={new Date(document.updatedAt).toLocaleString()}>
                    {relativeTime(document.updatedAt)}
                  </Td>
                  <Td>
                    <DocumentActions document={document} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {total > limit ? (
        <div className="flex items-center justify-between font-body text-sm text-ink-500">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
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
