import type { ProjectUpdateRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, EmptyState, Input, LoadingState, Textarea } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import { toastError } from '../../lib/formErrors';
import {
  createProjectUpdate,
  deleteProjectUpdate,
  listEntityFiles,
  listProjectUpdates,
  portalAdminQueryKeys,
  updateProjectUpdate
} from './portalApi';

interface Draft {
  title: string;
  body: string;
  clientVisible: boolean;
  attachments: string[];
}

const EMPTY: Draft = { title: '', body: '', clientVisible: true, attachments: [] };

/** Project page panel: progress updates, optionally shown in the client portal with project-file attachments. */
export function ProjectUpdatesPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const queryKey = portalAdminQueryKeys.projectUpdates(projectId);
  const updates = useQuery({ queryKey, queryFn: () => listProjectUpdates(projectId) });
  const files = useQuery({
    queryKey: portalAdminQueryKeys.files('Project', projectId),
    queryFn: () => listEntityFiles('Project', projectId)
  });
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const save = useMutation({
    mutationFn: () =>
      editing === 'new'
        ? createProjectUpdate({ project: projectId, ...draft })
        : updateProjectUpdate(editing as string, draft),
    onSuccess: async () => {
      setEditing(null);
      setDraft(EMPTY);
      setErrors({});
      await refresh();
      toast.success('Update saved');
    },
    onError: (error) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setErrors(error.fieldErrors);
      toast.error(errorMessage(error, 'Could not save the update'));
    }
  });

  const toggle = useMutation({
    mutationFn: (update: ProjectUpdateRecord) => updateProjectUpdate(update.id, { clientVisible: !update.clientVisible }),
    onSuccess: refresh,
    onError: toastError('Could not change the update visibility')
  });

  const remove = useMutation({
    mutationFn: deleteProjectUpdate,
    onSuccess: refresh,
    onError: toastError('Could not delete the update')
  });

  function startEdit(update?: ProjectUpdateRecord) {
    setErrors({});
    setEditing(update ? update.id : 'new');
    setDraft(
      update
        ? { title: update.title, body: update.body, clientVisible: update.clientVisible, attachments: update.attachments }
        : EMPTY
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setErrors({ title: 'Enter a title for the update' });
      return;
    }
    setErrors({});
    save.mutate();
  }

  function toggleAttachment(id: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      attachments: checked ? [...current.attachments, id] : current.attachments.filter((item) => item !== id)
    }));
  }

  const projectFiles = files.data?.files ?? [];
  const fileName = (id: string) => projectFiles.find((file) => file.id === id)?.filename ?? 'File';
  const list = updates.data?.updates ?? [];

  return (
    <Card className="space-y-4">
      {/* Header */}
      <CardHeader
        title="Project Updates"
        subtitle="Milestone updates published to client portal"
        actions={
          editing === null ? (
            <Button type="button" onClick={() => startEdit()} className="h-9 gap-1.5 px-3.5 text-xs">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Post update</span>
            </Button>
          ) : null
        }
      />

      {/* Editing Form */}
      {editing !== null ? (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-md bg-surface-soft p-4 border border-[rgba(120,110,90,0.14)]">
          <label className="block font-body text-xs font-semibold text-ink-700">
            Title <span className="text-danger-fg">*</span>
          </label>
          <Input
            aria-label="Update title"
            placeholder="Update Title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            className="w-full bg-surface"
          />
          {errors.title ? <p className="font-body text-xs text-danger-fg">{errors.title}</p> : null}
          <Textarea
            aria-label="Update body"
            placeholder="What progress was made or changed?"
            rows={4}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            className="w-full bg-surface"
          />
          {errors.body ? <p className="font-body text-xs text-danger-fg">{errors.body}</p> : null}
          <label className="flex items-center gap-2 font-body text-xs text-ink-900 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={draft.clientVisible}
              onChange={(event) => setDraft({ ...draft, clientVisible: event.target.checked })}
              className="accent-olive-700 h-4 w-4 rounded"
            />
            <span>Visible to the client in their portal</span>
          </label>
          {projectFiles.length > 0 ? (
            <fieldset className="space-y-1.5 pt-2 border-t border-[rgba(120,110,90,0.1)]">
              <legend className="font-body text-xs font-medium text-ink-700 mb-1">
                Attachments (shown in client portal):
              </legend>
              {projectFiles.map((file) => (
                <label key={file.id} className="flex items-center gap-2 font-body text-xs text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.attachments.includes(file.id)}
                    onChange={(event) => toggleAttachment(file.id, event.target.checked)}
                    className="accent-olive-700 h-3.5 w-3.5 rounded"
                  />
                  <span className="truncate">{file.filename}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="clay-btn clay-btn--primary h-9 px-4 rounded-pill font-body text-xs font-medium text-white shadow-clay-green disabled:opacity-50"
            >
              {save.isPending ? 'Saving...' : 'Save Update'}
            </button>
            <Button type="button" className="h-9 text-xs" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {/* List */}
      {updates.isLoading ? <LoadingState label="Loading updates..." className="py-4" /> : null}
      {updates.isError ? (
        <p role="alert" className="font-body text-sm text-danger-fg">
          {errorMessage(updates.error, 'Unable to load updates.')}
        </p>
      ) : null}
      {files.isError ? (
        <p role="alert" className="font-body text-xs text-danger-fg">
          {errorMessage(files.error, 'Unable to load project files for attachments.')}
        </p>
      ) : null}
      {!updates.isLoading && !updates.isError && list.length === 0 ? (
        <EmptyState title="No updates posted yet" className="py-6" />
      ) : null}
      <ul className="space-y-3">
        {list.map((update) => (
          <li key={update.id} className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-ink-900">{update.title}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className={update.clientVisible ? 'clay-chip text-[10px] py-0.2 px-2 bg-olive-100 text-olive-900' : 'clay-chip text-[10px] py-0.2 px-2 bg-sand-200 text-ink-700'}>
                    {update.clientVisible ? 'Client visible' : 'Internal only'}
                  </span>
                  <span className="font-body text-xs text-ink-500">
                    {new Date(update.postedAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-500 hover:text-olive-700 transition-colors"
                  onClick={() => toggle.mutate(update)}
                  aria-label={update.clientVisible ? 'Hide from client' : 'Show to client'}
                  title={update.clientVisible ? 'Hide from client' : 'Show to client'}
                >
                  {update.clientVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-500 hover:text-olive-700 transition-colors"
                  onClick={() => startEdit(update)}
                  aria-label="Edit update"
                  title="Edit update"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="h-7 w-7 rounded-sm flex items-center justify-center text-ink-500 hover:text-danger-fg transition-colors"
                  onClick={() => {
                    if (window.confirm('Delete this update?')) remove.mutate(update.id);
                  }}
                  aria-label="Delete update"
                  title="Delete update"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {update.body ? (
              <p className="whitespace-pre-wrap font-body text-xs text-ink-700 leading-relaxed bg-surface p-2.5 rounded border border-[rgba(120,110,90,0.1)]">
                {update.body}
              </p>
            ) : null}
            {update.attachments.length > 0 ? (
              <p className="font-body text-xs text-ink-500">
                Attachments: {update.attachments.map(fileName).join(', ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
