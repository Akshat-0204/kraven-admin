import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { disconnectGoogle, getGoogleStatus, googleQueryKeys, startGoogleConnect } from './googleApi';

/** Dashboard card: Google connection status with Connect / Reconnect / Disconnect. */
export function GoogleConnectCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: googleQueryKeys.status, queryFn: getGoogleStatus });
  const disconnect = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: googleQueryKeys.status }),
    onError: (error) => toast.error(errorMessage(error, 'Could not disconnect Google'))
  });
  const status = statusQuery.data;

  let text = 'Checking Google connection...';
  if (statusQuery.isError) text = errorMessage(statusQuery.error, 'Unable to load Google connection status.');
  else if (status?.connected) text = `Connected as ${status.email}`;
  else if (status?.needsReconnect) text = `Google needs to be reconnected${status.lastError ? `: ${status.lastError}` : '.'}`;
  else if (status) text = status.configured ? 'Not connected. Connect the agency Google account to create documents.' : 'Google OAuth is not configured on the server.';

  return (
    <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between" role="region" aria-label="Google connection">
      <div>
        <h2 className="font-display text-sm font-bold text-ink-900">Google Docs</h2>
        <p className="mt-1 font-body text-sm text-ink-500">{text}</p>
      </div>
      {statusQuery.isError ? (
        <Button onClick={() => void statusQuery.refetch()} disabled={statusQuery.isFetching}>
          Retry
        </Button>
      ) : null}
      {status ? (
        <div className="flex gap-2">
          {status.connected ? (
            <>
              <Button onClick={startGoogleConnect}>Reconnect</Button>
              <Button className="bg-transparent shadow-none" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
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
    </Card>
  );
}
