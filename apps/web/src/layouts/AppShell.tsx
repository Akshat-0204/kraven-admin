import { APP_NAME, SIDEBAR_ITEMS } from '@kraven/config';
import { LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../features/auth/AuthProvider';
import { GlobalSearch } from '../features/search/GlobalSearch';
import { cn } from '../lib/utils';

export function AppShell() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink-700 font-body">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/60 bg-surface px-5 py-6 shadow-[var(--clay-raised-sm)] md:block z-30">
        <div className="mb-6 font-display text-2xl font-bold tracking-tight text-ink-900">{APP_NAME}</div>
        <div className="mb-6">
          <GlobalSearch />
        </div>
        <nav className="space-y-1" aria-label="Primary navigation">
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.label}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'block rounded-pill px-3.5 py-2.5 text-sm font-medium text-ink-700 transition-all hover:bg-surface-soft hover:text-olive-700',
                    isActive && 'bg-ink-900 text-white font-semibold shadow-[var(--clay-raised-sm)] hover:bg-ink-900 hover:text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
              {'children' in item ? (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-[rgba(120,110,90,0.18)] pl-3">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.label}
                      to={child.path}
                      end={child.path === '/finance'}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-all hover:bg-surface-soft hover:text-olive-700',
                          isActive && 'bg-olive-100 font-semibold text-olive-700 hover:bg-olive-100 hover:text-olive-700'
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-3 border-t border-[rgba(120,110,90,0.12)] pt-4">
          <div className="truncate text-xs font-medium text-ink-500">{user?.email}</div>
          <Button
            className="w-full justify-between rounded-pill border border-white/80 bg-surface-soft text-ink-700 shadow-[var(--clay-raised-sm)] hover:bg-danger-bg hover:text-danger-fg hover:border-transparent transition-all"
            onClick={handleLogout}
          >
            <span>Logout</span>
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="space-y-3 border-b border-[rgba(120,110,90,0.12)] bg-surface px-4 py-4 shadow-[var(--clay-raised-sm)] md:hidden">
          <div className="flex items-center justify-between">
            <div className="font-display text-xl font-bold tracking-tight text-ink-900">{APP_NAME}</div>
            <Button
              className="h-9 w-9 p-0 rounded-full border border-white/80 bg-surface-soft text-ink-700 shadow-[var(--clay-raised-sm)]"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <GlobalSearch />
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
