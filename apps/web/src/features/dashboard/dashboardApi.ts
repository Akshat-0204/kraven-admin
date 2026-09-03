import type { DashboardSummary } from '@kraven/types';
import { requestJson } from '../../lib/api';

export const dashboardQueryKeys = {
  summary: ['dashboard', 'summary'] as const
};

export async function getDashboardSummary() {
  return requestJson<DashboardSummary>('/dashboard/summary');
}
