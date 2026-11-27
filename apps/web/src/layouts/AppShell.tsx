import {
  APP_NAME,
  SHARED_SIDEBAR_ITEMS,
  SIDEBAR_ITEMS,
  WORKSPACE_DASHBOARD_PATHS,
  WORKSPACE_LABELS,
  WORKSPACES,
  type SidebarItem,
  type Workspace
} from '@kraven/config';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../features/auth/AuthProvider';
import { GlobalSearch } from '../features/search/GlobalSearch';
import { cn } from '../lib/utils';
import { readStoredWorkspace, storeWorkspace, workspaceForPath } from './workspace';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded px-3 py-2 text-sm text-muted hover:bg-white/10 hover:text-white',
    isActive && 'bg-white text-black hover:bg-white hover:text-black'
  );

const childNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white',
    isActive && 'bg-white text-black hover:bg-white hover:text-black'
  );

/** Active workspace comes from the URL; shared pages fall back to the last one used. */
function useActiveWorkspace() {
  const { pathname } = useLocation();
  const fromPath = workspaceForPath(pathname);
  const [stored, setStored] = useState<Workspace>(readStoredWorkspace);

  useEffect(() => {
    if (fromPath) {
      storeWorkspace(fromPath);
      setStored(fromPath);
    }
  }, [fromPath]);

  return fromPath ?? stored;
}

function WorkspaceToggle({ active }: { active: Workspace }) {
  const navigate = useNavigate();

  return (
    <div role="group" aria-label="Workspace" className="grid grid-cols-2 gap-1 rounded border border-border bg-black p-1">
      {WORKSPACES.map((workspace) => (
        <button
          key={workspace}
          type="button"
          aria-pressed={active === workspace}
          onClick={() => {
            storeWorkspace(workspace);
            navigate(WORKSPACE_DASHBOARD_PATHS[workspace]);
          }}
          className={cn(
            'rounded px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-white/10 hover:text-white',
            active === workspace && 'bg-white text-black hover:bg-white hover:text-black'
          )}
        >
          {WORKSPACE_LABELS[workspace]}
        </button>
      ))}
    </div>
  );
}

function SidebarNav({ items, label }: { items: readonly SidebarItem[]; label: string }) {
  return (
    <nav className="space-y-1" aria-label={label}>
      {items.map((item) => (
        <div key={item.path}>
          <NavLink to={item.path} className={navLinkClass}>
            {item.label}
          </NavLink>
          {item.children ? (
            <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
              {item.children.map((child) => (
                <NavLink key={child.path} to={child.path} end={child.path === item.path} className={childNavLinkClass}>
                  {child.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const workspace = useActiveWorkspace();
  const items = SIDEBAR_ITEMS[workspace];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  // Mobile gets one flat scrollable row: children inline, minus the one duplicating its parent path.
  const mobileItems = [
    ...items.flatMap((item) => [item, ...(item.children ?? []).filter((child) => child.path !== item.path)]),
    ...SHARED_SIDEBAR_ITEMS
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-black px-4 py-5 md:flex">
        <div className="mb-5 text-lg font-semibold">{APP_NAME}</div>
        <div className="mb-4">
          <WorkspaceToggle active={workspace} />
        </div>
        <div className="mb-5">
          <GlobalSearch />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav items={items} label="Primary navigation" />
        </div>
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <SidebarNav items={SHARED_SIDEBAR_ITEMS} label="Shared navigation" />
          <div className="truncate text-xs text-muted">{user?.email}</div>
          <Button className="w-full justify-between bg-transparent text-white hover:bg-white/10" onClick={handleLogout}>
            Logout
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="space-y-3 border-b border-border bg-black px-4 py-4 md:hidden">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">{APP_NAME}</div>
            <Button className="h-8 px-2" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <WorkspaceToggle active={workspace} />
          <nav aria-label="Mobile navigation" className="-mx-4 flex gap-1 overflow-x-auto px-4">
            {mobileItems.map((item) => (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                end={mobileItems.some((other) => other.path.startsWith(`${item.path}/`))}
                className={({ isActive }) => cn(navLinkClass({ isActive }), 'shrink-0 whitespace-nowrap')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <GlobalSearch />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
