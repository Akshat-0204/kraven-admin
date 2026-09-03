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
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
      <Input
        className="pl-9"
        placeholder="Search leads, clients, projects, invoices"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim().length > 1 ? (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded border border-border bg-black shadow-xl">
          {searchQuery.isLoading ? (
            <div className="p-3 text-sm text-muted">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted">No results</div>
          ) : (
            results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                to={result.href}
                className="block border-b border-border p-3 last:border-b-0 hover:bg-white/10"
                onClick={() => setQuery('')}
              >
                <div className="text-sm font-medium">{result.title}</div>
                <div className="mt-1 text-xs uppercase text-muted">
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
