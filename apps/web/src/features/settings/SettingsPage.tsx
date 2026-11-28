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
  Palette,
  RefreshCw,
  Server,
  Shield,
  Sliders,
  Sun,
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
    <section className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        <p className="font-display text-xs uppercase tracking-wider text-olive-700">Administration & Preferences</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">Settings</h1>
        <p className="font-body text-sm text-ink-500">
          Manage your account security, workspace preferences, pipelines, and system configuration.
        </p>
      </div>

      {/* Tab Navigation Pill Well */}
      <div className="clay-card p-1.5 rounded-pill border border-white/80 shadow-[var(--clay-raised-sm)] bg-surface inline-flex flex-wrap gap-1.5">
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

      {/* Tab 1: Account & Security */}
      {activeTab === 'account' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
              <div className="flex items-center gap-3.5 border-b border-[rgba(120,110,90,0.12)] pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-800 font-bold shadow-[var(--clay-raised-sm)] border border-white/90">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink-900">User Profile</h2>
                  <p className="font-body text-xs text-ink-500">Your active credentials and authenticated role</p>
                </div>
              </div>

              <dl className="space-y-3 font-body text-sm pt-1">
                <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                  <dt className="text-ink-500">Email Address</dt>
                  <dd className="font-semibold text-ink-900">{user?.email || '-'}</dd>
                </div>
                <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                  <dt className="text-ink-500">Account Identifier</dt>
                  <dd className="font-mono text-xs text-ink-600">{user?.id || '-'}</dd>
                </div>
                <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                  <dt className="text-ink-500">Role Privilege</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-olive-800">
                    <Shield className="h-3.5 w-3.5 text-olive-700" /> Administrator
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-ink-500">Session Status</dt>
                  <dd className="inline-flex items-center gap-2 text-xs font-medium text-olive-800">
                    <span className="h-2 w-2 rounded-full bg-olive-600 animate-pulse" /> Active (HTTP-only Secure Cookie)
                  </dd>
                </div>
              </dl>
            </section>

            <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-3">
              <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
                <h2 className="font-display text-base font-bold text-ink-900">Security & Authentication Policy</h2>
                <p className="font-body text-xs text-ink-500">Active cryptographic and session safeguards</p>
              </div>
              <ul className="space-y-2.5 font-body text-xs text-ink-700 pt-1">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-olive-600 shrink-0" />
                  Bcrypt salted password encryption enabled
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-olive-600 shrink-0" />
                  Cross-site request forgery protection with strict SameSite cookies
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-olive-600 shrink-0" />
                  Reverse proxy trust headers verified for secure cloud deployments
                </li>
              </ul>
            </section>
          </div>

          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="flex items-center gap-3.5 border-b border-[rgba(120,110,90,0.12)] pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand-200 text-ink-800 shadow-[var(--clay-raised-sm)] border border-white/90">
                <KeyRound className="h-5 w-5 text-olive-800" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">Change Password</h2>
                <p className="font-body text-xs text-ink-500">Update your dashboard authentication password</p>
              </div>
            </div>

            <form className="space-y-4 pt-1" onSubmit={handleSubmit(handlePasswordSubmit)}>
              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  Current Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter existing password"
                  className={errors.currentPassword ? 'w-full outline-2 outline-[var(--danger-fg)]' : 'w-full'}
                  {...register('currentPassword', { required: 'Current password is required' })}
                />
                {errors.currentPassword && (
                  <span className="block mt-1 font-body text-xs text-danger-fg">{errors.currentPassword.message}</span>
                )}
              </div>

              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  className={errors.newPassword ? 'w-full outline-2 outline-[var(--danger-fg)]' : 'w-full'}
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                />
                {errors.newPassword && (
                  <span className="block mt-1 font-body text-xs text-danger-fg">{errors.newPassword.message}</span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || passwordMutation.isPending}
                  className="clay-btn clay-btn--primary w-full h-11 rounded-pill font-body text-sm font-medium text-white shadow-[var(--clay-green)] disabled:opacity-50"
                >
                  {isSubmitting || passwordMutation.isPending ? 'Updating password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Tab 2: Workspace Preferences */}
      {activeTab === 'workspace' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Workspace Configuration</h2>
              <p className="font-body text-xs text-ink-500">Regional and financial presentation settings</p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  Application Name
                </label>
                <Input value={APP_NAME} disabled className="opacity-75 cursor-not-allowed w-full" />
              </div>

              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  Currency Presentation
                </label>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full">
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </Select>
              </div>

              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  Date Format
                </label>
                <Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="w-full">
                  <option value="DD MMM YYYY">03 Sept 2026 (Standard)</option>
                  <option value="YYYY-MM-DD">2026-09-03 (ISO 8601)</option>
                  <option value="MM/DD/YYYY">09/03/2026 (US Format)</option>
                </Select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="clay-btn clay-btn--primary h-11 px-6 rounded-pill font-body text-sm font-medium text-white shadow-[var(--clay-green)]"
                >
                  Save Workspace Preferences
                </button>
              </div>
            </div>
          </section>

          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Design System & Appearance</h2>
              <p className="font-body text-xs text-ink-500">Design tokens and font rules active in this build</p>
            </div>

            <div className="space-y-3 pt-1 text-sm font-body">
              <div className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sun className="h-5 w-5 text-olive-700" />
                  <div>
                    <span className="font-semibold text-ink-900 block">Theme Scheme</span>
                    <span className="text-xs text-ink-500">Light Mode (Claymorphic Sand Canvas)</span>
                  </div>
                </div>
                <span className="clay-chip text-xs bg-olive-100 text-olive-800">
                  Active
                </span>
              </div>

              <div className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-olive-700" />
                  <div>
                    <span className="font-semibold text-ink-900 block">Active Typography</span>
                    <span className="text-xs text-ink-500">Strict Two-Font System (Section 2.1)</span>
                  </div>
                </div>
                <div className="pt-1 space-y-1 font-body text-xs text-ink-700">
                  <p><span className="font-display font-bold">Space Grotesk: </span>Used for all headings, title banners, and eyebrows.</p>
                  <p><span className="font-semibold">Poppins: </span>Used for body copy, form controls, buttons, tables, and chips.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: Pipelines & Stages */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Lead Pipeline Stages</h2>
              <p className="font-body text-xs text-ink-500">Configured stages for incoming inquiries and opportunities</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-1">
              {LEAD_STATUSES.map((status, index) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-3.5"
                >
                  <span className="font-mono text-xs text-ink-500">#{index + 1}</span>
                  <LeadStatusBadge status={status} />
                </div>
              ))}
            </div>
          </section>

          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Project Delivery Stages</h2>
              <p className="font-body text-xs text-ink-500">Configured workflow stages for client project fulfillment</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 pt-1">
              {PROJECT_STATUSES.map((status, index) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-3.5"
                >
                  <span className="font-mono text-xs text-ink-500">Phase {index + 1}</span>
                  <ProjectStatusBadge status={status} />
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-3">
              <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
                <h2 className="font-display text-base font-bold text-ink-900">Invoice Payment Statuses</h2>
                <p className="font-body text-xs text-ink-500">Automated ledger states</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {INVOICE_PAYMENT_STATUSES.map((status) => (
                  <span
                    key={status}
                    className="clay-chip text-xs bg-sand-200 text-ink-800 font-medium px-3 py-1"
                  >
                    {status}
                  </span>
                ))}
              </div>
            </section>

            <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-3">
              <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
                <h2 className="font-display text-base font-bold text-ink-900">Expense Allocation Categories</h2>
                <p className="font-body text-xs text-ink-500">Cost accounting breakdown tags</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {EXPENSE_CATEGORIES.map((category) => (
                  <span
                    key={category}
                    className="clay-chip text-xs bg-olive-100 text-olive-800 font-medium px-3 py-1"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Tab 4: Payments */}
      {activeTab === 'payments' && (
        <div className="max-w-3xl">
          <PayeeProfilesSection />
        </div>
      )}

      {/* Tab 5: System & Diagnostics */}
      {activeTab === 'system' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-100 text-olive-800 shadow-[var(--clay-raised-sm)] border border-white/90">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink-900">API & Server Diagnostics</h2>
                  <p className="font-body text-xs text-ink-500">Live operational telemetry</p>
                </div>
              </div>
              <button
                type="button"
                className="clay-btn clay-btn--secondary h-9 px-4 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 hover:text-olive-700 flex items-center gap-1.5"
                onClick={pingServer}
                disabled={isPinging}
              >
                <Activity className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'Pinging...' : 'Ping API'}</span>
              </button>
            </div>

            <dl className="space-y-3 font-body text-sm pt-1">
              <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                <dt className="text-ink-500">API Health Status</dt>
                <dd className="inline-flex items-center gap-1.5 font-semibold text-olive-800">
                  <span className="h-2 w-2 rounded-full bg-olive-600 animate-pulse" />
                  {healthQuery.data?.status === 'ok' ? 'Healthy (OK)' : 'Connecting...'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                <dt className="text-ink-500">Ping Latency</dt>
                <dd className="font-mono text-xs font-semibold text-ink-900">
                  {latency !== null ? `${latency} ms` : 'Click Ping to test'}
                </dd>
              </div>
              <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                <dt className="text-ink-500">Database Engine</dt>
                <dd className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900">
                  <Database className="h-3.5 w-3.5 text-olive-700" /> MongoDB 8.x
                </dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-500">Client Build Mode</dt>
                <dd className="font-mono text-xs text-ink-600 uppercase">{import.meta.env.MODE}</dd>
              </div>
            </dl>
          </section>

          <section className="clay-card p-6 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface space-y-4">
            <div className="border-b border-[rgba(120,110,90,0.12)] pb-3">
              <h2 className="font-display text-base font-bold text-ink-900">Data Backup & Maintenance</h2>
              <p className="font-body text-xs text-ink-500">Export workspace records or invalidate in-memory query cache</p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-body text-sm font-semibold text-ink-900">Export Workspace JSON</div>
                  <div className="font-body text-xs text-ink-500">Backup all leads, clients, projects, and invoices</div>
                </div>
                <button
                  type="button"
                  className="clay-btn clay-btn--primary h-9 px-4 rounded-pill font-body text-xs font-medium text-white shadow-[var(--clay-green)] flex items-center justify-center gap-1.5 shrink-0"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isExporting ? 'Exporting...' : 'Export Data'}</span>
                </button>
              </div>

              <div className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-body text-sm font-semibold text-ink-900">Clear Query Cache</div>
                  <div className="font-body text-xs text-ink-500">Force invalidate all in-memory client queries</div>
                </div>
                <button
                  type="button"
                  className="clay-btn h-9 px-4 rounded-pill font-body text-xs font-medium text-danger-fg bg-surface shadow-[var(--clay-raised-sm)] border border-danger-fg/30 hover:bg-danger-fg/10 flex items-center justify-center gap-1.5 shrink-0"
                  onClick={handleClearCache}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Clear Cache</span>
                </button>
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
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 font-body text-xs sm:text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-ink-900 text-white shadow-[var(--clay-pressed)]'
          : 'text-ink-600 hover:text-ink-900 hover:bg-surface-soft'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
