import { useQuery } from '@tanstack/react-query';
import { getGoogleStatus, googleQueryKeys, startGoogleConnect } from './googleApi';

/** Global banner shown when Google rejected the stored token (a deliberate disconnect shows nothing). */
export function GoogleReconnectBanner() {
  const { data } = useQuery({ queryKey: googleQueryKeys.status, queryFn: getGoogleStatus, staleTime: 60_000 });
  if (!data?.needsReconnect) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 border-b border-amber-300/50 bg-amber-100 px-4 py-2 font-body text-sm text-amber-900">
      <span>Google was disconnected. Documents cannot be created or exported until you reconnect.</span>
      <button type="button" className="shrink-0 font-medium underline hover:text-amber-950" onClick={startGoogleConnect}>
        Reconnect Google
      </button>
    </div>
  );
}
