import type { ProjectUpdateRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
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

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const save = useMutation({
    mutationFn: () =>
      editing === 'new'
        ? createProjectUpdate({ project: projectId, ...draft })
        : updateProjectUpdate(editing as string, draft),
    onSuccess: async () => {
      setEditing(null);
      setDraft(EMPTY);
      await refresh();
      toast.success('Update saved');
    },
    onError: (error) => toast.error(error.message)
  });

  const toggle = useMutation({
    mutationFn: (update: ProjectUpdateRecord) => updateProjectUpdate(update.id, { clientVisible: !update.clientVisible }),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message)
  });

  const remove = useMutation({
    mutationFn: deleteProjectUpdate,
    onSuccess: refresh,
    onError: (error) => toast.error(error.message)
  });

  function startEdit(update?: ProjectUpdateRecord) {
    setEditing(update ? update.id : 'new');
    setDraft(
      update
        ? { title: update.title, body: update.body, clientVisible: update.clientVisible, attachments: update.attachments }
        : EMPTY
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.title.trim()) save.mutate();
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
    <section className="rounded border border-border bg-panel p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Updates</h2>
        {editing === null ? (
          <Button onClick={() => startEdit()}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Post update
          </Button>
        ) : null}
      </div>

      {editing !== null ? (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded border border-border p-3">
          <Input
            aria-label="Update title"
            placeholder="Title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <Textarea
            aria-label="Update body"
            placeholder="What changed?"
            rows={4}
            value={draft.body}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.clientVisible}
              onChange={(event) => setDraft({ ...draft, clientVisible: event.target.checked })}
            />
            Visible to the client
          </label>
          {projectFiles.length > 0 ? (
            <fieldset className="space-y-1">
              <legend className="text-xs text-muted">Attachments (also shown in the portal when the update is visible)</legend>
              {projectFiles.map((file) => (
                <label key={file.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.attachments.includes(file.id)}
                    onChange={(event) => toggleAttachment(file.id, event.target.checked)}
                  />
                  <span className="truncate">{file.filename}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending || !draft.title.trim()}>
              {save.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button className="bg-transparent text-white hover:bg-white/10" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {updates.isLoading ? <p className="text-sm text-muted">Loading updates...</p> : null}
      {!updates.isLoading && list.length === 0 ? (
        <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No updates</div>
      ) : null}
      <ul className="space-y-3">
        {list.map((update) => (
          <li key={update.id} className="rounded border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{update.title}</p>
                <p className="text-xs text-muted">
                  {new Date(update.postedAt).toLocaleDateString()} · {update.clientVisible ? 'Client can see' : 'Internal'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="p-1 text-muted hover:text-white"
                  onClick={() => toggle.mutate(update)}
                  aria-label={update.clientVisible ? 'Hide from client' : 'Show to client'}
                >
                  {update.clientVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" className="p-1 text-muted hover:text-white" onClick={() => startEdit(update)} aria-label="Edit update">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1 text-muted hover:text-red-300"
                  onClick={() => {
                    if (window.confirm('Delete this update?')) remove.mutate(update.id);
                  }}
                  aria-label="Delete update"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {update.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">{update.body}</p> : null}
            {update.attachments.length > 0 ? (
              <p className="mt-2 text-xs text-muted">Attachments: {update.attachments.map(fileName).join(', ')}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
