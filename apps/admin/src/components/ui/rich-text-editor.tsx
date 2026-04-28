import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconBlockquote,
  IconCode,
  IconArrowBackUp,
  IconArrowForwardUp,
} from '@tabler/icons-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import './rich-text-editor.css';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange?.(html === '<p></p>' ? '' : html);
    },
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalizedCurrent = current === '<p></p>' ? '' : current;
    const normalizedValue = value || '';
    if (normalizedValue !== normalizedCurrent) {
      editor.commands.setContent(normalizedValue || '<p></p>', false);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        'rich-text-editor rounded-md border border-input shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30',
        className,
      )}
    >
      {editor && <MenuBar editor={editor} />}
      <EditorContent editor={editor} className="text-base md:text-sm" />
    </div>
  );
}

interface MenuBarProps {
  editor: NonNullable<ReturnType<typeof useEditor>>;
}

function MenuBar({ editor }: MenuBarProps) {
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor.isActive('bold'),
      italic: ctx.editor.isActive('italic'),
      strike: ctx.editor.isActive('strike'),
      h1: ctx.editor.isActive('heading', { level: 1 }),
      h2: ctx.editor.isActive('heading', { level: 2 }),
      h3: ctx.editor.isActive('heading', { level: 3 }),
      bulletList: ctx.editor.isActive('bulletList'),
      orderedList: ctx.editor.isActive('orderedList'),
      blockquote: ctx.editor.isActive('blockquote'),
      codeBlock: ctx.editor.isActive('codeBlock'),
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  });

  const run = useCallback(
    (cmd: () => boolean) => (pressed: boolean) => {
      void pressed;
      cmd();
    },
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
      <Toggle
        size="sm"
        pressed={state.bold}
        onPressedChange={run(() =>
          editor.chain().focus().toggleBold().run(),
        )}
        aria-label="Bold"
      >
        <IconBold className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.italic}
        onPressedChange={run(() =>
          editor.chain().focus().toggleItalic().run(),
        )}
        aria-label="Italic"
      >
        <IconItalic className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.strike}
        onPressedChange={run(() =>
          editor.chain().focus().toggleStrike().run(),
        )}
        aria-label="Strikethrough"
      >
        <IconStrikethrough className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={state.h1}
        onPressedChange={run(() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
        )}
        aria-label="Heading 1"
      >
        <IconH1 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.h2}
        onPressedChange={run(() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        aria-label="Heading 2"
      >
        <IconH2 className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.h3}
        onPressedChange={run(() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
        aria-label="Heading 3"
      >
        <IconH3 className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={state.bulletList}
        onPressedChange={run(() =>
          editor.chain().focus().toggleBulletList().run(),
        )}
        aria-label="Bullet list"
      >
        <IconList className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.orderedList}
        onPressedChange={run(() =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        aria-label="Ordered list"
      >
        <IconListNumbers className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.blockquote}
        onPressedChange={run(() =>
          editor.chain().focus().toggleBlockquote().run(),
        )}
        aria-label="Blockquote"
      >
        <IconBlockquote className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.codeBlock}
        onPressedChange={run(() =>
          editor.chain().focus().toggleCodeBlock().run(),
        )}
        aria-label="Code block"
      >
        <IconCode className="size-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={false}
        disabled={!state.canUndo}
        onPressedChange={run(() =>
          editor.chain().focus().undo().run(),
        )}
        aria-label="Undo"
      >
        <IconArrowBackUp className="size-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={false}
        disabled={!state.canRedo}
        onPressedChange={run(() =>
          editor.chain().focus().redo().run(),
        )}
        aria-label="Redo"
      >
        <IconArrowForwardUp className="size-4" />
      </Toggle>
    </div>
  );
}
