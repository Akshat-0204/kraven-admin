import sanitizeHtml from 'sanitize-html';

const LENGTH = /^-?\d+(\.\d+)?(px|pt|em|rem|%|mm|cm|in)?$/;
const LENGTHS = /^(-?\d+(\.\d+)?(px|pt|em|rem|%|mm|cm|in)?\s*){1,4}$/;
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;
const BORDER = /^[\w\s#.,%()-]+$/;

/**
 * Allowlist for template HTML: Tiptap output (StarterKit + tables) plus the inline styles
 * documents need, variable chips (`span[data-variable]`), page breaks (`div[data-page-break]`) and
 * inline `data:` images (header logos). Scripts, event handlers, iframes, forms and javascript: URLs are stripped.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img'
  ],
  allowedAttributes: {
    '*': ['style', 'class'],
    a: ['href', 'name', 'target', 'rel'],
    // Editor variable chips and manual page breaks (see docs/plans/document-editor-contract.md).
    span: ['data-variable'],
    div: ['data-page-break'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan', 'colwidth'],
    th: ['colspan', 'rowspan', 'colwidth'],
    col: ['span', 'width'],
    ol: ['start', 'type']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  allowedStyles: {
    '*': {
      color: [COLOR],
      'background-color': [COLOR],
      'text-align': [/^(left|right|center|justify)$/],
      'vertical-align': [/^(top|middle|bottom|baseline)$/],
      'font-weight': [/^(normal|bold|bolder|lighter|\d{3})$/],
      'font-style': [/^(normal|italic)$/],
      'font-size': [LENGTH],
      'line-height': [LENGTH],
      'text-decoration': [/^(none|underline|line-through)$/],
      width: [LENGTH],
      'min-width': [LENGTH],
      'max-width': [LENGTH],
      height: [LENGTH],
      padding: [LENGTHS],
      margin: [LENGTHS],
      border: [BORDER],
      'border-collapse': [/^(collapse|separate)$/],
      'page-break-before': [/^(auto|always|avoid)$/],
      'page-break-after': [/^(auto|always|avoid)$/],
      'page-break-inside': [/^(auto|avoid)$/]
    }
  }
};

export function sanitizeTemplateHtml(html: string) {
  return sanitizeHtml(html, OPTIONS);
}
