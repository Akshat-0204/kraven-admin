import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, EmptyState } from '../../components/ui';
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
    <Card className="space-y-4">
      <CardHeader
        title="Portal Communications"
        subtitle="Dispatch direct link to the client portal"
        actions={
          <Button
            type="button"
            onClick={() => send.mutate()}
            disabled={send.isPending || !hasEmail}
            className="h-9 gap-1.5 px-3.5 text-xs"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Email portal link</span>
          </Button>
        }
      />

      <p className="font-body text-xs text-ink-500">
        {hasEmail
          ? 'Emails dispatched contain the magic link only. For security, share the access code via a separate channel.'
          : 'Please add an email address to this client record before sending notifications.'}
      </p>

      {emails.length === 0 ? (
        <EmptyState title="No portal emails dispatched yet" className="py-6" />
      ) : (
        <ul className="space-y-2.5">
          {emails.map((email) => (
            <li
              key={email.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-3"
            >
              <div className="min-w-0">
                <div className="truncate font-body text-xs font-semibold text-ink-900">{email.subject}</div>
                <div className="font-body text-[11px] text-ink-500">
                  {email.to} · {new Date(email.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
              <span
                className={
                  email.status === 'bounced' || email.status === 'failed'
                    ? 'clay-chip text-[10px] py-0.2 px-2 bg-danger-bg text-danger-fg'
                    : 'clay-chip text-[10px] py-0.2 px-2 bg-olive-100 text-olive-900'
                }
              >
                {email.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
