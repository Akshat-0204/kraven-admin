import type { ActivityRecord, ClientRecord, EntityLink, ProjectSummaryRecord } from '@kraven/types';
import type { ClientInput } from '@kraven/validation';
import { linkSchema } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  Globe,
  LinkIcon,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Upload
} from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card as ClayCard, CardHeader } from '../../components/ui/card';
import { Tabs } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { ProgressBar } from '../../components/ui/progressBar';
import { ProjectStatusBadge } from '../../components/ui/statusBadge';
import { apiUrl } from '../../lib/api';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../projects/projectFormat';
import {
  addClientLink,
  clientQueryKeys,
  getClient,
  removeClientDocument,
  removeClientLink,
  updateClient,
  uploadClientDocument
} from './clientApi';
import { clientInitials, formatDate } from './clientFormat';
import { ClientFormModal } from './ClientFormModal';
import { DocumentsPanel } from '../documents/DocumentsPanel';
import { EmailLogPanel } from '../portal/EmailLogPanel';
import { PacksPanel } from '../portal/PacksPanel';
import { PortalPanel, slugifyCompanyName } from '../portal/PortalPanel';
import { SharedFilesPanel } from '../portal/SharedFilesPanel';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'projects', label: 'Projects' },
  { value: 'documents', label: 'Documents' },
  { value: 'portal', label: 'Portal' },
  { value: 'activity', label: 'Activity' }
] as const;

type TabValue = (typeof TABS)[number]['value'];

const ACTIVE_STATUSES = new Set(['Not Started', 'In Progress', 'On Hold', 'Client Review']);

function isTab(value: string | null): value is TabValue {
  return TABS.some((tab) => tab.value === value);
}

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const tabParam = searchParams.get('tab');
  const tab: TabValue = isTab(tabParam) ? tabParam : 'overview';

  function selectTab(next: TabValue) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'overview') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true }
    );
  }

  const clientId = id ?? '';
  const clientQuery = useQuery({
    queryKey: clientQueryKeys.detail(clientId),
    queryFn: () => getClient(clientId),
    enabled: Boolean(clientId)
  });

  function refreshClient() {
    queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: clientQueryKeys.detail(clientId) });
    queryClient.invalidateQueries({ queryKey: ['files'] });
  }

  const updateMutation = useMutation({
    mutationFn: (input: ClientInput) => updateClient(clientId, input),
    onSuccess: () => {
      refreshClient();
      toast.success('Client updated');
    },
    onError: (error) => toast.error(error.message)
  });

  if (clientQuery.isLoading) {
    return <div className="clay-card font-body text-sm text-ink-500">Loading client...</div>;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Button onClick={() => navigate('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to clients
        </Button>
        <div className="clay-card font-body text-sm text-danger-fg">
          Unable to load client.
        </div>
      </div>
    );
  }

  const { client, projects, activity } = clientQuery.data;
  const activeProjects = projects.filter((project) => ACTIVE_STATUSES.has(project.status));
  const totalValue = projects.reduce((sum, project) => sum + (project.projectValue ?? 0), 0);
  const counts: Partial<Record<TabValue, number>> = {
    projects: projects.length,
    activity: activity.length
  };

  return (
    <section className="space-y-6">
      <ClientHeader client={client} onEdit={() => setIsEditOpen(true)} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active projects" value={String(activeProjects.length)} hint={`${projects.length} total`} />
        <Stat label="Total project value" value={totalValue > 0 ? formatCurrency(totalValue) : '-'} />
        <Stat label="Files & links" value={String(client.documents.length + client.links.length)} hint={`${client.documents.length} files · ${client.links.length} links`} />
        <Stat label="Last activity" value={activity[0] ? formatDate(activity[0].timestamp) : '-'} hint={client.createdAt ? `Client since ${formatDate(client.createdAt)}` : undefined} />
      </div>

      <Tabs
        aria-label="Client sections"
        items={TABS.map(({ value, label }) => ({ id: value, label, ...(counts[value] ? { count: counts[value] } : {}) }))}
        value={tab}
        onChange={(id) => {
          if (isTab(id)) selectTab(id);
        }}
      />

      <div role="tabpanel">
        {tab === 'overview' ? (
          <OverviewTab
            client={client}
            projects={activeProjects}
            activity={activity}
            onRefresh={refreshClient}
            onSeeAll={selectTab}
          />
        ) : null}
        {tab === 'projects' ? <ProjectsList projects={projects} /> : null}
        {tab === 'documents' ? <DocumentsTab client={client} onRefresh={refreshClient} /> : null}
        {tab === 'portal' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <PortalPanel clientId={client.id} defaultSlug={slugifyCompanyName(client.companyName)} />
              <EmailLogPanel clientId={client.id} hasEmail={Boolean(client.email)} />
            </div>
            <PacksPanel clientId={client.id} />
          </div>
        ) : null}
        {tab === 'activity' ? (
          <Card title="Activity" count={activity.length}>
            <ActivityTimeline activity={activity} />
          </Card>
        ) : null}
      </div>

      <ClientFormModal
        client={client}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={(input) => updateMutation.mutateAsync(input).then(() => undefined)}
      />
    </section>
  );
}

/* ---------- header ---------- */

function ClientHeader({ client, onEdit }: { client: ClientRecord; onEdit: () => void }) {
  return (
    <div className="space-y-4">
      <Link className="inline-flex items-center font-body text-sm text-ink-500 hover:text-olive-700" to="/clients">
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        Clients
      </Link>

      <ClayCard className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-olive-100 font-display text-lg font-bold text-olive-700 shadow-clay-sm">
            {clientInitials(client.companyName)}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink-900">{client.companyName}</h1>
              <span className="clay-chip inline-flex h-6 items-center bg-sand-200 px-2 text-xs text-ink-700">
                {client.sourceLead ? 'Converted lead' : 'Manual client'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-sm text-ink-500">
              <span className="text-ink-900">{client.contactPerson}</span>
              {client.industry ? <MetaItem icon={<Briefcase className="h-3.5 w-3.5" />}>{client.industry}</MetaItem> : null}
              {client.email ? (
                <MetaItem icon={<Mail className="h-3.5 w-3.5" />} href={`mailto:${client.email}`}>
                  {client.email}
                </MetaItem>
              ) : null}
              {client.phone ? (
                <MetaItem icon={<Phone className="h-3.5 w-3.5" />} href={`tel:${client.phone}`}>
                  {client.phone}
                </MetaItem>
              ) : null}
              {client.website ? (
                <MetaItem icon={<Globe className="h-3.5 w-3.5" />} href={client.website} external>
                  {client.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </MetaItem>
              ) : null}
            </div>
          </div>
        </div>
        <Button className="shrink-0" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit client
        </Button>
      </ClayCard>
    </div>
  );
}

function MetaItem({
  icon,
  href,
  external = false,
  children
}: {
  icon: ReactNode;
  href?: string;
  external?: boolean;
  children: ReactNode;
}) {
  const content = (
    <>
      <span aria-hidden="true">{icon}</span>
      <span className="truncate">{children}</span>
    </>
  );

  if (!href) {
    return <span className="inline-flex min-w-0 items-center gap-1.5">{content}</span>;
  }

  return (
    <a
      href={href}
      className="inline-flex min-w-0 items-center gap-1.5 hover:text-olive-700"
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {content}
    </a>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <ClayCard>
      <div className="font-body text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</div>
      <div className="mt-2 truncate font-display text-xl font-bold text-ink-900">{value}</div>
      {hint ? <div className="mt-1 truncate font-body text-xs text-ink-500">{hint}</div> : null}
    </ClayCard>
  );
}

/* ---------- overview ---------- */

function OverviewTab({
  client,
  projects,
  activity,
  onRefresh,
  onSeeAll
}: {
  client: ClientRecord;
  projects: ProjectSummaryRecord[];
  activity: ActivityRecord[];
  onRefresh: () => void;
  onSeeAll: (tab: TabValue) => void;
}) {
  const notes = [
    { label: 'Important info', value: client.importantInfo, highlight: true },
    { label: 'Requirements', value: client.requirements },
    { label: 'Notes', value: client.notes },
    { label: 'Internal notes', value: client.internalNotes }
  ].filter((note) => note.value?.trim());

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card
          title="Active projects"
          count={projects.length}
          action={<SeeAll onClick={() => onSeeAll('projects')} />}
        >
          <ProjectsList projects={projects} compact />
        </Card>

        <Card title="Notes">
          {notes.length === 0 ? (
            <Empty>No notes yet. Use Edit client to add requirements or important info.</Empty>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.label}
                  className={cn(
                    'rounded border p-3',
                    note.highlight ? 'border-warning-fg/30 bg-warning-bg' : 'border-[rgba(120,110,90,0.12)]'
                  )}
                >
                  <div className={cn('text-xs uppercase tracking-wide', note.highlight ? 'text-warning-fg' : 'text-ink-500')}>
                    {note.label}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{note.value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Details">
          <dl className="space-y-3 text-sm">
            <DetailRow icon={<Building2 className="h-4 w-4" />} label="Contact" value={client.contactPerson} />
            <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.email} />
            <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={client.phone} />
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={client.address} multiline />
            <DetailRow icon={<FileText className="h-4 w-4" />} label="Tax info" value={client.taxInfo} />
          </dl>
        </Card>

        <LinksCard client={client} onRefresh={onRefresh} />

        <Card
          title="Recent activity"
          action={activity.length > 5 ? <SeeAll onClick={() => onSeeAll('activity')} /> : undefined}
        >
          <ActivityTimeline activity={activity.slice(0, 5)} />
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  multiline = false
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-ink-500" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className={cn('mt-0.5 break-words', multiline && 'whitespace-pre-wrap', !value && 'text-ink-500')}>
          {value || '-'}
        </dd>
      </div>
    </div>
  );
}

/* ---------- projects ---------- */

function ProjectsList({ projects, compact = false }: { projects: ProjectSummaryRecord[]; compact?: boolean }) {
  if (projects.length === 0) {
    return <Empty>{compact ? 'No active projects.' : 'No projects are associated with this client yet.'}</Empty>;
  }

  const list = (
    <div className="divide-y divide-[rgba(120,110,90,0.12)] rounded-md border border-[rgba(120,110,90,0.12)]">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="grid items-center gap-3 p-3 text-sm transition hover:bg-surface-soft md:grid-cols-[minmax(0,2fr)_auto_minmax(0,1fr)_auto]"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{project.projectName}</div>
            <div className="mt-0.5 text-xs text-ink-500">
              {project.expectedCompletionDate ? `Due ${formatDate(project.expectedCompletionDate)}` : 'No due date'}
              {project.projectValue !== undefined ? ` · ${formatCurrency(project.projectValue)}` : ''}
            </div>
          </div>
          <ProjectStatusBadge status={project.status} />
          <div className="flex items-center gap-2">
            <ProgressBar value={project.progressPercentage} className="h-1.5" />
            <span className="w-9 text-right text-xs text-ink-500">{project.progressPercentage}%</span>
          </div>
          <ArrowRight className="hidden h-4 w-4 text-ink-500 md:block" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );

  return compact ? list : <Card title="Projects" count={projects.length}>{list}</Card>;
}

/* ---------- documents ---------- */

function DocumentsTab({ client, onRefresh }: { client: ClientRecord; onRefresh: () => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <DocumentsPanel scope={{ client: client.id }} />
        <SharedFilesPanel entityType="Client" entityId={client.id} />
      </div>
      <div className="space-y-4">
        <UploadsCard client={client} onRefresh={onRefresh} />
        <LinksCard client={client} onRefresh={onRefresh} />
      </div>
    </div>
  );
}

function UploadsCard({ client, onRefresh }: { client: ClientRecord; onRefresh: () => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadClientDocument(client.id, file),
    onSuccess: () => {
      onRefresh();
      toast.success('Document uploaded');
    },
    onError: (error) => toast.error(error.message)
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) => removeClientDocument(client.id, fileId),
    onSuccess: () => {
      onRefresh();
      toast.success('Document removed');
    },
    onError: (error) => toast.error(error.message)
  });

  return (
    <Card
      title="Internal uploads"
      count={client.documents.length}
      action={
        <>
          <Button
            className="h-8 px-2"
            disabled={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload document"
          >
            <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                uploadMutation.mutate(file);
                event.target.value = '';
              }
            }}
          />
        </>
      }
    >
      {client.documents.length === 0 ? (
        <Empty>No uploads</Empty>
      ) : (
        <div className="space-y-2">
          {client.documents.map((document) => (
            <Row
              key={document.fileId}
              icon={<FileText className="h-4 w-4" />}
              onRemove={() => removeMutation.mutate(document.fileId)}
              removeLabel={`Remove ${document.filename}`}
            >
              <a className="min-w-0 flex-1 truncate text-sm hover:text-olive-700" href={apiUrl(`/files/${document.fileId}`)}>
                {document.filename}
              </a>
            </Row>
          ))}
        </div>
      )}
    </Card>
  );
}

function LinksCard({ client, onRefresh }: { client: ClientRecord; onRefresh: () => void }) {
  const [draft, setDraft] = useState<EntityLink>({ label: '', url: '' });
  const [isAdding, setIsAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: (input: EntityLink) => addClientLink(client.id, input),
    onSuccess: () => {
      setDraft({ label: '', url: '' });
      setIsAdding(false);
      onRefresh();
      toast.success('Link added');
    },
    onError: (error) => toast.error(error.message)
  });

  const removeMutation = useMutation({
    mutationFn: (linkIndex: number) => removeClientLink(client.id, linkIndex),
    onSuccess: () => {
      onRefresh();
      toast.success('Link removed');
    },
    onError: (error) => toast.error(error.message)
  });

  function submit() {
    const parsed = linkSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error('Enter a valid link label and URL');
      return;
    }
    addMutation.mutate(parsed.data);
  }

  return (
    <Card
      title="Links"
      count={client.links.length}
      action={
        isAdding ? undefined : (
          <Button className="h-8 px-2" onClick={() => setIsAdding(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        )
      }
    >
      {client.links.length === 0 && !isAdding ? (
        <Empty>No links</Empty>
      ) : (
        <div className="space-y-2">
          {client.links.map((link, index) => (
            <Row
              key={`${link.url}-${index}`}
              icon={<LinkIcon className="h-4 w-4" />}
              onRemove={() => removeMutation.mutate(index)}
              removeLabel={`Remove ${link.label}`}
            >
              <a
                className="flex min-w-0 flex-1 items-center gap-1.5 text-sm hover:text-olive-700"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="truncate">{link.label}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-ink-500" aria-hidden="true" />
              </a>
            </Row>
          ))}
        </div>
      )}

      {isAdding ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            placeholder="Label"
            value={draft.label}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
          />
          <Input
            placeholder="https://..."
            value={draft.url}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={addMutation.isPending}>
              Add link
            </Button>
            <Button
              onClick={() => {
                setIsAdding(false);
                setDraft({ label: '', url: '' });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}

/* ---------- shared bits ---------- */

function ActivityTimeline({ activity }: { activity: ActivityRecord[] }) {
  if (activity.length === 0) {
    return <Empty>No activity</Empty>;
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-[rgba(120,110,90,0.18)] pl-4">
      {activity.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-white bg-olive-700" aria-hidden="true" />
          <div className="font-body text-xs text-ink-500">{formatDate(item.timestamp)}</div>
          <div className="mt-0.5 text-sm">{item.description}</div>
        </li>
      ))}
    </ol>
  );
}

function Card({
  title,
  count,
  action,
  children
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ClayCard>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            {count !== undefined ? <span className="font-body text-xs font-normal text-ink-500">{count}</span> : null}
          </span>
        }
        actions={action}
      />
      {children}
    </ClayCard>
  );
}

function Row({
  icon,
  onRemove,
  removeLabel,
  children
}: {
  icon: ReactNode;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-2">
      <span className="text-ink-500" aria-hidden="true">
        {icon}
      </span>
      {children}
      <Button
        className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100"
        onClick={onRemove}
        aria-label={removeLabel}
      >
        <Trash2 className="h-3 w-3" aria-hidden="true" />
      </Button>
    </div>
  );
}

function SeeAll({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="inline-flex items-center gap-1 font-body text-xs text-ink-500 hover:text-olive-700" onClick={onClick}>
      See all
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-[rgba(120,110,90,0.2)] p-4 text-center font-body text-sm text-ink-500">{children}</div>;
}
