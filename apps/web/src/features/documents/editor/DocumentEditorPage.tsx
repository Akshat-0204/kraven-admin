import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  type EditorDocument,
  type EditorRef,
  documentQueryKeys,
  getDocument,
  getDocumentVariables,
  refId,
  updateDocument
} from '../documentApi';
import { DocumentActions } from './DocumentActions';
import { DocumentEditor } from './DocumentEditor';
import type { EditorPatch, EditorVariable } from './types';
import { EditorLoading, EditorMessage } from './EditorStates';

const refName = (ref: EditorRef | null | undefined) =>
  ref && typeof ref === 'object' ? (ref.companyName ?? ref.projectName ?? ref.name) : undefined;

/** Where the editor's back link goes: the page that opened it (client/project/list), else `/documents`. */
export function useBackTo(fallback: string) {
  const state = useLocation().state as { from?: unknown } | null;
  return typeof state?.from === 'string' && state.from.startsWith('/') ? state.from : fallback;
}

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

/** `/documents/:id` — full-screen document editor. */
export function DocumentEditorPage() {
  const { id = '' } = useParams();
  const backTo = useBackTo('/documents');
  const document = useQuery({ queryKey: documentQueryKeys.detail(id), queryFn: () => getDocument(id), enabled: Boolean(id) });
  if (document.isLoading) return <EditorLoading />;
  if (document.isError || !document.data) {
    return <EditorMessage backTo={backTo} message={document.error instanceof Error ? document.error.message : 'Document not found'} />;
  }
  // Key on status so sharing (Draft -> Sent) remounts read-only with the merged HTML.
  return <LoadedDocumentEditor key={`${id}:${document.data.document.status}`} document={document.data.document} backTo={backTo} />;
}

function LoadedDocumentEditor({ document, backTo }: { document: EditorDocument; backTo: string }) {
  const queryClient = useQueryClient();
  const [assignment, setAssignment] = useState({
    client: refId(document.client) ?? null,
    clientName: refName(document.client),
    project: refId(document.project) ?? null
  });
  const variablesQuery = useQuery({
    queryKey: [...documentQueryKeys.documentVariables(document.id), assignment.client, assignment.project],
    queryFn: () => getDocumentVariables(document.id)
  });
  const variables = useMemo<EditorVariable[]>(
    () =>
      (variablesQuery.data?.variables ?? []).map((variable) => ({
        key: variable.key,
        label: variable.label,
        group: variable.group,
        value: variable.value
      })),
    [variablesQuery.data]
  );
  const readOnly = document.status !== 'Draft';

  const save = useCallback(
    async (patch: Partial<EditorPatch>) => {
      const { title, html, headerHtml, footerHtml, client, project } = patch;
      const body = Object.fromEntries(
        Object.entries({ title, html, headerHtml, footerHtml, client, project }).filter(([, value]) => value !== undefined)
      );
      const result = await updateDocument(document.id, body);
      queryClient.setQueryData(documentQueryKeys.detail(document.id), result);
      return result;
    },
    [document.id, queryClient]
  );

  const companyName = variables.find((variable) => variable.key === 'client.company')?.value ?? undefined;
  const templateName = refName(document.template);

  return (
    <DocumentEditor
      mode="document"
      docKey={document.id}
      title={document.title}
      initialHtml={document.html}
      initialHeaderHtml={document.headerHtml ?? ''}
      initialFooterHtml={document.footerHtml ?? ''}
      readOnly={readOnly}
      readOnlyReason={readOnly ? `${document.status} documents are locked — values were filled in when it was sent.` : undefined}
      variables={variables}
      statusLabel={document.status}
      backTo={backTo}
      onSave={save}
      renderActions={(api) => (
        <DocumentActions
          documentId={document.id}
          clientId={assignment.client}
          clientName={assignment.clientName ?? companyName}
          projectId={assignment.project}
          readOnly={readOnly}
          api={api}
          onAssign={async (next) => {
            const previous = assignment;
            setAssignment((current) => ({
              client: next.client,
              project: next.project,
              clientName: next.client === current.client ? current.clientName : undefined
            }));
            try {
              await api.saveNow({ client: next.client, project: next.project });
              await queryClient.invalidateQueries({ queryKey: documentQueryKeys.documentVariables(document.id) });
            } catch {
              setAssignment(previous);
            }
          }}
        />
      )}
      details={
        <dl className="space-y-3">
          <Detail label="Status" value={document.status} />
          <Detail label="Template" value={templateName ?? (document.template ? 'Template' : 'Blank document')} />
          <Detail label="Template version" value={document.templateVersion ? `v${document.templateVersion}` : '—'} />
          <Detail label="Last updated" value={formatDate(document.updatedAt)} />
          <Detail label="Values locked" value={document.mergedAt ? formatDate(document.mergedAt) : 'Not yet (locked on send)'} />
        </dl>
      }
    />
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#5f6368]">{label}</dt>
      <dd className="text-sm text-[#1f1f1f]">{value}</dd>
    </div>
  );
}
