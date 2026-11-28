import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import type { DocumentTemplateRecord, DocumentTemplateType } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/emptyState';
import { LoadingState } from '../../components/ui/loadingState';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { Select } from '../../components/ui/select';
import { Table, Td, Th } from '../../components/ui/dataTable';
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
    return (
      <Card>
        <LoadingState label="Loading templates..." />
      </Card>
    );
  }
  if (templatesQuery.isError) {
    return (
      <Card className="font-body text-sm text-danger-fg">Unable to load templates.</Card>
    );
  }
  if (templates.length === 0) {
    return (
      <Card>
        <EmptyState title={'No templates yet. Add a link to a Google Doc with "New template".'} />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <Table className="min-w-[560px]">
        <thead className="border-b border-sand-200/40 bg-sand-200/50">
          <tr>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>Google Doc</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200/30">
          {templates.map((template) => (
            <tr key={template.id} className="transition-colors hover:bg-surface-soft/60">
              <Td className="font-medium text-ink-900">{template.name}</Td>
              <Td className="text-ink-500">{template.type}</Td>
              <Td>
                <a
                  href={template.googleDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-olive-700 hover:text-olive-900"
                >
                  Open in Google Docs
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </Td>
              <Td className="text-right">
                <button type="button" className="mr-4 text-ink-500 hover:text-ink-900" onClick={() => onEdit(template)}>
                  Edit link
                </button>
                <button
                  type="button"
                  className="text-ink-500 hover:text-danger-fg"
                  onClick={() => {
                    if (window.confirm(`Delete template "${template.name}"?`)) remove.mutate(template.id);
                  }}
                >
                  Delete
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
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
    <Modal open size="sm" title={template ? 'Edit template' : 'New template'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 font-body text-sm">
          <span className="text-ink-500">Name (optional, defaults to the Google Doc title)</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1 font-body text-sm">
          <span className="text-ink-500">Type</span>
          <Select value={type} onChange={(event) => setType(event.target.value as DocumentTemplateType)}>
            {DOCUMENT_TEMPLATE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 font-body text-sm">
          <span className="text-ink-500">Google Doc link</span>
          <Input
            required
            placeholder="https://docs.google.com/document/d/..."
            value={googleDocUrl}
            onChange={(event) => setGoogleDocUrl(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[rgba(120,110,90,0.12)] pt-4">
          <Button type="button" className="bg-transparent shadow-none" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || !googleDocUrl.trim()}>
            {save.isPending ? 'Checking link...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
