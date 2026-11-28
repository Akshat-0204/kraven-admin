import { useQuery } from '@tanstack/react-query';
import { FilePlus2, FileText } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
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
    <Card>
      <CardHeader
        title="Documents"
        className="border-b border-[rgba(120,110,90,0.12)] pb-3"
        actions={
          <Button
            className="h-9 w-9 rounded-pill border border-white/80 p-0 shadow-clay-sm"
            aria-label="New document"
            title={google.reason ?? 'New document'}
            onClick={() => setIsNewOpen(true)}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
      />

      {documentsQuery.isLoading ? (
        <p className="font-body text-xs text-ink-500">Loading documents...</p>
      ) : documentsQuery.isError ? (
        <p role="alert" className="font-body text-sm text-danger-fg">{errorMessage(documentsQuery.error, 'Unable to load documents.')}</p>
      ) : documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center font-body text-xs text-ink-500">No documents yet</div>
      ) : (
        <ul className="space-y-2.5">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface p-3 transition-colors hover:bg-surface-soft/80">
              <FileText className="h-4 w-4 shrink-0 text-olive-700" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <a href={document.webViewLink} target="_blank" rel="noreferrer" className="block truncate font-body text-sm font-semibold text-ink-900 hover:text-olive-700">
                  {document.title}
                </a>
                <p className="font-body text-xs text-ink-500" title={new Date(document.updatedAt).toLocaleString()}>
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
    </Card>
  );
}
