import { Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { PAGE_CONTENT_PX } from './pageGeometry';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

const relayoutKey = new PluginKey('kdPageBreakRelayout');
const RELAYOUT_META = 'kdPageBreakRelayout';

/**
 * tiptap-pagination-plus has no manual page break, so each break is a spacer whose height is measured to
 * reach the next page boundary (the `.breaker` band the pagination plugin draws). Heights are recomputed
 * after every view update / resize; a no-op transaction is dispatched when they change so pagination can
 * add or drop pages.
 */
function relayout(view: EditorView) {
  const breaks = Array.from(view.dom.querySelectorAll<HTMLElement>('.kd-page-break'));
  if (breaks.length === 0) return false;
  const breakers = Array.from(view.dom.querySelectorAll<HTMLElement>('[data-rm-pagination] .breaker'));
  const previous = breaks.map((element) => element.style.height);
  breaks.forEach((element) => {
    element.style.height = '0px';
  });
  for (const element of breaks) {
    const top = element.getBoundingClientRect().top;
    const rects = breakers.map((breaker) => breaker.getBoundingClientRect());
    // Already at the very top of a page (inside a boundary band): nothing to fill.
    if (rects.some((rect) => top >= rect.top - 0.5 && top < rect.bottom)) continue;
    const next = rects.find((rect) => rect.top > top);
    if (next) {
      element.style.height = `${Math.floor(next.top - top)}px`;
    } else {
      // Last page: fill what is left of it; pagination then adds the following page and we re-measure.
      const lastBottom = rects.length ? rects[rects.length - 1].bottom : view.dom.getBoundingClientRect().top;
      const used = Math.max(0, top - lastBottom);
      element.style.height = `${Math.max(1, Math.floor(PAGE_CONTENT_PX - used))}px`;
    }
  }
  return breaks.some((element, index) => Math.abs(parseFloat(element.style.height || '0') - parseFloat(previous[index] || '0')) > 1);
}

/** Manual page break, stored as `<div data-page-break="true"></div>`. */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },

  renderHTML() {
    return ['div', { 'data-page-break': 'true' }];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).run()
    };
  },

  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.setPageBreak() };
  },

  addNodeView() {
    return () => {
      const dom = document.createElement('div');
      dom.className = 'kd-page-break';
      dom.contentEditable = 'false';
      dom.setAttribute('data-page-break', 'true');
      const label = document.createElement('span');
      label.className = 'kd-page-break__label';
      label.textContent = 'Page break';
      dom.append(label);
      return { dom, ignoreMutation: () => true };
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: relayoutKey,
        view: (view) => {
          let frame = 0;
          const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              if (relayout(view)) view.dispatch(view.state.tr.setMeta(RELAYOUT_META, true).setMeta('addToHistory', false));
            });
          };
          const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
          observer?.observe(view.dom);
          schedule();
          return {
            update: schedule,
            destroy: () => {
              cancelAnimationFrame(frame);
              observer?.disconnect();
            }
          };
        }
      })
    ];
  }
});
