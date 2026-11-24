import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { documentQueryKeys, listDocumentTemplates } from './documentApi';

export function TemplateListPage() {
  const templatesQuery = useQuery({ queryKey: documentQueryKeys.templates, queryFn: listDocumentTemplates });
  const templates = templatesQuery.data?.templates ?? [];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Documents</p>
          <h1 className="mt-2 text-2xl font-semibold">Templates</h1>
        </div>
        <Button asChild>
          <Link to="/templates/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New template
          </Link>
        </Button>
      </div>

      <div className="rounded border border-border bg-panel">
        {templatesQuery.isLoading ? (
          <div className="p-4 text-sm text-muted">Loading templates...</div>
        ) : templatesQuery.isError ? (
          <div className="p-4 text-sm text-red-200">Unable to load templates.</div>
        ) : templates.length === 0 ? (
          <div className="p-4 text-sm text-muted">No templates yet. Run `npm run seed:templates` or create one.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Version</th>
                <th className="p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-border last:border-0 hover:bg-white/5">
                  <td className="p-3">
                    <Link className="font-medium hover:text-muted" to={`/templates/${template.id}`}>
                      {template.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted">{template.type}</td>
                  <td className="p-3 text-muted">v{template.version}</td>
                  <td className="p-3 text-muted">{new Date(template.updatedAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
