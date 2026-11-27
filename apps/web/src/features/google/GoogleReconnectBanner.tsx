import { useQuery } from '@tanstack/react-query';
import { getGoogleStatus, googleQueryKeys, startGoogleConnect } from './googleApi';

/** Global banner shown when Google rejected the stored token (a deliberate disconnect shows nothing). */
export function GoogleReconnectBanner() {
  const { data } = useQuery({ queryKey: googleQueryKeys.status, queryFn: getGoogleStatus, staleTime: 60_000 });
  if (!data?.needsReconnect) return null;
  return (
    <div role="alert" className="flex items-center justify-between gap-3 border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
      <span>Google was disconnected. Documents cannot be created or exported until you reconnect.</span>
      <button type="button" className="shrink-0 font-medium underline" onClick={startGoogleConnect}>
        Reconnect Google
      </button>
    </div>
  );
}
