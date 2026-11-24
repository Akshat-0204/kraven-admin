import {
  APP_NAME,
  EXPENSE_CATEGORIES,
  INVOICE_PAYMENT_STATUSES,
  LEAD_STATUSES,
  PROJECT_STATUSES
} from '@kraven/config';
import { changePasswordSchema, type ChangePasswordInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Database,
  Download,
  KeyRound,
  Layers,
  Moon,
  RefreshCw,
  Server,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  User,
  Wallet
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { LeadStatusBadge, ProjectStatusBadge } from '../../components/ui/statusBadge';
import { useAuth } from '../auth/AuthProvider';
import { changePassword, getHealth } from '../../lib/api';
import { listLeads } from '../leads/leadApi';
import { listClients } from '../clients/clientApi';
import { listProjects } from '../projects/projectApi';
import { listInvoices } from '../finance/financeApi';
import { PayeeProfilesSection } from '../portal/PayeeProfilesSection';

type TabType = 'account' | 'workspace' | 'pipeline' | 'payments' | 'system';

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [currency, setCurrency] = useState(() => localStorage.getItem('kraven_currency') ?? 'INR');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('kraven_date_format') ?? 'DD MMM YYYY');
  const [latency, setLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const healthQuery = useQuery({
    queryKey: ['system', 'health'],
    queryFn: getHealth,
    refetchInterval: 30000
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ChangePasswordInput>();

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      toast.success(data.message || 'Password updated successfully');
      reset();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update password');
    }
  });

  async function handlePasswordSubmit(values: ChangePasswordInput) {
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }
    await passwordMutation.mutateAsync(parsed.data);
  }

  function handleSavePreferences() {
    localStorage.setItem('kraven_currency', currency);
    localStorage.setItem('kraven_date_format', dateFormat);
    toast.success('Workspace preferences saved');
  }

  async function pingServer() {
    setIsPinging(true);
    const start = performance.now();
    try {
      await healthQuery.refetch();
      const end = performance.now();
      setLatency(Math.round(end - start));
      toast.success('API ping successful');
    } catch {
      toast.error('Failed to ping API');
    } finally {
      setIsPinging(false);
    }
  }

  async function handleExportData() {
    setIsExporting(true);
    try {
      const [leadsData, clientsData, projectsData, invoicesData] = await Promise.all([
        listLeads().catch(() => ({ leads: [] })),
        listClients().catch(() => ({ clients: [] })),
        listProjects().catch(() => ({ projects: [] })),
        listInvoices().catch(() => ({ invoices: [] }))
      ]);

      const exportPayload = {
        exportDate: new Date().toISOString(),
        application: APP_NAME,
        data: {
          leads: leadsData.leads,
          clients: clientsData.clients,
          projects: projectsData.projects,
          invoices: invoicesData.invoices
        }
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kraven-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Workspace data exported');
    } catch (error) {
      toast.error((error as Error).message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  function handleClearCache() {
    queryClient.clear();
    toast.success('Query cache cleared');
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Administration</p>
        <h1 className="mt-2 text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your account security, workspace preferences, pipelines, and system configuration.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <TabButton
          icon={<User className="h-4 w-4" />}
          label="Account & Security"
          active={activeTab === 'account'}
          onClick={() => setActiveTab('account')}
        />
        <TabButton
          icon={<Sliders className="h-4 w-4" />}
          label="Workspace Preferences"
          active={activeTab === 'workspace'}
          onClick={() => setActiveTab('workspace')}
        />
        <TabButton
          icon={<Layers className="h-4 w-4" />}
          label="Pipelines & Stages"
          active={activeTab === 'pipeline'}
          onClick={() => setActiveTab('pipeline')}
        />
        <TabButton
          icon={<Wallet className="h-4 w-4" />}
          label="Payments"
          active={activeTab === 'payments'}
          onClick={() => setActiveTab('payments')}
        />
        <TabButton
          icon={<Server className="h-4 w-4" />}
          label="System & Diagnostics"
          active={activeTab === 'system'}
          onClick={() => setActiveTab('system')}
        />
      </div>

      {activeTab === 'account' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded border border-border bg-panel p-5">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-black text-indigo-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">User Profile</h2>
                  <p className="text-xs text-muted">Your active credentials and role</p>
                </div>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/50 py-2">
                  <dt className="text-muted">Email address</dt>
                  <dd className="font-medium text-white">{user?.email || '-'}</dd>
                </div>
                <div className="flex justify-between border-b border-border/50 py-2">
                  <dt className="text-muted">User ID</dt>
                  <dd className="font-mono text-xs text-muted">{user?.id || '-'}</dd>
                </div>
                <div className="flex justify-between border-b border-border/50 py-2">
                  <dt className="text-muted">Role</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                    <Shield className="h-3.5 w-3.5" /> Administrator
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Session Status</dt>
                  <dd className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Active (HTTP-only Cookie)
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-base font-semibold">Security & Access Policy</h2>
              <p className="mt-1 text-xs text-muted">Authentication rules active on this Kraven instance</p>
              <ul className="mt-4 space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Bcrypt 12-round password hashing enabled
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Cross-site request protection with secure session cookies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Express trust proxy enabled for cloud deployments
                </li>
              </ul>
            </section>
          </div>

          <section className="rounded border border-border bg-panel p-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-black text-amber-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Change Password</h2>
                <p className="text-xs text-muted">Update your account login password</p>
              </div>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit(handlePasswordSubmit)}>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Current password</span>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  {...register('currentPassword', { required: 'Current password is required' })}
                />
                {errors.currentPassword && (
                  <span className="text-xs text-red-300">{errors.currentPassword.message}</span>
                )}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm text-muted">New password</span>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                />
                {errors.newPassword && (
                  <span className="text-xs text-red-300">{errors.newPassword.message}</span>
                )}
              </label>

              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting || passwordMutation.isPending} className="w-full">
                  {isSubmitting || passwordMutation.isPending ? 'Updating password...' : 'Update password'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {activeTab === 'workspace' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded border border-border bg-panel p-5 space-y-4">
            <h2 className="text-base font-semibold">Workspace Configuration</h2>
            <p className="text-xs text-muted">Regional and financial presentation settings</p>

            <div className="space-y-4 pt-2">
              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Application name</span>
                <Input value={APP_NAME} disabled className="opacity-75 cursor-not-allowed" />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Currency presentation</span>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </Select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm text-muted">Date format</span>
                <Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  <option value="DD MMM YYYY">03 Sept 2026 (Standard)</option>
                  <option value="YYYY-MM-DD">2026-09-03 (ISO 8601)</option>
                  <option value="MM/DD/YYYY">09/03/2026 (US Format)</option>
                </Select>
              </label>

              <div className="pt-3">
                <Button onClick={handleSavePreferences}>Save workspace preferences</Button>
              </div>
            </div>
          </section>

          <section className="rounded border border-border bg-panel p-5 space-y-4">
            <h2 className="text-base font-semibold">Appearance & Typography</h2>
            <p className="text-xs text-muted">Theme and font details active in this build</p>

            <div className="space-y-3 pt-2 text-sm">
              <div className="rounded border border-border bg-black p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span>Color Theme</span>
                </div>
                <span className="text-xs text-muted">Dark Mode (Default)</span>
              </div>

              <div className="rounded border border-border bg-black p-3 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Configured Font Families</span>
                </div>
                <p className="text-xs text-muted font-open">Open Sans (Primary Sans font)</p>
                <p className="text-xs text-muted font-valley">Valley Sans (Display fallback)</p>
                <p className="text-xs text-muted font-alien">Alien Block (Accents)</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <section className="rounded border border-border bg-panel p-5">
            <h2 className="text-base font-semibold">Lead Pipeline Stages</h2>
            <p className="mt-1 text-xs text-muted">Configured stages for incoming inquiries and opportunities</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {LEAD_STATUSES.map((status, index) => (
                <div key={status} className="flex items-center justify-between rounded border border-border bg-black p-3">
                  <span className="text-xs text-muted">#{index + 1}</span>
                  <LeadStatusBadge status={status} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded border border-border bg-panel p-5">
            <h2 className="text-base font-semibold">Project Delivery Stages</h2>
            <p className="mt-1 text-xs text-muted">Configured workflow stages for client projects</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {PROJECT_STATUSES.map((status, index) => (
                <div key={status} className="flex items-center justify-between rounded border border-border bg-black p-3">
                  <span className="text-xs text-muted">Step {index + 1}</span>
                  <ProjectStatusBadge status={status} />
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-base font-semibold">Invoice Payment Statuses</h2>
              <p className="mt-1 text-xs text-muted">Automated financial tracking states</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {INVOICE_PAYMENT_STATUSES.map((status) => (
                  <span key={status} className="rounded border border-border bg-black px-2.5 py-1 text-xs font-medium text-white">
                    {status}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded border border-border bg-panel p-5">
              <h2 className="text-base font-semibold">Expense Categories</h2>
              <p className="mt-1 text-xs text-muted">Cost center allocation categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((category) => (
                  <span key={category} className="rounded border border-border bg-black px-2.5 py-1 text-xs font-medium text-muted">
                    {category}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="max-w-2xl">
          <PayeeProfilesSection />
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded border border-border bg-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Server className="h-5 w-5 text-indigo-400" />
                <div>
                  <h2 className="text-base font-semibold">API & Server Diagnostics</h2>
                  <p className="text-xs text-muted">Live connection status</p>
                </div>
              </div>
              <Button className="h-8 text-xs" onClick={pingServer} disabled={isPinging}>
                <Activity className={`mr-1.5 h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                {isPinging ? 'Pinging...' : 'Ping API'}
              </Button>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/50 py-2">
                <dt className="text-muted">API Health</dt>
                <dd className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {healthQuery.data?.status === 'ok' ? 'Healthy (OK)' : 'Connecting...'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-border/50 py-2">
                <dt className="text-muted">Ping Latency</dt>
                <dd className="font-mono text-xs text-white">
                  {latency !== null ? `${latency} ms` : 'Click Ping to test'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-border/50 py-2">
                <dt className="text-muted">Database Engine</dt>
                <dd className="inline-flex items-center gap-1 text-xs text-white">
                  <Database className="h-3.5 w-3.5 text-emerald-400" /> MongoDB 8.x
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-muted">Vite Client Environment</dt>
                <dd className="font-mono text-xs text-muted">{import.meta.env.MODE}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded border border-border bg-panel p-5 space-y-4">
            <h2 className="text-base font-semibold">Data Backup & Maintenance</h2>
            <p className="text-xs text-muted">Export workspace data or clear query cache</p>

            <div className="space-y-3 pt-2">
              <div className="rounded border border-border bg-black p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Export Workspace JSON</div>
                  <div className="text-xs text-muted">Download all leads, clients, projects, and invoices</div>
                </div>
                <Button className="h-8 text-xs" onClick={handleExportData} disabled={isExporting}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>

              <div className="rounded border border-border bg-black p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Clear Query Cache</div>
                  <div className="text-xs text-muted">Force refresh all in-memory client queries</div>
                </div>
                <Button
                  className="h-8 text-xs bg-transparent text-red-300 hover:bg-red-500/20 border-red-500/30"
                  onClick={handleClearCache}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Clear Cache
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-white text-black shadow'
          : 'text-muted hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
