import { DOCUMENT_CATEGORIES } from '@kraven/config';
import type { DocumentCategory, FileMetadataRecord } from '@kraven/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { listEntityFiles, portalAdminQueryKeys, updateFile } from './portalApi';

type FilePatch = { clientVisible?: boolean; filename?: string; category?: DocumentCategory };

function FileRow({ file, disabled, onPatch }: { file: FileMetadataRecord; disabled: boolean; onPatch: (patch: FilePatch) => void }) {
  const [name, setName] = useState(file.filename);
  const commitName = () => {
    const next = name.trim();
    if (!next) setName(file.filename);
    else if (next !== file.filename) onPatch({ filename: next });
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-2.5 font-body text-sm text-ink-800">
      <Input
        aria-label={`Filename ${file.filename}`}
        className="h-8 min-w-0 flex-1"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
      />
      <Select
        aria-label={`Category for ${file.filename}`}
        className="h-8 w-28"
        value={file.category ?? 'Other'}
        disabled={disabled}
        onChange={(event) => onPatch({ category: event.target.value as DocumentCategory })}
      >
        {DOCUMENT_CATEGORIES.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </Select>
      <label className="flex items-center cursor-pointer gap-1 text-xs text-ink-500">
        <input
          type="checkbox"
          className="h-4 w-4 accent-olive-700"
          aria-label={`Share ${file.filename}`}
          checked={file.clientVisible}
          disabled={disabled}
          onChange={(event) => onPatch({ clientVisible: event.target.checked })}
        />
        Client
      </label>
    </li>
  );
}

/** Lists an entity's files grouped by category, with rename, category and portal-visibility controls. */
export function SharedFilesPanel({ entityType, entityId }: { entityType: 'Client' | 'Project'; entityId: string }) {
  const queryClient = useQueryClient();
  const queryKey = portalAdminQueryKeys.files(entityType, entityId);
  const query = useQuery({ queryKey, queryFn: () => listEntityFiles(entityType, entityId) });

  const patch = useMutation({
    mutationFn: ({ id, ...input }: FilePatch & { id: string }) => updateFile(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => toast.error(error.message)
  });

  const files = query.data?.files ?? [];
  const groups = new Map<string, FileMetadataRecord[]>();
  for (const file of files) {
    const key = file.category ?? 'Other';
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return (
    <Card className="space-y-4">
      <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
        <h2 className="font-display text-base font-bold text-ink-900">Files</h2>
        <p className="font-body text-xs text-ink-500">Ticked files appear in the client portal&apos;s Downloads.</p>
      </div>
      {query.isLoading ? <p className="font-body text-xs text-ink-500">Loading files...</p> : null}
      {!query.isLoading && files.length === 0 ? (
        <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center font-body text-xs text-ink-500">No files</div>
      ) : null}
      <div className="space-y-4">
        {[...groups.entries()].map(([category, group]) => (
          <div key={category}>
            <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-ink-500">{category}</h3>
            <ul className="space-y-2">
              {group.map((file) => (
                <FileRow key={`${file.id}-${file.filename}`} file={file} disabled={patch.isPending} onPatch={(p) => patch.mutate({ id: file.id, ...p })} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
