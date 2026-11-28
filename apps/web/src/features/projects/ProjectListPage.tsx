import { PROJECT_STATUSES } from '@kraven/config';
import type { ProjectFilterInput, ProjectInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { ProgressBar } from '../../components/ui/progressBar';
import { Select } from '../../components/ui/select';
import { ProjectStatusBadge } from '../../components/ui/statusBadge';
import { clientQueryKeys, listClients } from '../clients/clientApi';
import {
  createProject,
  deleteProject,
  listProjects,
  projectQueryKeys
} from './projectApi';
import { formatCurrency, formatDate } from './projectFormat';
import { ProjectFormModal } from './ProjectFormModal';

export function ProjectListPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProjectFilterInput>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list(filters),
    queryFn: () => listProjects(filters)
  });

  const clientsQuery = useQuery({
    queryKey: clientQueryKeys.list({ search: '' }),
    queryFn: () => listClients({ search: '' })
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success('Project created');
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
      toast.success('Project deleted');
    },
    onError: (error) => toast.error(error.message)
  });

  const projects = projectsQuery.data?.projects ?? [];

  function updateFilter(key: keyof ProjectFilterInput, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined
    }));
  }

  async function handleCreateProject(input: ProjectInput) {
    await createMutation.mutateAsync(input);
  }

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">Delivery & Execution</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">Projects</h1>
          <p className="font-body text-sm text-ink-500">
            Monitor project milestones, client deliverables, and fulfillment progress.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn clay-btn--primary inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-body font-medium shadow-[var(--clay-green)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="clay-card p-4 rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface grid gap-3 sm:gap-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <Input
            startIcon={<Search className="h-4 w-4 text-ink-500" aria-hidden="true" />}
            placeholder="Search projects..."
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </div>
        <Select value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select value={filters.client ?? ''} onChange={(event) => updateFilter('client', event.target.value)}>
          <option value="">All clients</option>
          {(clientsQuery.data?.clients ?? []).map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Assigned team"
          value={filters.assignedTeam ?? ''}
          onChange={(event) => updateFilter('assignedTeam', event.target.value)}
        />
        <Input
          placeholder="Priority"
          value={filters.priority ?? ''}
          onChange={(event) => updateFilter('priority', event.target.value)}
        />
      </div>

      {/* Projects Table Card */}
      {projectsQuery.isLoading ? (
        <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
          <p>Loading projects...</p>
        </div>
      ) : projectsQuery.isError ? (
        <div className="clay-card p-8 text-center font-body text-sm text-danger-fg">
          Unable to load projects. Please refresh the page.
        </div>
      ) : projects.length === 0 ? (
        <div className="clay-card p-12 text-center font-body text-sm text-ink-500">
          No projects match the current filters. Try adjusting your query or create a new project.
        </div>
      ) : (
        <div className="clay-card p-0 overflow-hidden rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-[rgba(120,110,90,0.14)] bg-surface-soft/80 font-display text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-5 py-4 font-normal">Project & Team</th>
                  <th className="px-5 py-4 font-normal">Status</th>
                  <th className="px-5 py-4 font-normal">Progress</th>
                  <th className="px-5 py-4 font-normal">Project Value</th>
                  <th className="px-5 py-4 font-normal">Deadline</th>
                  <th className="px-5 py-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(120,110,90,0.12)]">
                {projects.map((project) => (
                  <tr key={project.id} className="group transition-colors hover:bg-surface-soft/70">
                    <td className="px-5 py-4">
                      <Link to={`/projects/${project.id}`} className="block">
                        <div className="font-semibold text-ink-900 group-hover:text-olive-700 transition-colors">
                          {project.projectName}
                        </div>
                        <div className="text-xs text-ink-500 font-normal">
                          {project.assignedTeam || 'Unassigned'}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-36 items-center gap-2.5">
                        <ProgressBar value={project.progressPercentage} />
                        <span className="w-10 text-xs font-mono font-medium text-ink-600">
                          {project.progressPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-ink-800">
                      {formatCurrency(project.projectValue)}
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-600">
                      {formatDate(project.expectedCompletionDate)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`Delete project ${project.projectName}`}
                        title="Delete project"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 text-ink-500 hover:text-danger-fg hover:shadow-[var(--clay-hover)] transition-all active:scale-[0.96]"
                        onClick={() => {
                          if (window.confirm(`Delete project ${project.projectName}?`)) {
                            deleteMutation.mutate(project.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProjectFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
      />
    </section>
  );
}
