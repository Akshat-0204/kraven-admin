import { PROJECT_STATUSES } from '@kraven/config';
import type { ProjectFilterInput, ProjectInput } from '@kraven/validation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Card,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  ProgressBar,
  ProjectStatusBadge,
  Select,
  Table,
  Td,
  Th
} from '../../components/ui';
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
      <PageHeader
        eyebrow="Delivery & Execution"
        title="Projects"
        subtitle="Monitor project milestones, client deliverables, and fulfillment progress."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="clay-btn clay-btn--primary inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-body font-medium shadow-clay-green transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New project</span>
          </button>
        }
      />

      {/* Filter Card */}
      <Card className="grid gap-3 p-4 sm:gap-4 md:grid-cols-6">
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
      </Card>

      {/* Projects Table Card */}
      {projectsQuery.isLoading ? (
        <Card>
          <LoadingState label="Loading projects..." />
        </Card>
      ) : projectsQuery.isError ? (
        <Card className="p-8 text-center font-body text-sm text-danger-fg">
          Unable to load projects. Please refresh the page.
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState title="No projects match the current filters. Try adjusting your query or create a new project." />
        </Card>
      ) : (
        <Card padded={false}>
            <Table>
              <thead className="border-b border-sand-300/40 bg-sand-100/50">
                <tr>
                  <Th>Project & Team</Th>
                  <Th>Status</Th>
                  <Th>Progress</Th>
                  <Th>Project Value</Th>
                  <Th>Deadline</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-300/30">
                {projects.map((project) => (
                  <tr key={project.id} className="group transition-colors hover:bg-surface-soft/70">
                    <Td>
                      <Link to={`/projects/${project.id}`} className="block">
                        <div className="font-semibold text-ink-900 group-hover:text-olive-700 transition-colors">
                          {project.projectName}
                        </div>
                        <div className="text-xs text-ink-500 font-normal">
                          {project.assignedTeam || 'Unassigned'}
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <ProjectStatusBadge status={project.status} />
                    </Td>
                    <Td>
                      <div className="flex min-w-36 items-center gap-2.5">
                        <ProgressBar value={project.progressPercentage} />
                        <span className="w-10 text-xs font-mono font-medium text-ink-600">
                          {project.progressPercentage}%
                        </span>
                      </div>
                    </Td>
                    <Td className="font-medium text-ink-800">
                      {formatCurrency(project.projectValue)}
                    </Td>
                    <Td className="text-xs text-ink-600">
                      {formatDate(project.expectedCompletionDate)}
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        aria-label={`Delete project ${project.projectName}`}
                        title="Delete project"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-surface shadow-clay-sm border border-white/80 text-ink-500 hover:text-danger-fg hover:shadow-clay-hover transition-all active:scale-[0.96]"
                        onClick={() => {
                          if (window.confirm(`Delete project ${project.projectName}?`)) {
                            deleteMutation.mutate(project.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
        </Card>
      )}

      <ProjectFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateProject}
      />
    </section>
  );
}
