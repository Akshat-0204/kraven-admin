import { PROJECT_STATUSES } from '@kraven/config';
import type { ProjectFilterInput, ProjectInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Delivery</p>
          <h1 className="mt-2 text-2xl font-semibold">Projects</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New project
        </Button>
      </div>

      <div className="grid gap-3 rounded border border-border bg-panel p-3 md:grid-cols-6">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Search project"
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </label>
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
          placeholder="Assigned"
          value={filters.assignedTeam ?? ''}
          onChange={(event) => updateFilter('assignedTeam', event.target.value)}
        />
        <Input
          placeholder="Priority"
          value={filters.priority ?? ''}
          onChange={(event) => updateFilter('priority', event.target.value)}
        />
      </div>

      {projectsQuery.isLoading ? (
        <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading projects...</div>
      ) : projectsQuery.isError ? (
        <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">
          Unable to load projects.
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
          No projects match the current filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-border bg-panel">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Project</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Progress</th>
                <th className="px-3 py-3 font-medium">Value</th>
                <th className="px-3 py-3 font-medium">Deadline</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-white/5">
                  <td className="px-3 py-3">
                    <Link to={`/projects/${project.id}`} className="block">
                      <div className="font-medium">{project.projectName}</div>
                      <div className="text-xs text-muted">{project.assignedTeam || 'Unassigned'}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-32 items-center gap-2">
                      <ProgressBar value={project.progressPercentage} />
                      <span className="w-10 text-xs text-muted">{project.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">{formatCurrency(project.projectValue)}</td>
                  <td className="px-3 py-3 text-muted">{formatDate(project.expectedCompletionDate)}</td>
                  <td className="px-3 py-3">
                    <Button
                      className="h-8 w-8 bg-transparent p-0 text-white hover:bg-white/10"
                      onClick={() => {
                        if (window.confirm(`Delete project ${project.projectName}?`)) {
                          deleteMutation.mutate(project.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
