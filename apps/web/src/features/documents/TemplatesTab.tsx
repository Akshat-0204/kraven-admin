import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { documentQueryKeys, listDocumentTemplates } from './documentApi';
import { htmlSnippet, relativeTime } from './documentFormat';

/** Templates tab of the Documents page; each card opens the template editor. */
export function TemplatesTab() {
  const templatesQuery = useQuery({ queryKey: documentQueryKeys.templates, queryFn: listDocumentTemplates });
  const templates = templatesQuery.data?.templates ?? [];

  if (templatesQuery.isLoading) {
    return <div className="rounded border border-border bg-panel p-5 text-sm text-muted">Loading templates...</div>;
  }
  if (templatesQuery.isError) {
    return <div className="rounded border border-red-400/40 bg-panel p-5 text-sm text-red-200">Unable to load templates.</div>;
  }
  if (templates.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
        No templates yet. Run `npm run seed:templates` or create one with "New template".
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <Link
          key={template.id}
          to={`/templates/${template.id}`}
          className="group flex flex-col rounded border border-border bg-panel transition hover:border-white/50"
        >
          <div className="relative h-28 overflow-hidden rounded-t border-b border-border bg-white px-4 py-3">
            <p className="text-[10px] leading-snug text-neutral-600">{htmlSnippet(template.html) || 'Empty template'}</p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white" />
          </div>
          <div className="flex items-start gap-3 p-4">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-white" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{template.name}</h2>
              <p className="mt-1 text-xs text-muted">
                {template.type} · v{template.version} · updated {relativeTime(template.updatedAt)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
