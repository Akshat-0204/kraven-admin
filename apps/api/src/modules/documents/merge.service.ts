import Handlebars from 'handlebars';
import { HttpError } from '../../shared/errors/httpError.js';
import { buildMergeContext, DOCUMENT_VARIABLE_KEYS, type MergeSource } from './document.variables.js';
import { sanitizeTemplateHtml } from './template.sanitize.js';

/** Isolated instance: no helpers or partials registered by anything else can leak into templates. */
const handlebars = Handlebars.create();

/** Cleans up any HTML formatting tags or excess whitespace that accidentally got inserted inside {{...}} placeholders by rich-text editors. */
export function normalizeTemplatePlaceholders(html: string): string {
  return html.replace(/\{\{([^{}]*)\}\}/g, (_match, inner) => {
    const cleanInner = inner.replace(/<[^>]+>/g, '').trim();
    return `{{${cleanInner}}}`;
  });
}

/**
 * Parses template HTML and returns the variable keys it uses. Only plain, HTML-escaped
 * `{{path.to.var}}` placeholders from the registry are allowed: triple-stache, blocks,
 * helpers, partials and unknown variables are rejected with a 400.
 */
export function extractTemplateVariables(html: string): string[] {
  const normalized = normalizeTemplatePlaceholders(html);

  if (/\{\{\s*\}\}/.test(normalized)) {
    throw new HttpError(400, 'Template syntax error: Empty {{}} placeholder is not allowed');
  }

  let program: hbs.AST.Program;
  try {
    program = handlebars.parse(normalized);
  } catch (error) {
    const rawMessage = (error as Error).message || '';
    const cleanMessage = rawMessage.replace(/\s+/g, ' ').trim();
    throw new HttpError(400, `Template syntax error: ${cleanMessage}`);
  }

  const used = new Set<string>();
  const unknown = new Set<string>();

  for (const statement of program.body) {
    if (statement.type === 'ContentStatement' || statement.type === 'CommentStatement') continue;

    if (statement.type !== 'MustacheStatement') {
      throw new HttpError(400, 'Only {{variable}} placeholders are supported in templates');
    }

    const mustache = statement as hbs.AST.MustacheStatement;
    if (!mustache.escaped) {
      throw new HttpError(400, 'Unescaped {{{variable}}} placeholders are not allowed');
    }
    const path = mustache.path as hbs.AST.PathExpression;
    if (path.type !== 'PathExpression' || path.data || path.depth > 0 || mustache.params.length > 0 || mustache.hash) {
      throw new HttpError(400, 'Only {{variable}} placeholders are supported in templates');
    }

    if (DOCUMENT_VARIABLE_KEYS.has(path.original)) {
      used.add(path.original);
    } else {
      unknown.add(path.original);
    }
  }

  if (unknown.size > 0) {
    throw new HttpError(400, `Unknown template variables: ${[...unknown].join(', ')}`);
  }

  return [...used];
}

/** Sanitizes template HTML for storage and validates its placeholders. */
export function prepareTemplateHtml(html: string) {
  const normalized = normalizeTemplatePlaceholders(html);
  const sanitized = sanitizeTemplateHtml(normalized);
  return { html: sanitized, variables: extractTemplateVariables(sanitized) };
}

/**
 * Merges data into template HTML. Values are HTML-escaped by Handlebars; the merged output is
 * sanitized again so a value cannot smuggle a javascript: URL into an attribute like `href`.
 */
export function mergeTemplate(html: string, source: MergeSource) {
  const normalized = normalizeTemplatePlaceholders(html);
  extractTemplateVariables(normalized);
  const render = handlebars.compile(normalized, { knownHelpersOnly: true, strict: false });
  return sanitizeTemplateHtml(render(buildMergeContext(source)));
}

function escapeText(value: string) {
  return handlebars.Utils.escapeExpression(value);
}

const PRINT_CSS = `
  @page { size: A4; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #111; margin: 0; }
  h1 { font-size: 22pt; margin: 0 0 12pt; }
  h2 { font-size: 15pt; margin: 18pt 0 8pt; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; }
  p { margin: 0 0 8pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; page-break-inside: avoid; }
  th, td { border: 1px solid #bbb; padding: 6pt 8pt; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; }
  td p, th p { margin: 0; }
  blockquote { margin: 8pt 0; padding-left: 10pt; border-left: 3px solid #ccc; color: #444; }
  hr { border: none; border-top: 1px solid #ccc; margin: 14pt 0; }
  img { max-width: 100%; }
`;

/** Wraps merged body HTML in the fixed print shell. The result is what is snapshotted and sent to Gotenberg. */
export function wrapPrintDocument(bodyHtml: string, title: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeText(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/** Merged, print-ready HTML for a template and data source (used for previews and snapshots). */
export function renderDocumentHtml(templateHtml: string, title: string, source: MergeSource) {
  return wrapPrintDocument(mergeTemplate(templateHtml, source), title);
}
