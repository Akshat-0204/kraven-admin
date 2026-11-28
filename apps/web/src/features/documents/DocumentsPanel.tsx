import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FilePlus2, FileText, Send } from 'lucide-react';
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
  previewDocumentTemplate,
  shareDocument
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

  const shareMutation = useMutation({
    mutationFn: shareDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      toast.success('Shared in the client portal');
    },
    onError: (error) => toast.error(error.message)
  });

  const documents = documentsQuery.data?.documents ?? [];
  const templates = templatesQuery.data?.templates ?? [];

  return (
    <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
        <div>
          <h2 className="font-display text-base font-bold text-ink-900">Generated Documents</h2>
          <p className="font-body text-xs text-ink-500">Produce and manage dynamic client or project paperwork</p>
        </div>
        <button
          type="button"
          aria-label="New document"
          onClick={() => setIsCreating((value) => !value)}
          className="clay-btn clay-btn--secondary h-9 w-9 rounded-pill flex items-center justify-center p-0 text-ink-700 hover:text-olive-700 shadow-[var(--clay-raised-sm)] border border-white/80"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Creation form */}
      {isCreating ? (
        <div className="space-y-3 rounded-md bg-surface-soft p-4 border border-[rgba(120,110,90,0.14)]">
          <div>
            <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5">
              Select Template
            </label>
            <Select
              aria-label="Template"
              value={templateId}
              onChange={(event) => {
                setTemplateId(event.target.value);
                setPreviewHtml(null);
              }}
              className="w-full bg-surface"
            >
              <option value="">{templatesQuery.isLoading ? 'Loading templates...' : 'Choose a template'}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} (v{template.version})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="clay-btn clay-btn--secondary flex-1 h-10 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700 disabled:opacity-50"
              disabled={!templateId || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? 'Loading...' : 'Preview'}
            </button>
            <button
              type="button"
              className="clay-btn clay-btn--primary flex-1 h-10 rounded-pill font-body text-xs font-medium text-white shadow-[var(--clay-green)] disabled:opacity-50"
              disabled={!templateId || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Generating...' : 'Create PDF'}
            </button>
          </div>

          {previewHtml !== null ? (
            <div className="pt-2">
              <iframe
                title="Document preview"
                sandbox=""
                srcDoc={previewHtml}
                className="h-96 w-full rounded-md border border-[rgba(120,110,90,0.16)] bg-white shadow-[var(--clay-inset-sm)]"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-6 text-center font-body text-xs text-ink-500">
          No generated documents
        </div>
      ) : (
        <div className="space-y-2.5">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center gap-3 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface p-3 transition-colors hover:bg-surface-soft/80"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-olive-100 text-olive-700 shadow-[var(--clay-raised-sm)]">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-semibold text-ink-900">{document.title}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="clay-chip text-[11px] py-0.5 px-2 bg-sand-200 text-ink-800">
                    {document.status}
                  </span>
                  <span className="font-body text-xs text-ink-500">
                    v{document.templateVersion} · {new Date(document.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {document.status === 'Draft' ? (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 text-ink-700 transition-all hover:text-olive-700 hover:shadow-[var(--clay-hover)] active:scale-[0.95] disabled:opacity-50"
                    aria-label={`Share ${document.title} in the client portal`}
                    title="Share in client portal"
                    disabled={shareMutation.isPending}
                    onClick={() => shareMutation.mutate(document.id)}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 text-ink-700 transition-all hover:text-olive-700 hover:shadow-[var(--clay-hover)] active:scale-[0.95] disabled:opacity-50"
                  aria-label={`Download ${document.title}`}
                  title="Download PDF"
                  disabled={pdfMutation.isPending}
                  onClick={() => pdfMutation.mutate(document.id)}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
