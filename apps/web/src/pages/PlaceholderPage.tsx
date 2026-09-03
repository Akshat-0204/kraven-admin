interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Phase 1 placeholder</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      <div className="rounded border border-border bg-panel p-4 text-sm leading-6 text-muted">
        {description}
      </div>
    </section>
  );
}
