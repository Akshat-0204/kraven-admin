import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { documentQueryKeys, listDocumentTemplates } from './documentApi';

export function TemplateListPage() {
  const templatesQuery = useQuery({ queryKey: documentQueryKeys.templates, queryFn: listDocumentTemplates });
  const templates = templatesQuery.data?.templates ?? [];

  return (
    <section className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-display text-xs uppercase tracking-wider text-olive-700">
            Documents & Templates
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">
            Document Templates
          </h1>
          <p className="font-body text-sm text-ink-500">
            Create and maintain proposal, contract, and invoice templates with dynamic merge variables.
          </p>
        </div>

        <div>
          <Link
            to="/templates/new"
            className="clay-btn clay-btn--primary inline-flex h-11 items-center justify-center gap-2 rounded-pill px-5 text-sm font-body font-medium shadow-[var(--clay-green)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New template</span>
          </Link>
        </div>
      </div>

      {/* Templates Table Card */}
      <div className="clay-card p-0 overflow-hidden rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface">
        {templatesQuery.isLoading ? (
          <div className="p-8 text-center font-body text-sm text-ink-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-olive-600 border-t-transparent mb-2" />
            <p>Loading templates...</p>
          </div>
        ) : templatesQuery.isError ? (
          <div className="p-8 text-center font-body text-sm text-danger-fg">
            Unable to load templates. Please refresh the page.
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive-100 text-olive-700 shadow-[var(--clay-raised-sm)]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-bold text-ink-900">No templates yet</h3>
            <p className="mx-auto max-w-sm font-body text-xs text-ink-500">
              Get started by creating a new template or seeding standard templates.
            </p>
            <div className="pt-2">
              <Link
                to="/templates/new"
                className="clay-btn clay-btn--primary inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-xs font-body font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create first template</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(120,110,90,0.14)] bg-surface-soft/80 font-display text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-6 py-4 font-normal">Name</th>
                  <th className="px-6 py-4 font-normal">Type</th>
                  <th className="px-6 py-4 font-normal">Version</th>
                  <th className="px-6 py-4 font-normal">Last Updated</th>
                  <th className="px-6 py-4 font-normal text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(120,110,90,0.12)]">
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    className="group transition-colors hover:bg-surface-soft/70"
                  >
                    <td className="px-6 py-4">
                      <Link
                        className="font-body text-sm font-semibold text-ink-900 group-hover:text-olive-700 transition-colors flex items-center gap-2.5"
                        to={`/templates/${template.id}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-olive-100 text-olive-700 shadow-[var(--clay-raised-sm)]">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <span>{template.name}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="clay-chip bg-sand-200 text-ink-800 text-xs">
                        {template.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="clay-chip bg-olive-100 text-olive-800 text-xs">
                        v{template.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-body text-xs text-ink-500">
                      {new Date(template.updatedAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/templates/${template.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 group-hover:text-olive-700 transition-colors"
                      >
                        <span>Edit</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
