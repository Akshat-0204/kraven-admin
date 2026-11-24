import type { DocumentVariable } from '@kraven/types';
import { TableKit } from '@tiptap/extension-table';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Table, Underline } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TiptapEditorProps {
  /** Initial HTML. Remount (change `key`) to load different content. */
  initialHtml: string;
  onChange: (html: string) => void;
  variables: DocumentVariable[];
}

const VARIABLE_GROUPS: DocumentVariable['group'][] = ['client', 'project', 'agency', 'general'];

/** Minimal rich-text editor: StarterKit + tables, a formatting toolbar and an "insert variable" menu. */
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
      ordered: current?.isActive('orderedList') ?? false
    })
  });

  if (!editor) return null;

  return (
    <div className="rounded border border-border bg-black">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <ToolbarButton label="Bold" active={state?.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={state?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={state?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-4 w-4" />
        </ToolbarButton>
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
          label="Insert table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}
        >
          <Table className="h-4 w-4" />
        </ToolbarButton>
        <select
          aria-label="Insert variable"
          className="ml-auto h-8 rounded border border-border bg-black px-2 text-xs text-white"
          value=""
          onChange={(event) => {
            if (event.target.value) {
              editor.chain().focus().insertContent(`{{${event.target.value}}}`).run();
            }
          }}
        >
          <option value="">Insert variable...</option>
          {VARIABLE_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {variables
                .filter((variable) => variable.group === group)
                .map((variable) => (
                  <option key={variable.key} value={variable.key}>
                    {variable.label} ({variable.key})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
      <EditorContent editor={editor} className="kraven-editor min-h-[420px] p-4 text-sm" />
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
      className={cn('rounded p-1.5 text-white hover:bg-white/10', active && 'bg-white/20')}
    >
      {children}
    </button>
  );
}
