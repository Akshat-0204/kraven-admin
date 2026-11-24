import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import type { DocumentTemplateType } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TiptapEditor } from '../../components/editor/TiptapEditor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import {
  createDocumentTemplate,
  documentQueryKeys,
  getDocumentTemplate,
  listDocumentVariables,
  updateDocumentTemplate
} from './documentApi';

export function TemplateEditorPage() {
  const { id = 'new' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const templateQuery = useQuery({
    queryKey: documentQueryKeys.template(id),
    queryFn: () => getDocumentTemplate(id),
    enabled: !isNew
  });
  const variablesQuery = useQuery({ queryKey: documentQueryKeys.variables, queryFn: listDocumentVariables });

  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentTemplateType>('Proposal');
  const [html, setHtml] = useState('');
  const template = templateQuery.data?.template;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setHtml(template.html);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: () => (isNew ? createDocumentTemplate({ name, type, html }) : updateDocumentTemplate(id, { name, type, html })),
    onSuccess: ({ template: saved }) => {
      queryClient.invalidateQueries({ queryKey: documentQueryKeys.templates });
      queryClient.setQueryData(documentQueryKeys.template(saved.id), { template: saved });
      toast.success(`Template saved (v${saved.version})`);
      if (isNew) navigate(`/templates/${saved.id}`, { replace: true });
    },
    onError: (error) => toast.error(error.message)
  });

  if (!isNew && templateQuery.isLoading) {
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading template...</div>;
  }
  if (!isNew && !template) {
    return <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">Unable to load template.</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Link className="inline-flex items-center text-sm text-muted hover:text-white" to="/templates">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to templates
          </Link>
          <h1 className="text-2xl font-semibold">{isNew ? 'New template' : template?.name}</h1>
          {template ? <p className="text-xs text-muted">Version {template.version}</p> : null}
        </div>
        <Button disabled={!name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="grid gap-3 rounded border border-border bg-panel p-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project Proposal" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Type</span>
          <Select value={type} onChange={(event) => setType(event.target.value as DocumentTemplateType)}>
            {DOCUMENT_TEMPLATE_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <TiptapEditor
        key={template ? `${template.id}:${template.version}` : 'new'}
        initialHtml={template?.html ?? ''}
        onChange={setHtml}
        variables={variablesQuery.data?.variables ?? []}
      />
      <p className="text-xs text-muted">
        Variables are written as {'{{client.company}}'} and filled when a document is created. Editing a template never
        changes documents already created from it.
      </p>
    </section>
  );
}
