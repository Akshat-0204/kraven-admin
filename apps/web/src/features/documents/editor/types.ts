import type { DocumentTemplateType } from '@kraven/types';

export interface EditorVariable {
  key: string;
  label: string;
  group: 'client' | 'project' | 'agency' | 'general' | 'page';
  /** Document mode only; `null`/missing = unresolved. */
  value?: string | null;
}

/** Every field either mode may autosave. Each page adapter forwards only what its endpoint accepts. */
export interface EditorPatch {
  title: string;
  html: string;
  headerHtml: string;
  footerHtml: string;
  client: string | null;
  project: string | null;
  type: DocumentTemplateType;
}

export const PAGE_TOKEN_VARIABLES: EditorVariable[] = [
  { key: 'page.number', label: 'Page number', group: 'page' },
  { key: 'page.total', label: 'Total pages', group: 'page' }
];
