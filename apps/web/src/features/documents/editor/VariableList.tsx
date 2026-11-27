import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';
import type { EditorVariable } from './types';

const GROUP_LABELS: Record<string, string> = {
  client: 'Client',
  project: 'Project',
  agency: 'Agency',
  general: 'General',
  page: 'Page'
};
const GROUP_ORDER = ['client', 'project', 'agency', 'general', 'page'];

/** Grouped, searchable variable list. Used by the toolbar picker and the side panel. */
export function VariableList({
  variables,
  mode,
  onPick,
  autoFocus,
  compact
}: {
  variables: EditorVariable[];
  mode: 'document' | 'template';
  onPick: (key: string) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = variables.filter(
      (variable) => !needle || variable.label.toLowerCase().includes(needle) || variable.key.toLowerCase().includes(needle)
    );
    return GROUP_ORDER.map((group) => ({ group, items: filtered.filter((variable) => variable.group === group) })).filter(
      (entry) => entry.items.length > 0
    );
  }, [variables, query]);

  return (
    <div className="flex min-h-0 flex-col">
      <label className="mx-3 mb-2 flex items-center gap-2 rounded-full bg-[#f1f3f4] px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-[#0b57d0]">
        <Search className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />
        <input
          aria-label="Search variables"
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search variables"
          className="w-full bg-transparent text-[#1f1f1f] outline-none placeholder:text-[#80868b]"
        />
      </label>
      <div className={cn('overflow-y-auto', compact && 'max-h-72')}>
        {groups.length === 0 ? <p className="px-4 py-3 text-xs text-[#5f6368]">No variables match.</p> : null}
        {groups.map(({ group, items }) => (
          <div key={group} className="pb-2">
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#5f6368]">
              {GROUP_LABELS[group] ?? group}
            </p>
            {items.map((variable) => {
              const missing = mode === 'document' && variable.group !== 'page' && !variable.value;
              return (
                <button
                  key={variable.key}
                  type="button"
                  title={`Insert ${variable.key}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPick(variable.key)}
                  className="flex w-full flex-col items-start px-4 py-1.5 text-left hover:bg-[#f1f3f4]"
                >
                  <span className="text-sm text-[#1f1f1f]">{variable.label}</span>
                  {mode === 'document' && variable.group !== 'page' ? (
                    <span className={cn('max-w-full truncate text-xs', missing ? 'text-[#b06000]' : 'text-[#5f6368]')}>
                      {missing ? 'No value yet' : variable.value}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-[#80868b]">{`{{${variable.key}}}`}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
