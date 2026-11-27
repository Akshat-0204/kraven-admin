import { SIDEBAR_ITEMS, WORKSPACES, type Workspace } from '@kraven/config';

const STORAGE_KEY = 'kraven_workspace';

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Routes owned by a workspace that have no sidebar item of their own (e.g. `/templates` redirects into Documents). */
const EXTRA_WORKSPACE_PATHS: Record<Workspace, readonly string[]> = {
  leads: [],
  crm: ['/templates']
};

/** Workspace owning a URL, or null for shared pages (e.g. Settings). */
export function workspaceForPath(pathname: string): Workspace | null {
  for (const workspace of WORKSPACES) {
    const paths = [...SIDEBAR_ITEMS[workspace].map((item) => item.path), ...EXTRA_WORKSPACE_PATHS[workspace]];
    if (paths.some((path) => matchesPrefix(pathname, path))) {
      return workspace;
    }
  }
  return null;
}

export function readStoredWorkspace(): Workspace {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return (WORKSPACES as readonly string[]).includes(value ?? '') ? (value as Workspace) : 'leads';
  } catch {
    return 'leads';
  }
}

export function storeWorkspace(workspace: Workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, workspace);
  } catch {
    // Storage unavailable (private mode etc.); the URL still drives the active workspace.
  }
}
