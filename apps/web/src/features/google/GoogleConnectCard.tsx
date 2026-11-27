import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { disconnectGoogle, getGoogleStatus, googleQueryKeys, startGoogleConnect } from './googleApi';

/** Dashboard card: Google connection status with Connect / Reconnect / Disconnect. */
export function GoogleConnectCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: googleQueryKeys.status, queryFn: getGoogleStatus });
  const disconnect = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: googleQueryKeys.status }),
    onError: (error) => toast.error(error.message)
  });
  const status = statusQuery.data;

  let text = 'Checking Google connection...';
  if (statusQuery.isError) text = 'Unable to load Google connection status.';
  else if (status?.connected) text = `Connected as ${status.email}`;
  else if (status?.needsReconnect) text = `Google needs to be reconnected${status.lastError ? `: ${status.lastError}` : '.'}`;
  else if (status) text = status.configured ? 'Not connected. Connect the agency Google account to create documents.' : 'Google OAuth is not configured on the server.';

  return (
    <section className="flex flex-col gap-3 rounded border border-border bg-panel p-4 md:flex-row md:items-center md:justify-between" aria-label="Google connection">
      <div>
        <h2 className="text-sm font-semibold">Google Docs</h2>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      {status ? (
        <div className="flex gap-2">
          {status.connected ? (
            <>
              <Button onClick={startGoogleConnect}>Reconnect</Button>
              <Button className="bg-transparent text-white hover:bg-white/10" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button disabled={!status.configured} onClick={startGoogleConnect}>
              {status.needsReconnect ? 'Reconnect Google' : 'Connect Google'}
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
