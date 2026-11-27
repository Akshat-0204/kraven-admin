import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FilePlus2, FileText, Pencil, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import {
  type DocumentScope,
  createDocument,
  documentPdfDownloadUrl,
  documentQueryKeys,
  generateDocumentPdf,
  getDocument,
  listDocumentTemplates,
  listDocuments,
  previewDocumentTemplate,
  shareDocument,
  updateDocument
} from './documentApi';

function bodyOf(html: string) {
  return new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
}

/** Minimal Draft editor: loads the document body into Tiptap and saves it back. */
function DraftEditor({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['documents', 'detail', documentId], queryFn: () => getDocument(documentId) });
  const [html, setHtml] = useState<string | null>(null);
  const saveMutation = useMutation({
    mutationFn: () => updateDocument(documentId, { html: html ?? bodyOf(detail.data?.document.html ?? '') }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.documents });
      toast.success('Document saved');
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });

  if (!detail.data) return <p className="mb-4 text-sm text-muted">Loading document...</p>;
  return (
    <div className="mb-4 space-y-2 rounded border border-border p-3">
      <TiptapEditor initialHtml={bodyOf(detail.data.document.html)} onChange={setHtml} variables={[]} />
      <div className="flex gap-2">
        <Button className="flex-1" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button className="flex-1 bg-transparent text-white hover:bg-white/10" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Template-generated documents for a client or project: pick template, preview, create + PDF, download. */
export function DocumentsPanel({ scope }: { scope: DocumentScope }) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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

      {editingId ? <DraftEditor key={editingId} documentId={editingId} onClose={() => setEditingId(null)} /> : null}

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
              {document.status === 'Draft' ? (
                <Button
                  className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                  aria-label={`Edit ${document.title}`}
                  title="Edit draft"
                  onClick={() => setEditingId(document.id)}
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                </Button>
              ) : null}
              {document.status === 'Draft' ? (
                <Button
                  className="h-7 w-7 bg-transparent p-0 text-white hover:bg-white/10"
                  aria-label={`Share ${document.title} in the client portal`}
                  title="Share in client portal"
                  disabled={shareMutation.isPending}
                  onClick={() => shareMutation.mutate(document.id)}
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                </Button>
              ) : null}
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
