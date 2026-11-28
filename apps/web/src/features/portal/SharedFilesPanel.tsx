import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { listEntityFiles, portalAdminQueryKeys, setFileClientVisible } from './portalApi';

/** Lists an entity's files with a toggle that shares each one in the client portal's Downloads. */
export function SharedFilesPanel({ entityType, entityId }: { entityType: 'Client' | 'Project'; entityId: string }) {
  const queryClient = useQueryClient();
  const queryKey = portalAdminQueryKeys.files(entityType, entityId);
  const query = useQuery({ queryKey, queryFn: () => listEntityFiles(entityType, entityId) });

  const toggle = useMutation({
    mutationFn: ({ id, clientVisible }: { id: string; clientVisible: boolean }) => setFileClientVisible(id, clientVisible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast.error(error.message)
  });

  const files = query.data?.files ?? [];

  return (
    <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
      <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
        <h2 className="font-display text-base font-bold text-ink-900">Shared in Portal</h2>
        <p className="font-body text-xs text-ink-500">Selected files are accessible in the client portal's Downloads.</p>
      </div>

      {query.isLoading ? <p className="font-body text-xs text-ink-500">Loading files...</p> : null}
      {!query.isLoading && files.length === 0 ? (
        <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center font-body text-xs text-ink-500">
          No files available to share
        </div>
      ) : null}

      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center gap-2.5 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-2.5"
          >
            <label className="flex items-center gap-2.5 font-body text-xs text-ink-800 cursor-pointer flex-1 min-w-0">
              <input
                type="checkbox"
                checked={file.clientVisible}
                disabled={toggle.isPending}
                onChange={(event) => toggle.mutate({ id: file.id, clientVisible: event.target.checked })}
                className="accent-olive-700 h-4 w-4 rounded"
              />
              <FileText className="h-3.5 w-3.5 text-olive-700 shrink-0" />
              <span className="min-w-0 truncate font-medium">{file.filename}</span>
            </label>
            <span className={file.clientVisible ? 'clay-chip text-[10px] py-0.2 px-2 bg-olive-100 text-olive-800' : 'clay-chip text-[10px] py-0.2 px-2 bg-sand-200 text-ink-700'}>
              {file.clientVisible ? 'Visible' : 'Hidden'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
