import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, ExternalLink, FilePlus2, FileText } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import {
  type DocumentScope,
  documentPdfDownloadUrl,
  documentQueryKeys,
  generateDocumentPdf,
  listDocuments
} from './documentApi';
import { DocumentStatusBadge, relativeTime } from './documentFormat';
import { NewDocumentDialog } from './NewDocumentDialog';

/**
 * Compact list of a client's (or project's) documents. Drafting, sending and PDF generation live in the
 * full-screen editor (`/documents/:id`); this panel links there and offers a quick PDF download.
 */
export function DocumentsPanel({ scope }: { scope: DocumentScope }) {
  const location = useLocation();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const documentsQuery = useQuery({ queryKey: documentQueryKeys.list(scope), queryFn: () => listDocuments(scope) });
  const documents = documentsQuery.data?.documents ?? [];
  const from = `${location.pathname}${location.search}`;

  // GET /pdf streams only an up-to-date stored PDF, so (re)render it first.
  const pdfMutation = useMutation({
    mutationFn: generateDocumentPdf,
    onSuccess: (_result, documentId) => window.location.assign(documentPdfDownloadUrl(documentId)),
    onError: (error) => toast.error(error.message)
  });

  return (
    <section className="rounded border border-border bg-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Documents</h2>
        <Button className="h-8 px-2" aria-label="New document" title="New document" onClick={() => setIsNewOpen(true)}>
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
              <Link to={`/documents/${document.id}`} state={{ from }} className="min-w-0 flex-1 hover:text-muted">
                <p className="truncate text-sm">{document.title}</p>
                <p className="text-xs text-muted" title={new Date(document.updatedAt).toLocaleString()}>
                  Updated {relativeTime(document.updatedAt)}
                </p>
              </Link>
              <DocumentStatusBadge status={document.status} />
              <Button
                className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                aria-label={`Download ${document.title}`}
                title="Download PDF"
                disabled={pdfMutation.isPending}
                onClick={() => pdfMutation.mutate(document.id)}
              >
                <Download className="h-3 w-3" aria-hidden="true" />
              </Button>
              <Button
                asChild
                className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                aria-label={`Open ${document.title}`}
                title="Open in editor"
              >
                <Link to={`/documents/${document.id}`} state={{ from }}>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
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
