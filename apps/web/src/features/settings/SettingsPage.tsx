import {
  APP_NAME,
  EXPENSE_CATEGORIES,
  INVOICE_PAYMENT_STATUSES,
  LEAD_STATUSES,
  PROJECT_STATUSES
} from '@kraven/config';
import { errorMessage } from '../../lib/api';
import { applyServerErrors } from '../../lib/formErrors';
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
import {
  Button,
  Card,
  CardHeader,
  Input,
  LeadStatusBadge,
  PageHeader,
  ProjectStatusBadge,
  Select
} from '../../components/ui';
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
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ChangePasswordInput>();

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      toast.success(data.message || 'Password updated successfully');
      reset();
    },
  });

  async function handlePasswordSubmit(values: ChangePasswordInput) {
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'currentPassword' || field === 'newPassword') {
          setError(field, { type: 'validation', message: issue.message });
        }
      }
      return;
    }
    try {
      await passwordMutation.mutateAsync(parsed.data);
    } catch (error) {
      applyServerErrors(error, setError, 'Failed to update password');
    }
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
      const result = await healthQuery.refetch();
      if (result.error) throw result.error;
      const end = performance.now();
      setLatency(Math.round(end - start));
      toast.success('API ping successful');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to ping API'));
    } finally {
      setIsPinging(false);
    }
  }

  async function handleExportData() {
    setIsExporting(true);
    try {
      const [leadsData, clientsData, projectsData, invoicesData] = await Promise.all([
        listLeads(),
        listClients(),
        listProjects(),
        listInvoices()
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
      toast.error(errorMessage(error, 'Export failed'));
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
      <PageHeader
        eyebrow="Administration & Preferences"
        title="Settings"
        subtitle="Manage your account security, workspace preferences, pipelines, and system configuration."
      />

      {/* Tab Navigation Pill Well */}
      <Card className="inline-flex flex-wrap gap-1.5 rounded-pill p-1.5">
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
      </Card>

      {/* Tab 1: Account & Security */}
      {activeTab === 'account' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex items-center gap-3.5 border-b border-[rgba(120,110,90,0.12)] pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive-100 text-olive-900 font-bold shadow-clay-sm border border-white/90">
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
                  <dd className="font-mono text-xs text-ink-700">{user?.id || '-'}</dd>
                </div>
                <div className="flex justify-between border-b border-[rgba(120,110,90,0.1)] py-2">
                  <dt className="text-ink-500">Role Privilege</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-olive-900">
                    <Shield className="h-3.5 w-3.5 text-olive-700" /> Administrator
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-ink-500">Session Status</dt>
                  <dd className="inline-flex items-center gap-2 text-xs font-medium text-olive-900">
                    <span className="h-2 w-2 rounded-full bg-olive-700 animate-pulse" /> Active (HTTP-only Secure Cookie)
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="space-y-3">
              <CardHeader title="Security & Authentication Policy" subtitle="Active cryptographic and session safeguards" />
              <ul className="space-y-2.5 font-body text-xs text-ink-700 pt-1">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-olive-700 shrink-0" />
                  Bcrypt salted password encryption enabled
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-olive-700 shrink-0" />
                  Cross-site request forgery protection with strict SameSite cookies
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-olive-700 shrink-0" />
                  Reverse proxy trust headers verified for secure cloud deployments
                </li>
              </ul>
            </Card>
          </div>

          <Card className="space-y-4">
            <div className="flex items-center gap-3.5 border-b border-[rgba(120,110,90,0.12)] pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand-200 text-ink-900 shadow-clay-sm border border-white/90">
                <KeyRound className="h-5 w-5 text-olive-900" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-ink-900">Change Password</h2>
                <p className="font-body text-xs text-ink-500">Update your dashboard authentication password</p>
              </div>
            </div>

            <form className="space-y-4 pt-1" onSubmit={handleSubmit(handlePasswordSubmit)}>
              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  Current Password <span className="text-olive-700">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="Enter existing password"
                  className={errors.currentPassword ? 'w-full outline-2 outline-danger-fg' : 'w-full'}
                  {...register('currentPassword', { required: 'Current password is required' })}
                />
                {errors.currentPassword && (
                  <span className="block mt-1 font-body text-xs text-danger-fg">{errors.currentPassword.message}</span>
                )}
              </div>

              <div>
                <label className="block font-body text-sm font-medium text-ink-700 mb-1.5">
                  New Password <span className="text-olive-700">*</span>
                </label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  className={errors.newPassword ? 'w-full outline-2 outline-danger-fg' : 'w-full'}
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
                  className="clay-btn clay-btn--primary w-full h-11 rounded-pill font-body text-sm font-medium text-white shadow-clay-green disabled:opacity-50"
                >
                  {isSubmitting || passwordMutation.isPending ? 'Updating password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tab 2: Workspace Preferences */}
      {activeTab === 'workspace' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <CardHeader title="Workspace Configuration" subtitle="Regional and financial presentation settings" />

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
                  className="clay-btn clay-btn--primary h-11 px-6 rounded-pill font-body text-sm font-medium text-white shadow-clay-green"
                >
                  Save Workspace Preferences
                </button>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardHeader title="Design System & Appearance" subtitle="Design tokens and font rules active in this build" />

            <div className="space-y-3 pt-1 text-sm font-body">
              <div className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sun className="h-5 w-5 text-olive-700" />
                  <div>
                    <span className="font-semibold text-ink-900 block">Theme Scheme</span>
                    <span className="text-xs text-ink-500">Light Mode (Claymorphic Sand Canvas)</span>
                  </div>
                </div>
                <span className="clay-chip text-xs bg-olive-100 text-olive-900">
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
          </Card>
        </div>
      )}

      {/* Tab 3: Pipelines & Stages */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <CardHeader title="Lead Pipeline Stages" subtitle="Configured stages for incoming inquiries and opportunities" />
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
          </Card>

          <Card className="space-y-4">
            <CardHeader title="Project Delivery Stages" subtitle="Configured workflow stages for client project fulfillment" />
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
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-3">
              <CardHeader title="Invoice Payment Statuses" subtitle="Automated ledger states" />
              <div className="flex flex-wrap gap-2 pt-1">
                {INVOICE_PAYMENT_STATUSES.map((status) => (
                  <span
                    key={status}
                    className="clay-chip text-xs bg-sand-200 text-ink-900 font-medium px-3 py-1"
                  >
                    {status}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="space-y-3">
              <CardHeader title="Expense Allocation Categories" subtitle="Cost accounting breakdown tags" />
              <div className="flex flex-wrap gap-2 pt-1">
                {EXPENSE_CATEGORIES.map((category) => (
                  <span
                    key={category}
                    className="clay-chip text-xs bg-olive-100 text-olive-900 font-medium px-3 py-1"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </Card>
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
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(120,110,90,0.12)] pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-100 text-olive-900 shadow-clay-sm border border-white/90">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink-900">API & Server Diagnostics</h2>
                  <p className="font-body text-xs text-ink-500">Live operational telemetry</p>
                </div>
              </div>
              <button
                type="button"
                className="clay-btn clay-btn--secondary h-9 px-4 rounded-pill font-body text-xs font-medium text-ink-900 bg-surface shadow-clay-sm border border-white/80 hover:text-olive-700 flex items-center gap-1.5"
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
                <dd className="inline-flex items-center gap-1.5 font-semibold text-olive-900">
                  <span className="h-2 w-2 rounded-full bg-olive-700 animate-pulse" />
                  {healthQuery.data?.status === 'ok'
                    ? 'Healthy (OK)'
                    : healthQuery.isError
                      ? `Unreachable: ${errorMessage(healthQuery.error)}`
                      : 'Connecting...'}
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
                <dd className="font-mono text-xs text-ink-700 uppercase">{import.meta.env.MODE}</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-4">
            <CardHeader title="Data Backup & Maintenance" subtitle="Export workspace records or invalidate in-memory query cache" />

            <div className="space-y-3 pt-1">
              <div className="rounded-md border border-[rgba(120,110,90,0.12)] bg-surface-soft p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-body text-sm font-semibold text-ink-900">Export Workspace JSON</div>
                  <div className="font-body text-xs text-ink-500">Backup all leads, clients, projects, and invoices</div>
                </div>
                <button
                  type="button"
                  className="clay-btn clay-btn--primary h-9 px-4 rounded-pill font-body text-xs font-medium text-white shadow-clay-green flex items-center justify-center gap-1.5 shrink-0"
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
                  className="clay-btn h-9 px-4 rounded-pill font-body text-xs font-medium text-danger-fg bg-surface shadow-clay-sm border border-danger-fg/30 hover:bg-danger-fg/10 flex items-center justify-center gap-1.5 shrink-0"
                  onClick={handleClearCache}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Clear Cache</span>
                </button>
              </div>
            </div>
          </Card>
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
          ? 'bg-ink-900 text-white shadow-clay-pressed'
          : 'text-ink-700 hover:text-ink-900 hover:bg-surface-soft'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
