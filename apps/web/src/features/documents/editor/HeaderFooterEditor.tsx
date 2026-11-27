import type { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AlignCenter, AlignLeft, AlignRight, Bold, Hash, ImagePlus, Italic, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { HEADER_IMAGE_MAX_BYTES, dataUrlBytes } from './headerFooter';
import { IconButton, ToolbarDivider } from './ui';
import { type VariableDisplayStore, VariableNode, chipifyPlaceholders } from './variableNode';

export interface BandAnchor {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * In-place header/footer editor shown over the double-clicked band (Google Docs style). Edits apply to the
 * band on every page.
 */
export function HeaderFooterEditor({
  kind,
  initialHtml,
  anchor,
  store,
  onChange,
  onClose,
  onEditorReady
}: {
  kind: 'header' | 'footer';
  initialHtml: string;
  anchor: BandAnchor;
  store: VariableDisplayStore;
  onChange: (html: string) => void;
  onClose: () => void;
  onEditorReady: (editor: Editor | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        link: { openOnClick: false }
      }),
      TextAlign.configure({ types: ['paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      VariableNode.configure({ store })
    ],
    content: chipifyPlaceholders(initialHtml),
    autofocus: 'end',
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML())
  });

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (rootRef.current?.contains(target)) return;
      // Side panel / toolbar clicks should not end header editing (they may insert into it).
      if (target.closest('[data-hf-keep-open]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    const id = setTimeout(() => document.addEventListener('mousedown', onPointer));
    return () => {
      clearTimeout(id);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [onClose]);

  function onImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      if (dataUrlBytes(src) > HEADER_IMAGE_MAX_BYTES) {
        toast.error(`Image is too large (max ${Math.round(HEADER_IMAGE_MAX_BYTES / 1000)} KB). Use a smaller logo.`);
        return;
      }
      editor?.chain().focus().setImage({ src, alt: 'Logo' }).run();
    };
    reader.readAsDataURL(file);
  }

  if (!editor) return null;
  const chain = () => editor.chain().focus();
  const label = kind === 'header' ? 'Header' : 'Footer';

  return (
    <div
      ref={rootRef}
      className="absolute z-30"
      style={{ top: anchor.top, left: anchor.left, width: anchor.width, minHeight: anchor.height }}
    >
      <div
        className={`absolute left-0 flex items-center gap-0.5 rounded-lg border border-[#dadce0] bg-white px-1 py-0.5 shadow-md ${
          kind === 'header' ? 'top-full mt-1' : 'bottom-full mb-1'
        }`}
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        <span className="px-2 text-xs font-medium text-[#5f6368]">{label}</span>
        <ToolbarDivider />
        <IconButton label="Bold" onClick={() => chain().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </IconButton>
        <IconButton label="Italic" onClick={() => chain().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </IconButton>
        <IconButton label="Align left" onClick={() => chain().setTextAlign('left').run()}>
          <AlignLeft className="h-4 w-4" />
        </IconButton>
        <IconButton label="Align center" onClick={() => chain().setTextAlign('center').run()}>
          <AlignCenter className="h-4 w-4" />
        </IconButton>
        <IconButton label="Align right" onClick={() => chain().setTextAlign('right').run()}>
          <AlignRight className="h-4 w-4" />
        </IconButton>
        <ToolbarDivider />
        <IconButton label="Insert page number" onClick={() => chain().insertContent({ type: 'variable', attrs: { key: 'page.number' } }).run()}>
          <Hash className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="Insert total pages"
          onClick={() => chain().insertContent({ type: 'variable', attrs: { key: 'page.total' } }).run()}
          className="px-2 text-xs font-medium"
        >
          of N
        </IconButton>
        <IconButton label="Insert image (logo)" onClick={() => fileInput.current?.click()}>
          <ImagePlus className="h-4 w-4" />
        </IconButton>
        <ToolbarDivider />
        <IconButton label={`Close ${label.toLowerCase()} (Esc)`} onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          aria-label="Upload image"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImage(file);
            event.target.value = '';
          }}
        />
      </div>
      <div
        className="kd-hf-editor rounded-sm bg-white outline outline-1 outline-[#1a73e8]"
        style={{ paddingLeft: 0, paddingRight: 0 }}
      >
        <EditorContent editor={editor} aria-label={`${label} content`} />
      </div>
    </div>
  );
}
