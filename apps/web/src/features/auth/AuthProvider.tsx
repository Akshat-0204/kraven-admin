import type { AuthUser } from '@kraven/types';
import { toastError } from '../../lib/formErrors';
import type { LoginInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext } from 'react';
import { toast } from 'sonner';
import * as api from '../../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.getCurrentUser,
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
      queryClient.invalidateQueries();
      toast.success('Logged in');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.removeQueries({ queryKey: ['auth'] });
      toast.success('Logged out');
    },
    onError: toastError('Could not log out')
  });

  return (
    <AuthContext.Provider
      value={{
        user: meQuery.data ?? null,
        isLoading: meQuery.isLoading,
        isAuthenticated: Boolean(meQuery.data),
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
