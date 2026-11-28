import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import type { DocumentTemplateType } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, Save } from 'lucide-react';
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
    return (
      <div className="clay-card p-8 text-center font-body text-sm text-ink-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
        <p>Loading template...</p>
      </div>
    );
  }
  if (!isNew && !template) {
    return (
      <div className="clay-card p-8 text-center font-body text-sm text-danger-fg">
        Unable to load template. Please check the URL or return to templates.
      </div>
    );
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-ink-500 hover:text-olive-700 transition-colors"
            to="/templates"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to templates</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
              {isNew ? 'New Template' : template?.name}
            </h1>
            {template ? (
              <span className="clay-chip bg-olive-100 text-olive-800 text-xs">
                Version {template.version}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <Button
            disabled={!name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="h-11 px-6 rounded-pill"
          >
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Template'}</span>
          </Button>
        </div>
      </div>

      {/* Metadata Configuration Card */}
      <div className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
        <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
          <h2 className="font-display text-base font-bold text-ink-900">
            Template Properties
          </h2>
          <p className="font-body text-xs text-ink-500">
            Define template naming and category classification for document generation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 pt-1">
          <div>
            <label className="block font-body text-sm font-medium text-ink-700 mb-2">
              Template Name
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Master Services Agreement"
              className="w-full"
            />
          </div>

          <div>
            <label className="block font-body text-sm font-medium text-ink-700 mb-2">
              Document Type
            </label>
            <Select
              value={type}
              onChange={(event) => setType(event.target.value as DocumentTemplateType)}
              className="w-full"
            >
              {DOCUMENT_TEMPLATE_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Rich Text Editor Canvas */}
      <TiptapEditor
        key={template ? `${template.id}:${template.version}` : 'new'}
        initialHtml={template?.html ?? ''}
        onChange={setHtml}
        variables={variablesQuery.data?.variables ?? []}
      />

      {/* Helpful Guidelines Callout */}
      <div className="p-4 rounded-md bg-surface-soft border border-[rgba(120,110,90,0.14)] flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-700">
          <Info className="h-3.5 w-3.5" />
        </div>
        <p className="font-body text-xs text-ink-600 leading-relaxed">
          <span className="font-semibold text-ink-800">Dynamic Merge Fields: </span>
          Variables are wrapped in double curly braces like <code className="bg-sand-200 text-olive-900 px-1.5 py-0.5 rounded font-mono text-[11px]">{'{{client.company}}'}</code>.
          When creating a client or project document, Kraven automatically substitutes these tags with verified database records.
          Editing a template creates a new version increment and never alters already issued documents.
        </p>
      </div>
    </section>
  );
}
