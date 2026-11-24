import type { DocumentVariable } from '@kraven/types';
import { env } from '../../config/env.js';
import type { ClientDocument } from '../clients/client.model.js';
import type { ProjectDocument } from '../projects/project.model.js';

type VariableDefinition = DocumentVariable & {
  resolve: (context: MergeSource) => string | undefined;
};

export interface MergeSource {
  client: Pick<
    ClientDocument,
    'companyName' | 'contactPerson' | 'email' | 'phone' | 'address' | 'website' | 'taxInfo' | 'industry'
  >;
  project?: Pick<
    ProjectDocument,
    'projectName' | 'description' | 'projectValue' | 'startDate' | 'expectedCompletionDate' | 'deliverables'
  > | null;
  now?: Date;
}

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const currencyFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function formatDate(value?: Date) {
  return value ? dateFormat.format(value) : undefined;
}

/** Every `{{key}}` a template may use. Templates referencing anything else are rejected on save. */
const DEFINITIONS: VariableDefinition[] = [
  { key: 'client.company', label: 'Client company', group: 'client', resolve: (s) => s.client.companyName },
  { key: 'client.contactName', label: 'Client contact', group: 'client', resolve: (s) => s.client.contactPerson },
  { key: 'client.email', label: 'Client email', group: 'client', resolve: (s) => s.client.email },
  { key: 'client.phone', label: 'Client phone', group: 'client', resolve: (s) => s.client.phone },
  { key: 'client.address', label: 'Client address', group: 'client', resolve: (s) => s.client.address },
  { key: 'client.website', label: 'Client website', group: 'client', resolve: (s) => s.client.website },
  { key: 'client.industry', label: 'Client industry', group: 'client', resolve: (s) => s.client.industry },
  { key: 'client.taxInfo', label: 'Client tax info', group: 'client', resolve: (s) => s.client.taxInfo },
  { key: 'project.name', label: 'Project name', group: 'project', resolve: (s) => s.project?.projectName },
  {
    key: 'project.description',
    label: 'Project description',
    group: 'project',
    resolve: (s) => s.project?.description
  },
  {
    key: 'project.value',
    label: 'Project value (INR)',
    group: 'project',
    resolve: (s) => (s.project?.projectValue === undefined ? undefined : currencyFormat.format(s.project.projectValue))
  },
  {
    key: 'project.startDate',
    label: 'Project start date',
    group: 'project',
    resolve: (s) => formatDate(s.project?.startDate)
  },
  {
    key: 'project.dueDate',
    label: 'Project expected completion',
    group: 'project',
    resolve: (s) => formatDate(s.project?.expectedCompletionDate)
  },
  {
    key: 'project.deliverables',
    label: 'Project deliverables (comma separated)',
    group: 'project',
    resolve: (s) => s.project?.deliverables?.join(', ')
  },
  { key: 'today', label: "Today's date", group: 'general', resolve: (s) => formatDate(s.now ?? new Date()) },
  { key: 'agency.name', label: 'Agency name', group: 'agency', resolve: () => env.agency.name },
  { key: 'agency.email', label: 'Agency email', group: 'agency', resolve: () => env.agency.email },
  { key: 'agency.phone', label: 'Agency phone', group: 'agency', resolve: () => env.agency.phone },
  { key: 'agency.address', label: 'Agency address', group: 'agency', resolve: () => env.agency.address },
  { key: 'agency.website', label: 'Agency website', group: 'agency', resolve: () => env.agency.website }
];

export const DOCUMENT_VARIABLES: DocumentVariable[] = DEFINITIONS.map(({ key, label, group }) => ({ key, label, group }));

export const DOCUMENT_VARIABLE_KEYS = new Set(DEFINITIONS.map((definition) => definition.key));

/** Builds the nested Handlebars context (`{ client: { company }, today, ... }`) of plain strings. */
export function buildMergeContext(source: MergeSource) {
  const context: Record<string, unknown> = {};
  for (const definition of DEFINITIONS) {
    const value = definition.resolve(source) ?? '';
    const segments = definition.key.split('.');
    let target = context;
    for (const segment of segments.slice(0, -1)) {
      target = (target[segment] ??= {}) as Record<string, unknown>;
    }
    target[segments[segments.length - 1]] = value;
  }
  return context;
}
