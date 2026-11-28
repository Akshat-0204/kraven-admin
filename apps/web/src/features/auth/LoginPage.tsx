import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@kraven/validation';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from './AuthProvider';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  async function onSubmit(values: LoginInput) {
    await login(values);
    navigate(redirectTo, { replace: true });
  }

  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-12 font-body text-ink-900 selection:bg-olive-100 selection:text-olive-900">
      {/* Background ambient lighting effects */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(74,107,87,0.14)_0%,transparent_70%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(120,110,90,0.12)_0%,transparent_70%)] blur-3xl"
        aria-hidden="true"
      />
      {/* Fine architectural dot matrix grid */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(120,110,90,0.11)_1px,transparent_1px)] [background-size:28px_28px] opacity-60"
        aria-hidden="true"
      />

      {/* Translucent Bold Heads - Bottom Left Corner */}
      <div
        className="pointer-events-none absolute bottom-4 left-6 z-0 select-none sm:bottom-8 sm:left-10 md:bottom-10 md:left-12 lg:bottom-12 lg:left-14"
        aria-hidden="true"
      >
        <div className="flex flex-col font-display font-bold leading-[0.74] tracking-[-0.06em] text-ink-900/[0.07] text-5xl sm:text-[58px] md:text-[76px] lg:text-[100px] xl:text-[112px]">
          <span>Build.</span>
          <span>Automate.</span>
          <span>Capitalize.</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <section className="relative z-10 w-full max-w-md">
        <div className="clay-card rounded-card border border-white/80 bg-surface p-7 sm:p-9 shadow-clay-floating">
          {/* Logo & Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-[var(--grad-olive)] font-display text-sm font-bold text-white shadow-clay-sm">
                  K
                </div>
                <span className="font-display text-xl font-bold tracking-tight text-ink-900">KRAVEN</span>
              </div>
              <span className="clay-chip inline-flex items-center rounded-pill border border-[rgba(120,110,90,0.18)] bg-sand-200 px-2.5 py-0.5 text-xs font-body font-medium text-ink-800 shadow-clay-sm">
                Admin Console
              </span>
            </div>

            <div className="pt-4">
              <p className="font-display text-xs uppercase tracking-wider text-olive-700">Authentication</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900">
                Welcome back
              </h1>
              <p className="mt-1 text-xs font-body text-ink-500">
                Sign in to manage client pipelines, contracts, and revenue.
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700">
                Email address
              </label>
              <Input
                startIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
                autoComplete="email"
                type="email"
                placeholder="admin@kraven.com"
                {...register('email')}
              />
              {errors.email ? (
                <span className="block text-xs font-body text-red-600">{errors.email.message}</span>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-700">
                Password
              </label>
              <div className="relative flex items-center">
                <Input
                  startIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors p-1"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <span className="block text-xs font-body text-red-600">{errors.password.message}</span>
              ) : null}
            </div>

            <div className="pt-2">
              <Button
                className="clay-btn--primary h-12 w-full rounded-pill bg-[var(--grad-olive)] font-body text-sm font-semibold text-white shadow-clay-green transition-all hover:opacity-95 flex items-center justify-center gap-2"
                type="submit"
                disabled={isSubmitting || isLoading}
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign in to Console'}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          {/* Security footnote */}
          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-sand-300/40 pt-4 text-center text-xs font-body text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 text-olive-600" aria-hidden="true" />
            <span>End-to-end encrypted session · Kraven Operating System</span>
          </div>
        </div>
      </section>
    </main>
  );
}

