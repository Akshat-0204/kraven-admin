import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@kraven/validation';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-sm space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Private admin</p>
          <h1 className="mt-2 text-2xl font-semibold">Kraven</h1>
        </div>

        <form
          className="space-y-4 rounded border border-border bg-panel p-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          <label className="block space-y-2">
            <span className="text-sm text-muted">Email</span>
            <input
              className="h-10 w-full rounded border border-border bg-black px-3 text-sm text-white outline-none focus:border-white"
              autoComplete="email"
              type="email"
              {...register('email')}
            />
            {errors.email ? <span className="text-xs text-red-300">{errors.email.message}</span> : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-muted">Password</span>
            <input
              className="h-10 w-full rounded border border-border bg-black px-3 text-sm text-white outline-none focus:border-white"
              autoComplete="current-password"
              type="password"
              {...register('password')}
            />
            {errors.password ? (
              <span className="text-xs text-red-300">{errors.password.message}</span>
            ) : null}
          </label>

          <Button className="w-full" type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      </section>
    </main>
  );
}
