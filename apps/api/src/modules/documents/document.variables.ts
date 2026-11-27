import type { DocumentVariable } from '@kraven/types';
import { env } from '../../config/env.js';
import type { ClientDocument } from '../clients/client.model.js';
import type { ProjectDocument } from '../projects/project.model.js';

type VariableDefinition = DocumentVariable & {
  resolve: (context: MergeSource) => string | undefined;
};

export interface MergeSource {
  /** Null/undefined for a Draft with no client assigned yet (client values then resolve as missing). */
  client?: Pick<
    ClientDocument,
    'companyName' | 'contactPerson' | 'email' | 'phone' | 'address' | 'website' | 'taxInfo' | 'industry'
  > | null;
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

/** Every `{{key}}` the app fills into a Google Doc. */
const DEFINITIONS: VariableDefinition[] = [
  { key: 'client.company', label: 'Client company', group: 'client', resolve: (s) => s.client?.companyName },
  { key: 'client.contactName', label: 'Client contact', group: 'client', resolve: (s) => s.client?.contactPerson },
  { key: 'client.email', label: 'Client email', group: 'client', resolve: (s) => s.client?.email },
  { key: 'client.phone', label: 'Client phone', group: 'client', resolve: (s) => s.client?.phone },
  { key: 'client.address', label: 'Client address', group: 'client', resolve: (s) => s.client?.address },
  { key: 'client.website', label: 'Client website', group: 'client', resolve: (s) => s.client?.website },
  { key: 'client.industry', label: 'Client industry', group: 'client', resolve: (s) => s.client?.industry },
  { key: 'client.taxInfo', label: 'Client tax info', group: 'client', resolve: (s) => s.client?.taxInfo },
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

function resolveValue(definition: VariableDefinition, source: MergeSource) {
  const value = definition.resolve(source);
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

/** Every registry variable with its value for this client/project (`null` when unassigned or missing). */
export function resolveDocumentVariables(source: MergeSource) {
  return DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    group: definition.group,
    value: resolveValue(definition, source) ?? null
  }));
}

/**
 * Flat `{ 'client.company': 'Acme' }` map for Docs `replaceAllText`. Variables with no value are
 * left out so their `{{placeholder}}` stays visible in the document.
 */
export function buildPlaceholderMap(source: MergeSource) {
  const map: Record<string, string> = {};
  for (const definition of DEFINITIONS) {
    const value = resolveValue(definition, source);
    if (value !== undefined) map[definition.key] = value;
  }
  return map;
}
