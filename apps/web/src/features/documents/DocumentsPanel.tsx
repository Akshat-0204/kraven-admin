import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FilePlus2, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import {
  type DocumentScope,
  createDocument,
  documentPdfDownloadUrl,
  documentQueryKeys,
  generateDocumentPdf,
  listDocumentTemplates,
  listDocuments,
  previewDocumentTemplate
} from './documentApi';

/** Template-generated documents for a client or project: pick template, preview, create + PDF, download. */
export function DocumentsPanel({ scope }: { scope: DocumentScope }) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const documentsQuery = useQuery({ queryKey: documentQueryKeys.list(scope), queryFn: () => listDocuments(scope) });
  const templatesQuery = useQuery({
    queryKey: documentQueryKeys.templates,
    queryFn: listDocumentTemplates,
    enabled: isCreating
  });

  function download(documentId: string) {
    window.location.assign(documentPdfDownloadUrl(documentId));
  }

  const previewMutation = useMutation({
    mutationFn: () => previewDocumentTemplate(templateId, scope),
    onSuccess: ({ html }) => setPreviewHtml(html),
    onError: (error) => toast.error(error.message)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { document } = await createDocument({ template: templateId, ...scope });
      await generateDocumentPdf(document.id);
      return document;
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      toast.success('Document created');
      setIsCreating(false);
      setTemplateId('');
      setPreviewHtml(null);
      download(document.id);
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      toast.error(error.message);
    }
  });

  const pdfMutation = useMutation({
    mutationFn: generateDocumentPdf,
    onSuccess: (_result, documentId) => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      download(documentId);
    },
    onError: (error) => toast.error(error.message)
  });

  const documents = documentsQuery.data?.documents ?? [];
  const templates = templatesQuery.data?.templates ?? [];

  return (
    <section className="rounded border border-border bg-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Generated documents</h2>
        <Button className="h-8 px-2" aria-label="New document" onClick={() => setIsCreating((value) => !value)}>
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {isCreating ? (
        <div className="mb-4 space-y-2 rounded border border-border p-3">
          <Select
            aria-label="Template"
            value={templateId}
            onChange={(event) => {
              setTemplateId(event.target.value);
              setPreviewHtml(null);
            }}
          >
            <option value="">{templatesQuery.isLoading ? 'Loading templates...' : 'Choose a template'}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} (v{template.version})
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-transparent text-white hover:bg-white/10"
              disabled={!templateId || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? 'Loading...' : 'Preview'}
            </Button>
            <Button className="flex-1" disabled={!templateId || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Generating...' : 'Create PDF'}
            </Button>
          </div>
          {previewHtml !== null ? (
            <iframe
              title="Document preview"
              sandbox=""
              srcDoc={previewHtml}
              className="h-96 w-full rounded border border-border bg-white"
            />
          ) : null}
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No generated documents</div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-2 rounded border border-border p-2">
              <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{document.title}</p>
                <p className="text-xs text-muted">
                  {document.status} · v{document.templateVersion} ·{' '}
                  {new Date(document.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <Button
                className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                aria-label={`Download ${document.title}`}
                disabled={pdfMutation.isPending}
                onClick={() => pdfMutation.mutate(document.id)}
              >
                <Download className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
