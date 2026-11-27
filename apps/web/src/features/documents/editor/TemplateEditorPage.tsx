import { DOCUMENT_TEMPLATE_TYPES } from '@kraven/config';
import type { DocumentTemplateType } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  type EditorTemplate,
  createDocumentTemplate,
  documentQueryKeys,
  getDocumentTemplate,
  listDocumentVariables,
  previewDocumentTemplate,
  updateDocumentTemplate
} from '../documentApi';
import { ClientPicker } from './DocumentActions';
import { DocumentEditor } from './DocumentEditor';
import { Detail } from './DocumentEditorPage';
import { EditorLoading, EditorMessage } from './EditorStates';
import type { EditorPatch, EditorVariable } from './types';
import { Dialog, PillButton } from './ui';

/** `/templates/:id` — full-screen template editor. `/templates/new` creates a blank template and redirects. */
const TEMPLATES_BACK = '/documents?tab=templates';

export function TemplateEditorPage() {
  const { id = '' } = useParams();
  if (id === 'new') return <CreateTemplate />;
  return <TemplateLoader id={id} />;
}

function CreateTemplate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const started = useRef(false);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createDocumentTemplate({ name: 'Untitled template', type: 'Other', html: '<p></p>' })
      .then(({ template }) => {
        void queryClient.invalidateQueries({ queryKey: documentQueryKeys.templates });
        navigate(`/templates/${template.id}`, { replace: true });
      })
      .catch((error: unknown) => setFailed(error instanceof Error ? error.message : 'Could not create template'));
  }, [navigate, queryClient]);
  if (failed) return <EditorMessage backTo={TEMPLATES_BACK} message={failed} />;
  return <EditorLoading />;
}

function TemplateLoader({ id }: { id: string }) {
  const template = useQuery({ queryKey: documentQueryKeys.template(id), queryFn: () => getDocumentTemplate(id) });
  if (template.isLoading) return <EditorLoading />;
  if (template.isError || !template.data) {
    return <EditorMessage backTo={TEMPLATES_BACK} message={template.error instanceof Error ? template.error.message : 'Template not found'} />;
  }
  return <LoadedTemplateEditor key={id} template={template.data.template} />;
}

function LoadedTemplateEditor({ template }: { template: EditorTemplate }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<DocumentTemplateType>(template.type);
  const [meta, setMeta] = useState({ version: template.version, updatedAt: template.updatedAt });
  const [previewOpen, setPreviewOpen] = useState(false);
  const variablesQuery = useQuery({ queryKey: documentQueryKeys.variables, queryFn: listDocumentVariables });
  const variables = useMemo<EditorVariable[]>(
    () => (variablesQuery.data?.variables ?? []).map((variable) => ({ ...variable })),
    [variablesQuery.data]
  );

  const save = useCallback(
    async (patch: Partial<EditorPatch>) => {
      const { title, html, headerHtml, footerHtml, type: nextType } = patch;
      const body = Object.fromEntries(
        Object.entries({ name: title, html, headerHtml, footerHtml, type: nextType }).filter(([, value]) => value !== undefined)
      );
      const result = await updateDocumentTemplate(template.id, body);
      queryClient.setQueryData(documentQueryKeys.template(template.id), result);
      void queryClient.invalidateQueries({ queryKey: documentQueryKeys.templates, exact: true });
      setMeta({ version: result.template.version, updatedAt: result.template.updatedAt });
      return result;
    },
    [template.id, queryClient]
  );

  return (
    <>
      <DocumentEditor
        mode="template"
        docKey={template.id}
        title={template.name}
        initialHtml={template.html}
        initialHeaderHtml={template.headerHtml ?? ''}
        initialFooterHtml={template.footerHtml ?? ''}
        readOnly={false}
        variables={variables}
        statusLabel="Template"
        backTo={TEMPLATES_BACK}
        onSave={save}
        renderActions={(api) => (
          <PillButton
            variant="secondary"
            onClick={() => {
              void api.flush();
              setPreviewOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
            Preview
          </PillButton>
        )}
        details={
          <TemplateDetails
            type={type}
            onType={(next) => {
              setType(next);
              void save({ type: next }).catch(() => toast.error('Could not change the template type'));
            }}
            version={meta.version}
            updatedAt={meta.updatedAt}
          />
        }
      />
      {previewOpen ? <TemplatePreview templateId={template.id} onClose={() => setPreviewOpen(false)} /> : null}
    </>
  );
}

function TemplateDetails({
  type,
  onType,
  version,
  updatedAt
}: {
  type: DocumentTemplateType;
  onType: (type: DocumentTemplateType) => void;
  version: number;
  updatedAt: string;
}) {
  return (
    <dl className="space-y-3">
      <div>
        <dt className="text-xs text-[#5f6368]">
          <label htmlFor="kd-template-type">Type</label>
        </dt>
        <dd>
          <select
            id="kd-template-type"
            value={type}
            onChange={(event) => onType(event.target.value as DocumentTemplateType)}
            className="mt-1 h-9 w-full rounded-md border border-[#dadce0] bg-white px-2 text-sm text-[#1f1f1f]"
          >
            {DOCUMENT_TEMPLATE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </dd>
      </div>
      <Detail label="Version" value={`v${version}`} />
      <Detail label="Last updated" value={new Date(updatedAt).toLocaleString()} />
      <p className="text-xs text-[#5f6368]">Editing a template never changes documents already created from it.</p>
    </dl>
  );
}

function TemplatePreview({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const preview = useMutation({ mutationFn: (clientId: string) => previewDocumentTemplate(templateId, { client: clientId }) });
  return (
    <Dialog
      open
      title="Preview with a client"
      onClose={onClose}
      footer={
        <PillButton variant="ghost" onClick={onClose}>
          Close
        </PillButton>
      }
    >
      <p>Pick a client to see this template with their values filled in.</p>
      <ClientPicker
        clientId={client?.id ?? null}
        clientName={client?.name}
        disabled={false}
        onSelect={(id, name) => {
          setClient({ id, name });
          preview.mutate(id);
        }}
      />
      {preview.isPending ? <p>Rendering…</p> : null}
      {preview.isError ? <p className="text-[#b3261e]">{preview.error instanceof Error ? preview.error.message : 'Preview failed'}</p> : null}
      {preview.data ? (
        <iframe title="Template preview" sandbox="" srcDoc={preview.data.html} className="mt-2 h-96 w-full rounded border border-[#dadce0] bg-white" />
      ) : null}
    </Dialog>
  );
}
