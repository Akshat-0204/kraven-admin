import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { emailQueryKeys, listClientEmails, sendPortalEmail } from './portalApi';

/** Client page panel: email the portal link (never the code) and see what was sent. */
export function EmailLogPanel({ clientId, hasEmail }: { clientId: string; hasEmail: boolean }) {
  const queryClient = useQueryClient();
  const key = emailQueryKeys.client(clientId);
  const query = useQuery({ queryKey: key, queryFn: () => listClientEmails(clientId) });
  const send = useMutation({
    mutationFn: () => sendPortalEmail(clientId),
    onSuccess: () => {
      toast.success('Portal link email queued');
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error) => toast.error(error.message)
  });
  const emails = query.data?.emails ?? [];

  return (
    <section className="space-y-3 rounded border border-border bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Emails</h2>
        <Button type="button" onClick={() => send.mutate()} disabled={send.isPending || !hasEmail}>
          <Mail className="mr-2 h-4 w-4" aria-hidden />
          Email portal link
        </Button>
      </div>
      <p className="text-xs text-muted">
        {hasEmail ? 'The email contains the link only. Share the access code separately.' : 'Add an email address to this client to send emails.'}
      </p>
      {emails.length === 0 ? (
        <p className="text-xs text-muted">No emails sent yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {emails.map((email) => (
            <li key={email.id} className="flex items-center justify-between gap-2 rounded border border-border p-2">
              <div className="min-w-0">
                <div className="truncate">{email.subject}</div>
                <div className="text-xs text-muted">
                  {email.to} · {new Date(email.createdAt).toLocaleString()}
                </div>
              </div>
              <span className={`text-xs ${email.status === 'bounced' || email.status === 'failed' ? 'text-red-300' : 'text-muted'}`}>{email.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
