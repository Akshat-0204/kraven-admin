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
import { GoogleReconnectBanner } from '../features/google/GoogleReconnectBanner';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../features/auth/AuthProvider';
import { GlobalSearch } from '../features/search/GlobalSearch';
import { toast } from 'sonner';
import { errorMessage } from '../lib/api';
import { cn } from '../lib/utils';
import { readStoredWorkspace, storeWorkspace, workspaceForPath } from './workspace';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-pill px-3.5 py-2.5 text-sm font-medium text-ink-700 transition-all hover:bg-surface-soft hover:text-olive-700',
    isActive && 'bg-ink-900 text-white font-semibold shadow-clay-sm hover:bg-ink-900 hover:text-white'
  );

const childNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-all hover:bg-surface-soft hover:text-olive-700',
    isActive && 'bg-olive-100 font-semibold text-olive-700 hover:bg-olive-100 hover:text-olive-700'
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
    <div role="group" aria-label="Workspace" className="grid grid-cols-2 gap-1 rounded-pill border border-white/80 bg-sand-200 p-1 shadow-clay-inset-sm">
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
            'rounded-pill px-3 py-1.5 text-sm font-medium text-ink-700 transition-all hover:text-olive-700',
            active === workspace && 'bg-ink-900 text-white shadow-clay-sm hover:bg-ink-900 hover:text-white'
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
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-[rgba(120,110,90,0.18)] pl-3">
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
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, 'Could not log out. Please try again.'));
    }
  }

  // Mobile gets one flat scrollable row: children inline, minus the one duplicating its parent path.
  const mobileItems = [
    ...items.flatMap((item) => [item, ...(item.children ?? []).filter((child) => child.path !== item.path)]),
    ...SHARED_SIDEBAR_ITEMS
  ];

  return (
    <div className="min-h-screen bg-canvas font-body text-ink-700">
      <aside className="fixed inset-y-0 left-0 hidden z-30 w-64 flex-col border-r border-white/60 bg-surface px-5 py-6 shadow-clay-sm md:flex">
        <div className="mb-6 font-display text-2xl font-bold tracking-tight text-ink-900">{APP_NAME}</div>
        <div className="mb-4">
          <WorkspaceToggle active={workspace} />
        </div>
        <div className="mb-5">
          <GlobalSearch />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav items={items} label="Primary navigation" />
        </div>
        <div className="mt-4 space-y-3 border-t border-[rgba(120,110,90,0.12)] pt-4">
          <SidebarNav items={SHARED_SIDEBAR_ITEMS} label="Shared navigation" />
          <div className="truncate text-xs font-medium text-ink-500">{user?.email}</div>
          <Button
            className="w-full justify-between rounded-pill border border-white/80 bg-surface-soft text-ink-700 shadow-clay-sm transition-all hover:border-transparent hover:bg-danger-bg hover:text-danger-fg"
            onClick={handleLogout}
          >
            Logout
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </aside>
      <div className="md:pl-64">
        <GoogleReconnectBanner />
        <header className="space-y-3 border-b border-[rgba(120,110,90,0.12)] bg-surface px-4 py-4 shadow-clay-sm md:hidden">
          <div className="flex items-center justify-between">
            <div className="font-display text-xl font-bold tracking-tight text-ink-900">{APP_NAME}</div>
            <Button
              className="h-9 w-9 rounded-full border border-white/80 bg-surface-soft p-0 text-ink-700 shadow-clay-sm"
              onClick={handleLogout}
              aria-label="Logout"
            >
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
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
