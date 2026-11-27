import { InputRule, Node } from '@tiptap/core';

/** Matches `{{client.companyName}}` (whitespace inside the braces tolerated). */
export const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z][\w.]*)\s*\}\}/g;

/** Page tokens are only meaningful in header/footer HTML and are stored as plain text, never as a span. */
export const PAGE_TOKEN_LABELS: Record<string, string> = {
  'page.number': 'Page #',
  'page.total': 'Total pages'
};

export function isPageToken(key: string) {
  return key in PAGE_TOKEN_LABELS;
}

export interface VariableDisplay {
  label: string;
  /** Document mode only. `null` = unresolved (rendered as a warning chip). */
  value?: string | null;
}

/**
 * Tiny observable map the chip node views read from, so resolved values can change (client switched)
 * without touching the document.
 */
export class VariableDisplayStore {
  private entries = new Map<string, VariableDisplay>();
  private listeners = new Set<() => void>();
  mode: 'template' | 'document' = 'template';

  set(entries: Iterable<[string, VariableDisplay]>, mode: 'template' | 'document') {
    this.entries = new Map(entries);
    this.mode = mode;
    this.listeners.forEach((listener) => listener());
  }

  get(key: string) {
    return this.entries.get(key);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export interface ChipView {
  text: string;
  unresolved: boolean;
}

export function chipView(store: VariableDisplayStore | undefined, key: string): ChipView {
  if (isPageToken(key)) return { text: PAGE_TOKEN_LABELS[key], unresolved: false };
  const entry = store?.get(key);
  const label = entry?.label ?? key;
  if (store?.mode === 'document') {
    const value = entry?.value;
    if (value !== undefined && value !== null && value !== '') return { text: value, unresolved: false };
    return { text: label, unresolved: true };
  }
  return { text: label, unresolved: false };
}

/**
 * Converts plain `{{key}}` text (legacy documents, imported templates) into variable spans so Tiptap parses
 * them as chips. Text already inside a `[data-variable]` span is left alone.
 */
export function chipifyPlaceholders(html: string): string {
  if (!html.includes('{{')) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.data.includes('{{') && !text.parentElement?.closest('[data-variable]')) textNodes.push(text);
  }
  for (const text of textNodes) {
    const fragment = doc.createDocumentFragment();
    let last = 0;
    for (const match of text.data.matchAll(PLACEHOLDER_PATTERN)) {
      const index = match.index ?? 0;
      if (index > last) fragment.append(text.data.slice(last, index));
      const span = doc.createElement('span');
      span.setAttribute('data-variable', match[1]);
      span.textContent = `{{${match[1]}}}`;
      fragment.append(span);
      last = index + match[0].length;
    }
    if (last === 0) continue;
    if (last < text.data.length) fragment.append(text.data.slice(last));
    text.replaceWith(fragment);
  }
  return doc.body.innerHTML;
}

export interface VariableNodeOptions {
  store?: VariableDisplayStore;
}

/**
 * Inline atom for a merge placeholder. Serializes to `<span data-variable="key">{{key}}</span>` (page tokens
 * to plain `{{page.number}}` text) per docs/plans/document-editor-contract.md.
 */
export const VariableNode = Node.create<VariableNodeOptions>({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { store: undefined };
  },

  addAttributes() {
    return {
      key: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-variable') ?? '',
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ node }) {
    const key = String(node.attrs.key);
    return ['span', { 'data-variable': key }, `{{${key}}}`];
  },

  renderText({ node }) {
    return `{{${node.attrs.key}}}`;
  },

  addNodeView() {
    const store = this.options.store;
    return ({ node: initialNode }) => {
      let node = initialNode;
      const dom = document.createElement('span');
      dom.contentEditable = 'false';
      const render = () => {
        const key = String(node.attrs.key);
        const view = chipView(store, key);
        dom.className = view.unresolved ? 'kd-variable kd-variable--missing' : 'kd-variable';
        dom.setAttribute('data-variable', key);
        dom.title = view.unresolved ? `${key} — no value yet` : key;
        dom.textContent = view.text;
      };
      render();
      const unsubscribe = store?.subscribe(render);
      return {
        dom,
        update: (updated) => {
          if (updated.type !== node.type) return false;
          node = updated;
          render();
          return true;
        },
        ignoreMutation: () => true,
        destroy: () => unsubscribe?.()
      };
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\{\{([a-zA-Z][\w.]*)\}\}$/,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(range.from, range.to, this.type.create({ key: match[1] }));
        }
      })
    ];
  }
});
