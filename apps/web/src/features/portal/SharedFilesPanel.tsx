import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    <section className="rounded border border-border bg-panel p-4">
      <h2 className="text-sm font-semibold">Shared in portal</h2>
      <p className="mb-3 mt-1 text-xs text-muted">Ticked files appear in the client portal&apos;s Downloads.</p>
      {query.isLoading ? <p className="text-sm text-muted">Loading files...</p> : null}
      {!query.isLoading && files.length === 0 ? (
        <div className="rounded border border-dashed border-border p-3 text-sm text-muted">No files</div>
      ) : null}
      <ul className="space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={file.clientVisible}
                disabled={toggle.isPending}
                onChange={(event) => toggle.mutate({ id: file.id, clientVisible: event.target.checked })}
              />
              <span className="min-w-0 truncate">{file.filename}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
