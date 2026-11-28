import type { DocumentVariable } from '@kraven/types';
import { TableKit } from '@tiptap/extension-table';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  ChevronDown,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Search,
  Sparkles,
  Table,
  Underline,
  X
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TiptapEditorProps {
  /** Initial HTML. Remount (change `key`) to load different content. */
  initialHtml: string;
  onChange: (html: string) => void;
  variables: DocumentVariable[];
}

const VARIABLE_GROUPS: { key: DocumentVariable['group']; label: string }[] = [
  { key: 'client', label: 'Client' },
  { key: 'project', label: 'Project' },
  { key: 'agency', label: 'Agency' },
  { key: 'general', label: 'General' }
];

/** Rich-text editor styled with claymorphic card canvas, tactile toolbar and variable inserter. */
export function TiptapEditor({ initialHtml, onChange, variables }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, TableKit.configure({ table: { resizable: false } })],
    content: initialHtml,
    onUpdate: ({ editor: current }) => onChange(current.getHTML())
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      underline: current?.isActive('underline') ?? false,
      h1: current?.isActive('heading', { level: 1 }) ?? false,
      h2: current?.isActive('heading', { level: 2 }) ?? false,
      bullet: current?.isActive('bulletList') ?? false,
      ordered: current?.isActive('orderedList') ?? false,
      table: current?.isActive('table') ?? false
    })
  });

  // Custom Variable Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const filteredVariables = variables.filter((v) => {
    const matchesGroup = selectedGroup === 'all' || v.group === selectedGroup;
    const matchesQuery =
      v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesQuery;
  });

  function handleInsertVariable(variableKey: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(`{{${variableKey}}}`).run();
    setIsDropdownOpen(false);
    setSearchQuery('');
  }

  if (!editor) return null;

  return (
    <div className="clay-card p-0 overflow-visible rounded-lg border border-white/80 shadow-[var(--clay-raised)] bg-surface">
      {/* Formatting & Insert Toolbar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(120,110,90,0.14)] bg-surface-soft/90 p-3 sm:px-4 rounded-t-lg">
        {/* Left: Rich Text Formatting Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Inline styles */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              label="Bold (Ctrl+B)"
              active={state?.bold}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Italic (Ctrl+I)"
              active={state?.italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Underline (Ctrl+U)"
              active={state?.underline}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Underline className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="h-5 w-[1px] bg-[rgba(120,110,90,0.18)] mx-1 hidden sm:block" />

          {/* Heading levels */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              label="Heading 1"
              active={state?.h1}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Heading 2"
              active={state?.h2}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="h-5 w-[1px] bg-[rgba(120,110,90,0.18)] mx-1 hidden sm:block" />

          {/* Lists and Table */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              label="Bullet list"
              active={state?.bullet}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              active={state?.ordered}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Insert table (3x2)"
              active={state?.table}
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}
            >
              <Table className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        {/* Right: Custom Claymorphic Inserting Options Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
            className={cn(
              'h-9 px-3.5 rounded-pill inline-flex items-center gap-2 text-xs font-body font-medium transition-all duration-200 cursor-pointer border',
              isDropdownOpen
                ? 'bg-ink-900 text-white shadow-[var(--clay-pressed)] border-ink-900'
                : 'bg-surface text-ink-900 border-white/90 shadow-[var(--clay-raised-sm)] hover:shadow-[var(--clay-hover)] hover:-translate-y-0.5 hover:text-olive-700'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-olive-600" />
            <span>Insert Variable</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', isDropdownOpen && 'rotate-180')}
            />
          </button>

          {/* Clay Dropdown Popover */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg bg-surface p-3 shadow-[var(--clay-floating)] border border-white/90 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header and Search */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-ink-700">
                    Template Variables
                  </span>
                  <span className="text-[11px] font-body text-ink-500">
                    {filteredVariables.length} available
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search variables..."
                    autoFocus
                    className="clay-input h-8 w-full !pl-9 pr-7 text-xs font-body rounded-md bg-surface-soft border border-[rgba(120,110,90,0.18)] focus:outline-none focus:ring-1 focus:ring-olive-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Group Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup('all')}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-pill transition-all',
                      selectedGroup === 'all'
                        ? 'bg-ink-900 text-white shadow-[var(--clay-pressed)]'
                        : 'bg-surface-soft text-ink-700 hover:bg-olive-100 hover:text-olive-800'
                    )}
                  >
                    All
                  </button>
                  {VARIABLE_GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setSelectedGroup(g.key)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-medium rounded-pill transition-all',
                        selectedGroup === g.key
                          ? 'bg-ink-900 text-white shadow-[var(--clay-pressed)]'
                          : 'bg-surface-soft text-ink-700 hover:bg-olive-100 hover:text-olive-800'
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Items List */}
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {filteredVariables.length === 0 ? (
                  <div className="py-6 text-center text-xs font-body text-ink-500">
                    No variables match "{searchQuery}"
                  </div>
                ) : (
                  filteredVariables.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => handleInsertVariable(variable.key)}
                      className="w-full text-left p-2 rounded-md hover:bg-olive-50/80 group transition-all flex items-center justify-between gap-2 border border-transparent hover:border-olive-200/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-body font-medium text-ink-900 group-hover:text-olive-800 truncate">
                          {variable.label}
                        </p>
                        <p className="text-[10px] font-body text-ink-500 capitalize">
                          {variable.group}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-pill bg-sand-200 text-olive-900 border border-[rgba(120,110,90,0.12)] group-hover:bg-olive-100 group-hover:text-olive-950">
                        {`{{${variable.key}}}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Typing Canvas Area */}
      <div className="bg-canvas p-4 sm:p-8 flex justify-center">
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-[var(--clay-raised-sm)] border border-[rgba(120,110,90,0.12)] p-6 sm:p-12 transition-all">
          <EditorContent
            editor={editor}
            className="kraven-editor min-h-[500px] text-base font-body text-ink-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[rgba(120,110,90,0.12)] bg-surface-soft/60 px-6 py-3 rounded-b-lg text-xs font-body text-ink-500">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-olive-500" />
          <span>Rich Text Canvas · Click anywhere to type</span>
        </div>
        <p className="text-[11px] text-ink-500">
          Insert <code className="bg-sand-200 text-olive-900 px-1.5 py-0.5 rounded font-mono">{'{{variable}}'}</code> to dynamically populate client or project details.
        </p>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-sm flex items-center justify-center text-ink-700 bg-surface shadow-[var(--clay-raised-sm)] border border-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:text-olive-700 hover:shadow-[var(--clay-hover)] active:translate-y-0 active:scale-[0.96] active:shadow-[var(--clay-pressed)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--olive-300)]',
        active && 'bg-ink-900 text-white shadow-[var(--clay-pressed)] hover:bg-ink-900 hover:text-white border-ink-900'
      )}
    >
      {children}
    </button>
  );
}
