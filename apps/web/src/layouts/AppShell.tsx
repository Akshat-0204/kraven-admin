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
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-black px-4 py-5 md:block">
        <div className="mb-5 text-lg font-semibold">{APP_NAME}</div>
        <div className="mb-5">
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
                    'block rounded px-3 py-2 text-sm text-muted hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white text-black hover:bg-white hover:text-black'
                  )
                }
              >
                {item.label}
              </NavLink>
              {'children' in item ? (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.label}
                      to={child.path}
                      end={child.path === '/finance'}
                      className={({ isActive }) =>
                        cn(
                          'block rounded px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white',
                          isActive && 'bg-white text-black hover:bg-white hover:text-black'
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
        <div className="absolute bottom-5 left-4 right-4 space-y-3 border-t border-border pt-4">
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
          <GlobalSearch />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
