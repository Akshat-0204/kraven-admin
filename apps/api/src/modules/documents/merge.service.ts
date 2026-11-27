import { DOCUMENT_CONTENT_CSS } from '@kraven/config';
import Handlebars from 'handlebars';
import { HttpError } from '../../shared/errors/httpError.js';
import {
  buildMergeContext,
  DOCUMENT_VARIABLE_KEYS,
  PAGE_TOKEN_KEYS,
  type MergeContextOptions,
  type MergeSource
} from './document.variables.js';
import { sanitizeTemplateHtml } from './template.sanitize.js';

/** Isolated instance: no helpers or partials registered by anything else can leak into templates. */
const handlebars = Handlebars.create();

/**
 * Editor variable chips (`<span data-variable="client.company">{{client.company}}</span>`) become plain
 * `{{client.company}}` placeholders; the chip's inner text is ignored, the attribute is authoritative.
 */
export function unwrapVariableSpans(html: string): string {
  return html.replace(
    /<span\b[^>]*?\bdata-variable\s*=\s*(?:"([\w.]+)"|'([\w.]+)')[^>]*>[\s\S]*?<\/span>/gi,
    (_match, double: string | undefined, single: string | undefined) => `{{${double ?? single}}}`
  );
}

/** Cleans up any HTML formatting tags or excess whitespace that accidentally got inserted inside {{...}} placeholders by rich-text editors. */
export function normalizeTemplatePlaceholders(html: string): string {
  return unwrapVariableSpans(html).replace(/\{\{([^{}]*)\}\}/g, (_match, inner) => {
    const cleanInner = inner.replace(/<[^>]+>/g, '').trim();
    return `{{${cleanInner}}}`;
  });
}

export interface TemplateSyntaxOptions {
  /** Header/footer only: allow `{{page.number}}` / `{{page.total}}` (they are not reported as variables). */
  allowPageTokens?: boolean;
}

/**
 * Parses template HTML and returns the variable keys it uses. Only plain, HTML-escaped
 * `{{path.to.var}}` placeholders from the registry are allowed: triple-stache, blocks,
 * helpers, partials and unknown variables are rejected with a 400. Page tokens are rejected
 * unless `allowPageTokens` (header/footer).
 */
export function extractTemplateVariables(html: string, options: TemplateSyntaxOptions = {}): string[] {
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

    if (PAGE_TOKEN_KEYS.has(path.original)) {
      if (!options.allowPageTokens) {
        throw new HttpError(400, `{{${path.original}}} can only be used in the header or footer`);
      }
    } else if (DOCUMENT_VARIABLE_KEYS.has(path.original)) {
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

/**
 * Sanitizes template HTML for storage and validates its placeholders. Variable chip spans are kept
 * as-is (the editor round-trips them); only their keys are validated.
 */
export function prepareTemplateHtml(html: string, options: TemplateSyntaxOptions = {}) {
  const sanitized = sanitizeTemplateHtml(cleanPlaceholderMarkup(html));
  return { html: sanitized, variables: extractTemplateVariables(sanitized, options) };
}

/** Strips rich-text tags inside `{{...}}` without unwrapping variable chips. */
function cleanPlaceholderMarkup(html: string) {
  return html.replace(/\{\{([^{}]*)\}\}/g, (_match, inner: string) => `{{${inner.replace(/<[^>]+>/g, '').trim()}}}`);
}

export type MergeOptions = TemplateSyntaxOptions & Pick<MergeContextOptions, 'missing'>;

/**
 * Merges data into template HTML. Values are HTML-escaped by Handlebars; the merged output is
 * sanitized again so a value cannot smuggle a javascript: URL into an attribute like `href`.
 * With `allowPageTokens`, `{{page.number}}` / `{{page.total}}` are left in place for the PDF stage.
 */
export function mergeTemplate(html: string, source: MergeSource, options: MergeOptions = {}) {
  const normalized = normalizeTemplatePlaceholders(html);
  extractTemplateVariables(normalized, options);
  const render = handlebars.compile(normalized, { knownHelpersOnly: true, strict: false });
  return sanitizeTemplateHtml(
    render(buildMergeContext(source, { missing: options.missing, keepPageTokens: options.allowPageTokens }))
  );
}

/** Body of a legacy full print shell, or the HTML unchanged when it is already body-only. */
export function extractBody(html: string) {
  const match = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!match) return html.trim();
  const body = match[1].trim();
  const wrapped = /^<div class="document-content">([\s\S]*)<\/div>$/.exec(body);
  return (wrapped ? wrapped[1] : body).trim();
}

/** True when `html` is a full print shell (documents created before body-only storage). */
export function isPrintShell(html: string) {
  return /^\s*<!doctype html>/i.test(html) || /<body[^>]*>/i.test(html);
}

function escapeText(value: string) {
  return handlebars.Utils.escapeExpression(value);
}

/** Shell-only rules; body typography comes from the shared DOCUMENT_CONTENT_CSS. Margins come from page.pdf(). */
const PRINT_CSS = `
  @page { size: A4; }
  html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${DOCUMENT_CONTENT_CSS}`;

/** Wraps merged body HTML in the fixed print shell. The result is what is snapshotted and rendered to PDF. */
export function wrapPrintDocument(bodyHtml: string, title: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeText(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<div class="document-content">
${bodyHtml}
</div>
</body>
</html>`;
}

/** Merged, print-ready HTML for a template and data source (used for previews and snapshots). */
export function renderDocumentHtml(templateHtml: string, title: string, source: MergeSource) {
  return wrapPrintDocument(mergeTemplate(templateHtml, source), title);
}
