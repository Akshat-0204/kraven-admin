import { useQuery } from '@tanstack/react-query';
import { FilePlus2, FileText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { type DocumentScope, documentQueryKeys, listDocuments } from './documentApi';
import { useGoogleStatus } from '../google/googleApi';
import { DocumentActions, StalePdfBadge } from './DocumentActions';
import { DocumentStatusBadge, relativeTime } from './documentFormat';
import { NewDocumentDialog } from './NewDocumentDialog';

/**
 * Compact list of a client's (or project's) documents. Editing happens in Google Docs; this panel links there and
 * offers the document actions.
 */
export function DocumentsPanel({ scope }: { scope: DocumentScope }) {
  const google = useGoogleStatus();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const documentsQuery = useQuery({ queryKey: documentQueryKeys.list(scope), queryFn: () => listDocuments(scope) });
  const documents = documentsQuery.data?.documents ?? [];

  return (
    <section className="rounded border border-border bg-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Documents</h2>
        <Button className="h-8 px-2" aria-label="New document" title={google.reason ?? 'New document'} onClick={() => setIsNewOpen(true)}>
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {documentsQuery.isLoading ? (
        <p className="text-sm text-muted">Loading documents...</p>
      ) : documentsQuery.isError ? (
        <p className="text-sm text-red-200">Unable to load documents.</p>
      ) : documents.length === 0 ? (
        <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No documents yet</div>
      ) : (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-2 rounded border border-border p-2">
              <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <a href={document.webViewLink} target="_blank" rel="noreferrer" className="block truncate text-sm hover:text-muted">
                  {document.title}
                </a>
                <p className="text-xs text-muted" title={new Date(document.updatedAt).toLocaleString()}>
                  Updated {relativeTime(document.updatedAt)}
                  <StalePdfBadge document={document} />
                </p>
              </div>
              <DocumentStatusBadge status={document.status} />
              <DocumentActions document={document} />
            </li>
          ))}
        </ul>
      )}

      <NewDocumentDialog
        open={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        defaultClientId={scope.client}
        defaultProjectId={scope.project}
      />
    </section>
  );
}
