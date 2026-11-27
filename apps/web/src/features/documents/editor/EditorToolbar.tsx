import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  ChevronDown,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Redo2,
  RemoveFormatting,
  SeparatorHorizontal,
  Strikethrough,
  Table2,
  Underline,
  Undo2
} from 'lucide-react';
import { useState } from 'react';
import type { EditorVariable } from './types';
import { IconButton, MenuItem, Popover, ToolbarDivider } from './ui';
import { VariableList } from './VariableList';

type Align = 'left' | 'center' | 'right' | 'justify';
const ALIGNS: { value: Align; label: string; Icon: typeof AlignLeft }[] = [
  { value: 'left', label: 'Align left', Icon: AlignLeft },
  { value: 'center', label: 'Align center', Icon: AlignCenter },
  { value: 'right', label: 'Align right', Icon: AlignRight },
  { value: 'justify', label: 'Justify', Icon: AlignJustify }
];

export function insertVariable(editor: Editor, key: string) {
  editor.chain().focus().insertContent({ type: 'variable', attrs: { key } }).run();
}

/** Prompts for a URL; empty input removes the link. */
export function editLink(editor: Editor) {
  const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
  const input = window.prompt('Link URL', previous || 'https://');
  if (input === null) return;
  const href = input.trim();
  if (!href || href === 'https://') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
}

export function EditorToolbar({
  editor,
  variables,
  mode,
  disabled
}: {
  editor: Editor;
  variables: EditorVariable[];
  mode: 'document' | 'template';
  disabled: boolean;
}) {
  const [menu, setMenu] = useState<'table' | 'variable' | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      block: current.isActive('heading', { level: 1 })
        ? 'h1'
        : current.isActive('heading', { level: 2 })
          ? 'h2'
          : current.isActive('heading', { level: 3 })
            ? 'h3'
            : 'p',
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      align: (ALIGNS.find((align) => current.isActive({ textAlign: align.value }))?.value ?? 'left') as Align,
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      link: current.isActive('link'),
      inTable: current.isActive('table')
    })
  });
  const chain = () => editor.chain().focus();
  const off = disabled;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="mx-3 flex flex-wrap items-center gap-0.5 rounded-full bg-[#edf2fa] px-3 py-1"
    >
      <IconButton label="Undo (Ctrl+Z)" disabled={off || !state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </IconButton>
      <IconButton label="Redo (Ctrl+Shift+Z)" disabled={off || !state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </IconButton>
      <ToolbarDivider />
      <select
        aria-label="Paragraph style"
        title="Paragraph style"
        disabled={off}
        value={state.block}
        onChange={(event) => {
          const value = event.target.value;
          if (value === 'p') chain().setParagraph().run();
          else chain().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
        }}
        className="h-8 rounded bg-transparent px-2 text-sm text-[#1f1f1f] hover:bg-[#e9eef6] focus:outline-none disabled:opacity-40"
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <ToolbarDivider />
      <IconButton label="Bold (Ctrl+B)" active={state.bold} disabled={off} onClick={() => chain().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </IconButton>
      <IconButton label="Italic (Ctrl+I)" active={state.italic} disabled={off} onClick={() => chain().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </IconButton>
      <IconButton
        label="Underline (Ctrl+U)"
        active={state.underline}
        disabled={off}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </IconButton>
      <IconButton label="Strikethrough" active={state.strike} disabled={off} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </IconButton>
      <ToolbarDivider />
      {ALIGNS.map(({ value, label, Icon }) => (
        <IconButton
          key={value}
          label={label}
          active={state.align === value}
          disabled={off}
          onClick={() => chain().setTextAlign(value).run()}
        >
          <Icon className="h-4 w-4" />
        </IconButton>
      ))}
      <ToolbarDivider />
      <IconButton label="Bulleted list" active={state.bullet} disabled={off} onClick={() => chain().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </IconButton>
      <IconButton
        label="Numbered list"
        active={state.ordered}
        disabled={off}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </IconButton>
      <ToolbarDivider />
      <IconButton label={state.link ? 'Edit link' : 'Insert link'} active={state.link} disabled={off} onClick={() => editLink(editor)}>
        <Link2 className="h-4 w-4" />
      </IconButton>
      {state.link ? (
        <IconButton label="Remove link" disabled={off} onClick={() => chain().extendMarkRange('link').unsetLink().run()}>
          <Link2Off className="h-4 w-4" />
        </IconButton>
      ) : null}
      <div className="relative">
        <IconButton
          label="Table"
          active={state.inTable}
          disabled={off}
          aria-haspopup="menu"
          aria-expanded={menu === 'table'}
          onClick={() => setMenu(menu === 'table' ? null : 'table')}
        >
          <Table2 className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </IconButton>
        <Popover open={menu === 'table'} onClose={() => setMenu(null)} className="w-52">
          <div role="menu" aria-label="Table">
            {[
              { label: 'Insert table (3 × 3)', run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), needsTable: false },
              { label: 'Insert row above', run: () => chain().addRowBefore().run(), needsTable: true },
              { label: 'Insert row below', run: () => chain().addRowAfter().run(), needsTable: true },
              { label: 'Insert column left', run: () => chain().addColumnBefore().run(), needsTable: true },
              { label: 'Insert column right', run: () => chain().addColumnAfter().run(), needsTable: true },
              { label: 'Delete row', run: () => chain().deleteRow().run(), needsTable: true },
              { label: 'Delete column', run: () => chain().deleteColumn().run(), needsTable: true },
              { label: 'Toggle header row', run: () => chain().toggleHeaderRow().run(), needsTable: true },
              { label: 'Delete table', run: () => chain().deleteTable().run(), needsTable: true }
            ].map((item) => (
              <MenuItem
                key={item.label}
                disabled={item.needsTable ? !state.inTable : state.inTable}
                onSelect={() => {
                  item.run();
                  setMenu(null);
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </div>
        </Popover>
      </div>
      <IconButton label="Horizontal line" disabled={off} onClick={() => chain().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </IconButton>
      <IconButton label="Page break (Ctrl+Enter)" disabled={off} onClick={() => chain().setPageBreak().run()}>
        <SeparatorHorizontal className="h-4 w-4" />
      </IconButton>
      <ToolbarDivider />
      <div className="relative">
        <IconButton
          label="Insert variable"
          disabled={off}
          aria-haspopup="dialog"
          aria-expanded={menu === 'variable'}
          onClick={() => setMenu(menu === 'variable' ? null : 'variable')}
          className="gap-1 px-2"
        >
          <Braces className="h-4 w-4" />
          <span className="text-sm">Variable</span>
          <ChevronDown className="h-3 w-3" />
        </IconButton>
        <Popover open={menu === 'variable'} onClose={() => setMenu(null)} className="w-72 pt-3">
          <VariableList
            compact
            autoFocus
            mode={mode}
            variables={variables.filter((variable) => variable.group !== 'page')}
            onPick={(key) => {
              insertVariable(editor, key);
              setMenu(null);
            }}
          />
        </Popover>
      </div>
      <IconButton
        label="Clear formatting"
        disabled={off}
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting className="h-4 w-4" />
      </IconButton>
    </div>
  );
}
