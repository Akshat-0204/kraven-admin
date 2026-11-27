import { type VariableDisplayStore, chipView, chipifyPlaceholders } from './variableNode';

/** Max decoded size for an inline (data: URL) header/footer image such as a logo. */
export const HEADER_IMAGE_MAX_BYTES = 200_000;

/**
 * Turns stored header/footer HTML into what tiptap-pagination-plus paints on every page: variable spans become
 * their display text, `{{page.number}}` the plugin's page counter and `{{page.total}}` a span whose content
 * comes from the `--kd-page-total` CSS variable kept up to date by the editor.
 */
export function headerFooterDisplayHtml(html: string, kind: 'header' | 'footer', store?: VariableDisplayStore) {
  if (!html.trim()) return '';
  const doc = new DOMParser().parseFromString(`<body>${chipifyPlaceholders(html)}</body>`, 'text/html');
  doc.body.querySelectorAll<HTMLElement>('[data-variable]').forEach((element) => {
    const key = element.getAttribute('data-variable') ?? '';
    const replacement = doc.createElement('span');
    if (key === 'page.number') {
      // Header bands sit above page N's body but are drawn in page N-1's boundary, hence the "plus" counter.
      replacement.className = kind === 'header' ? 'rm-page-number-plus' : 'rm-page-number';
    } else if (key === 'page.total') {
      replacement.className = 'kd-page-total';
    } else {
      const view = chipView(store, key);
      replacement.className = view.unresolved ? 'kd-variable kd-variable--missing' : 'kd-variable';
      replacement.textContent = view.text;
    }
    element.replaceWith(replacement);
  });
  return `<div class="kd-band kd-band--${kind}">${doc.body.innerHTML}</div>`;
}

/** Bytes encoded by a base64 data URL (approximate, ignores padding). */
export function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}
