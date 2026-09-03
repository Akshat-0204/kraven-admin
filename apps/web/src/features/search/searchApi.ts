import type { GlobalSearchResult } from '@kraven/types';
import { requestJson } from '../../lib/api';

export const searchQueryKeys = {
  global: (query: string) => ['search', 'global', query] as const
};

export async function globalSearch(query: string) {
  return requestJson<{ results: GlobalSearchResult[] }>(`/search?q=${encodeURIComponent(query)}`);
}
