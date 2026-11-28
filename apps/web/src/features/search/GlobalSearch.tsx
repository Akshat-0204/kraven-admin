import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../../components/ui/input';
import { globalSearch, searchQueryKeys } from './searchApi';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const searchQuery = useQuery({
    queryKey: searchQueryKeys.global(query),
    queryFn: () => globalSearch(query),
    enabled: query.trim().length > 1
  });
  const results = searchQuery.data?.results ?? [];

  return (
    <div className="relative">
      <Input
        startIcon={<Search className="h-4 w-4 text-ink-500" aria-hidden="true" />}
        className="bg-surface-soft text-ink-900 placeholder:text-ink-500 shadow-clay-inset rounded-md border-none focus:bg-surface"
        placeholder="Search leads, clients, projects, invoices..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim().length > 1 ? (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-md border border-white/80 bg-surface shadow-clay-hover">
          {searchQuery.isLoading ? (
            <div className="p-3 text-sm text-ink-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-ink-500">No results found</div>
          ) : (
            results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                to={result.href}
                className="block border-b border-[rgba(120,110,90,0.12)] p-3 last:border-b-0 text-ink-900 hover:bg-olive-100/50 transition-colors"
                onClick={() => setQuery('')}
              >
                <div className="text-sm font-medium text-ink-900">{result.title}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-ink-500">
                  {result.type} {result.subtitle ? `- ${result.subtitle}` : ''}
                </div>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
