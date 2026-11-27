import type { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AlertCircle, ArrowLeft, Check, ChevronRight, CloudUpload, FileText, PanelRightOpen } from 'lucide-react';
import { type MouseEvent as ReactMouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { cn } from '../../../lib/utils';
import { EDITOR_CSS } from './editorStyles';
import { EditorToolbar, insertVariable } from './EditorToolbar';
import { type BandAnchor, HeaderFooterEditor } from './HeaderFooterEditor';
import { headerFooterDisplayHtml } from './headerFooter';
import { PageBreak } from './pageBreak';
import { PAGE_PX } from './pageGeometry';
import { type EditorPatch, type EditorVariable, PAGE_TOKEN_VARIABLES } from './types';
import { IconButton } from './ui';
import { type SaveStatus, useAutosave } from './useAutosave';
import { VariableList } from './VariableList';
import { VariableDisplayStore, VariableNode, chipifyPlaceholders } from './variableNode';

const PAGE_TOKEN_TEXT = /\{\{\s*page\.(?:number|total)\s*\}\}/g;
/** A page-token chip (e.g. typed `{{page.number}}` turned into a chip by the input rule). */
const PAGE_TOKEN_CHIP = /<span\b[^>]*\bdata-variable\s*=\s*["']page\.(?:number|total)["'][^>]*>[\s\S]*?<\/span>/gi;
/**
 * The API rejects page tokens in the body (they only make sense in header/footer). Whole chips are removed:
 * stripping only their `{{…}}` text would leave an empty `data-variable="page.*"` span that fails at send.
 */
export const stripPageTokens = (html: string) => html.replace(PAGE_TOKEN_CHIP, '').replace(PAGE_TOKEN_TEXT, '');

const FONT_LINK_ID = 'kd-editor-font';

export interface EditorActionsApi {
  flush: () => Promise<void>;
  saveNow: (patch: Partial<EditorPatch>) => Promise<void>;
  status: SaveStatus;
}

export interface DocumentEditorProps {
  mode: 'document' | 'template';
  /** Changing it re-creates the editor (different record). */
  docKey: string;
  title: string;
  initialHtml: string;
  initialHeaderHtml: string;
  initialFooterHtml: string;
  readOnly: boolean;
  readOnlyReason?: string;
  variables: EditorVariable[];
  statusLabel: string;
  backTo: string;
  onSave: (patch: Partial<EditorPatch>) => Promise<unknown>;
  renderActions?: (api: EditorActionsApi) => ReactNode;
  details: ReactNode;
}

type PanelTab = 'variables' | 'outline' | 'details';

export function DocumentEditor(props: DocumentEditorProps) {
  const { mode, docKey, readOnly, variables, onSave } = props;
  const store = useMemo(() => new VariableDisplayStore(), []);
  const autosave = useAutosave<EditorPatch>(onSave);
  const { queue, flush } = autosave;
  const [title, setTitle] = useState(props.title);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<PanelTab>('variables');
  const headerHtml = useRef(props.initialHeaderHtml);
  const footerHtml = useRef(props.initialFooterHtml);
  const [hf, setHf] = useState<{ kind: 'header' | 'footer'; anchor: BandAnchor } | null>(null);
  const [hfEditor, setHfEditor] = useState<Editor | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  // Keep chip values in sync before the editor first renders node views.
  useMemo(
    () => store.set(variables.map((variable) => [variable.key, { label: variable.label, value: variable.value }]), mode),
    [store, variables, mode]
  );

  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  const editor = useEditor(
    {
      editable: !readOnly,
      extensions: [
        StarterKit.configure({ link: { openOnClick: false } }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TableKit.configure({ table: { resizable: false } }),
        Image.configure({ allowBase64: true }),
        VariableNode.configure({ store }),
        PageBreak,
        PaginationPlus.configure({
          pageHeight: PAGE_PX.height,
          pageWidth: PAGE_PX.width,
          pageGap: PAGE_PX.gap,
          pageGapBorderSize: 0,
          pageBreakBackground: '#f1f3f4',
          marginTop: PAGE_PX.marginTop,
          marginBottom: PAGE_PX.marginBottom,
          marginLeft: PAGE_PX.marginLeft,
          marginRight: PAGE_PX.marginRight,
          contentMarginTop: 0,
          contentMarginBottom: 0,
          headerLeft: headerFooterDisplayHtml(props.initialHeaderHtml, 'header', store),
          headerRight: '',
          footerLeft: headerFooterDisplayHtml(props.initialFooterHtml, 'footer', store),
          footerRight: ''
        })
      ],
      editorProps: { attributes: { class: 'document-content', 'aria-label': 'Document body' } },
      content: chipifyPlaceholders(props.initialHtml),
      onUpdate: ({ editor: current }) => queue({ html: stripPageTokens(current.getHTML()) }),
      onBlur: () => void flush()
    },
    [docKey]
  );

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const refreshBands = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.updateHeaderContent(headerFooterDisplayHtml(headerHtml.current, 'header', store), '');
    editor.commands.updateFooterContent(headerFooterDisplayHtml(footerHtml.current, 'footer', store), '');
  }, [editor, store]);

  // Variable values changed (client switched / loaded): repaint bands; chips re-render through the store.
  useEffect(() => {
    refreshBands();
  }, [variables, refreshBands]);

  // `{{page.total}}` reads this CSS variable (pagination-plus has no total counter).
  useEffect(() => {
    if (!editor) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pages = editor.view.dom.querySelector('[data-rm-pagination]')?.childElementCount ?? 1;
        canvasRef.current?.style.setProperty('--kd-page-total', `"${Math.max(1, pages)}"`);
      });
    };
    update();
    editor.on('transaction', update);
    return () => {
      cancelAnimationFrame(frame);
      editor.off('transaction', update);
    };
  }, [editor]);

  function onCanvasDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (readOnly || !pagesRef.current) return;
    const target = event.target as HTMLElement;
    const footer = target.closest<HTMLElement>('.rm-page-footer');
    const header = footer ? null : target.closest<HTMLElement>('.rm-page-header, .rm-first-page-header');
    const band = footer ?? header;
    if (!band) return;
    event.preventDefault();
    const inner = band.querySelector<HTMLElement>('.rm-page-header-left, .rm-page-footer-left') ?? band;
    const base = pagesRef.current.getBoundingClientRect();
    const rect = inner.getBoundingClientRect();
    const left = Math.max(rect.left - base.left, PAGE_PX.marginLeft);
    setHf({
      kind: footer ? 'footer' : 'header',
      anchor: {
        top: rect.top - base.top,
        left,
        width: Math.min(rect.width, PAGE_PX.width - PAGE_PX.marginLeft - PAGE_PX.marginRight),
        height: PAGE_PX.headerHeight
      }
    });
  }

  const closeHf = useCallback(() => {
    setHf(null);
    void flush();
  }, [flush]);

  const onHfChange = useCallback(
    (html: string) => {
      if (!hf) return;
      if (hf.kind === 'header') {
        headerHtml.current = html;
        queue({ headerHtml: html });
      } else {
        footerHtml.current = html;
        queue({ footerHtml: html });
      }
      refreshBands();
    },
    [hf, queue, refreshBands]
  );

  const activeEditor = hf && hfEditor ? hfEditor : editor;
  const panelVariables = hf ? [...variables, ...PAGE_TOKEN_VARIABLES] : variables;

  return (
    <div className="kd-root fixed inset-0 z-40 flex flex-col bg-white font-sans text-[#1f1f1f]">
      <style>{EDITOR_CSS}</style>
      <header className="flex items-center gap-3 px-4 pb-1 pt-2" data-hf-keep-open>
        <Link
          to={props.backTo}
          aria-label="Back"
          title="Back"
          onClick={() => void flush()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#444746] hover:bg-[#f1f3f4]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <FileText className="h-7 w-7 shrink-0 text-[#1a73e8]" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-2">
            <input
              aria-label={mode === 'template' ? 'Template name' : 'Document title'}
              value={title}
              readOnly={readOnly}
              placeholder={mode === 'template' ? 'Untitled template' : 'Untitled document'}
              onChange={(event) => {
                setTitle(event.target.value);
                queue({ title: event.target.value });
              }}
              onBlur={() => void flush()}
              className="min-w-0 max-w-md flex-shrink truncate rounded border border-transparent bg-transparent px-1.5 py-0.5 text-lg text-[#1f1f1f] outline-none hover:border-[#dadce0] focus:border-[#1a73e8] read-only:hover:border-transparent"
            />
            <span className="shrink-0 rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-xs font-medium text-[#174ea6]">
              {props.statusLabel}
            </span>
            <SaveIndicator status={autosave.status} error={autosave.error} onRetry={() => void autosave.retry()} readOnly={readOnly} />
          </div>
          {readOnly && props.readOnlyReason ? <p className="px-1.5 text-xs text-[#5f6368]">{props.readOnlyReason}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {props.renderActions?.({ flush, saveNow: autosave.saveNow, status: autosave.status })}
          {!panelOpen ? (
            <IconButton label="Show side panel" onClick={() => setPanelOpen(true)}>
              <PanelRightOpen className="h-5 w-5" />
            </IconButton>
          ) : null}
        </div>
      </header>
      {editor && !readOnly ? (
        <div className="sticky top-0 z-20 pb-2" data-hf-keep-open>
          <EditorToolbar editor={editor} variables={variables} mode={mode} disabled={readOnly || Boolean(hf)} />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 border-t border-[#dadce0]">
        <div
          ref={canvasRef}
          className={cn('kd-canvas min-w-0 flex-1 overflow-auto bg-[#f1f3f4] py-6', readOnly && 'kd-readonly', hf && 'kd-hf-active')}
          onDoubleClick={onCanvasDoubleClick}
        >
          <div ref={pagesRef} className="relative mx-auto" style={{ width: PAGE_PX.width }}>
            <EditorContent editor={editor} />
            {hf ? (
              <HeaderFooterEditor
                key={hf.kind}
                kind={hf.kind}
                initialHtml={hf.kind === 'header' ? headerHtml.current : footerHtml.current}
                anchor={hf.anchor}
                store={store}
                onChange={onHfChange}
                onClose={closeHf}
                onEditorReady={setHfEditor}
              />
            ) : null}
          </div>
          {!readOnly ? (
            <p className="mt-3 text-center text-xs text-[#80868b]">Double-click the top or bottom of a page to edit the header or footer.</p>
          ) : null}
        </div>
        {panelOpen ? (
          <SidePanel
            tab={tab}
            onTab={setTab}
            onClose={() => setPanelOpen(false)}
            mode={mode}
            editor={editor}
            readOnly={readOnly}
            variables={panelVariables}
            onPickVariable={(key) => activeEditor && insertVariable(activeEditor, key)}
            details={props.details}
          />
        ) : null}
      </div>
    </div>
  );
}

function SaveIndicator({
  status,
  error,
  onRetry,
  readOnly
}: {
  status: SaveStatus;
  error: Error | null;
  onRetry: () => void;
  readOnly: boolean;
}) {
  if (readOnly) return <span className="shrink-0 text-xs text-[#5f6368]">Read only</span>;
  if (status === 'error') {
    return (
      <span role="alert" className="flex shrink-0 items-center gap-1 text-xs text-[#b3261e]">
        <AlertCircle className="h-3.5 w-3.5" />
        <span title={error?.message}>Couldn't save</span>
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      </span>
    );
  }
  const label = status === 'saving' || status === 'pending' ? 'Saving…' : status === 'saved' ? 'Saved' : '';
  if (!label) return null;
  return (
    <span aria-live="polite" className="flex shrink-0 items-center gap-1 text-xs text-[#5f6368]">
      {label === 'Saved' ? <Check className="h-3.5 w-3.5" /> : <CloudUpload className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function SidePanel({
  tab,
  onTab,
  onClose,
  mode,
  editor,
  readOnly,
  variables,
  onPickVariable,
  details
}: {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  mode: 'document' | 'template';
  editor: Editor | null;
  readOnly: boolean;
  variables: EditorVariable[];
  onPickVariable: (key: string) => void;
  details: ReactNode;
}) {
  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'variables', label: 'Variables' },
    { id: 'outline', label: 'Outline' },
    { id: 'details', label: 'Details' }
  ];
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-[#dadce0] bg-white" aria-label="Side panel" data-hf-keep-open>
      <div className="flex items-center border-b border-[#dadce0] px-2" role="tablist">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => onTab(entry.id)}
            onMouseDown={(event) => event.preventDefault()}
            className={cn(
              'border-b-2 px-3 py-2.5 text-sm font-medium',
              tab === entry.id ? 'border-[#0b57d0] text-[#0b57d0]' : 'border-transparent text-[#5f6368] hover:text-[#1f1f1f]'
            )}
          >
            {entry.label}
          </button>
        ))}
        <IconButton label="Hide side panel" className="ml-auto" onClick={onClose}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3" role="tabpanel">
        {tab === 'variables' ? (
          readOnly ? (
            <VariableValues variables={variables} mode={mode} />
          ) : (
            <>
              <p className="px-4 pb-2 text-xs text-[#5f6368]">Click a variable to insert it at the cursor.</p>
              <VariableList variables={variables} mode={mode} onPick={onPickVariable} />
            </>
          )
        ) : null}
        {tab === 'outline' ? editor ? <Outline editor={editor} /> : null : null}
        {tab === 'details' ? <div className="space-y-3 px-4 text-sm">{details}</div> : null}
      </div>
    </aside>
  );
}

function VariableValues({ variables, mode }: { variables: EditorVariable[]; mode: 'document' | 'template' }) {
  return (
    <dl className="space-y-2 px-4 text-sm">
      {variables.map((variable) => (
        <div key={variable.key}>
          <dt className="text-xs text-[#5f6368]">{variable.label}</dt>
          <dd className="truncate">{mode === 'document' ? (variable.value ?? '—') : `{{${variable.key}}}`}</dd>
        </div>
      ))}
    </dl>
  );
}

function Outline({ editor }: { editor: Editor }) {
  const headings = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const items: { pos: number; level: number; text: string }[] = [];
      current.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({ pos, level: Number(node.attrs.level) || 1, text: node.textContent });
          return false;
        }
        return true;
      });
      return items;
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b)
  });
  if (!headings.length) {
    return <p className="px-4 text-xs text-[#5f6368]">Headings you add to the document appear here.</p>;
  }
  return (
    <nav aria-label="Outline" className="flex flex-col">
      {headings.map((heading) => (
        <button
          key={heading.pos}
          type="button"
          onClick={() => {
            const dom = editor.view.nodeDOM(heading.pos);
            if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="truncate px-4 py-1.5 text-left text-sm text-[#1f1f1f] hover:bg-[#f1f3f4]"
          style={{ paddingLeft: 16 + (heading.level - 1) * 14 }}
        >
          {heading.text || 'Untitled heading'}
        </button>
      ))}
    </nav>
  );
}
