import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import type { DocumentTemplateRecord, DocumentTemplateType } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { createDocumentTemplate, deleteDocumentTemplate, documentQueryKeys, listDocumentTemplates, updateDocumentTemplate } from './documentApi';

/** Templates tab: templates are links to Google Docs, edited in Google. */
export function TemplatesTab({ onEdit }: { onEdit: (template: DocumentTemplateRecord) => void }) {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({ queryKey: documentQueryKeys.templates, queryFn: listDocumentTemplates });
  const templates = templatesQuery.data?.templates ?? [];
  const remove = useMutation({
    mutationFn: deleteDocumentTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentQueryKeys.templates }),
    onError: (error) => toast.error(error.message)
  });

  if (templatesQuery.isLoading) {
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading templates...</div>;
  }
  if (templatesQuery.isError) {
    return <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">Unable to load templates.</div>;
  }
  if (templates.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
        No templates yet. Add a link to a Google Doc with "New template".
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-border bg-panel">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="p-3 font-medium">Name</th>
            <th className="p-3 font-medium">Type</th>
            <th className="p-3 font-medium">Google Doc</th>
            <th className="p-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id} className="border-b border-border last:border-0">
              <td className="p-3 font-medium">{template.name}</td>
              <td className="p-3 text-muted">{template.type}</td>
              <td className="p-3">
                <a
                  href={template.googleDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-muted"
                >
                  Open in Google Docs
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </td>
              <td className="p-3 text-right">
                <button type="button" className="mr-4 text-muted hover:text-white" onClick={() => onEdit(template)}>
                  Edit link
                </button>
                <button
                  type="button"
                  className="text-muted hover:text-red-300"
                  onClick={() => {
                    if (window.confirm(`Delete template "${template.name}"?`)) remove.mutate(template.id);
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Add / edit dialog: name, type and the Google Doc link. The API checks the link and read access. */
export function TemplateDialog({ template, onClose }: { template?: DocumentTemplateRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? '');
  const [type, setType] = useState<DocumentTemplateType>(template?.type ?? 'Proposal');
  const [googleDocUrl, setGoogleDocUrl] = useState(template?.googleDocUrl ?? '');

  const save = useMutation({
    mutationFn: () =>
      template
        ? updateDocumentTemplate(template.id, { name, type, googleDocUrl })
        : createDocumentTemplate({ name, type, googleDocUrl }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.templates });
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={template ? 'Edit template' : 'New template'}>
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded border border-border bg-panel p-5">
        <h2 className="text-lg font-semibold">{template ? 'Edit template' : 'New template'}</h2>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Name (optional, defaults to the Google Doc title)</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Type</span>
          <Select value={type} onChange={(event) => setType(event.target.value as DocumentTemplateType)}>
            {DOCUMENT_TEMPLATE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted">Google Doc link</span>
          <Input
            required
            placeholder="https://docs.google.com/document/d/..."
            value={googleDocUrl}
            onChange={(event) => setGoogleDocUrl(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" className="bg-transparent text-white hover:bg-white/10" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || !googleDocUrl.trim()}>
            {save.isPending ? 'Checking link...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
