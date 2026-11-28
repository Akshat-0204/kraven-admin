import { useQuery } from '@tanstack/react-query';
import { getGoogleStatus, googleQueryKeys, startGoogleConnect } from './googleApi';

/** Global banner shown when Google rejected the stored token (a deliberate disconnect shows nothing). */
export function GoogleReconnectBanner() {
  const { data } = useQuery({ queryKey: googleQueryKeys.status, queryFn: getGoogleStatus, staleTime: 60_000 });
  if (!data?.needsReconnect) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 border-b border-warning-fg/20 bg-warning-bg px-4 py-2 font-body text-sm text-warning-fg">
      <span>Google was disconnected. Documents cannot be created or exported until you reconnect.</span>
      <button type="button" className="shrink-0 font-medium underline hover:text-warning-fg" onClick={startGoogleConnect}>
        Reconnect Google
      </button>
    </div>
  );
}
