'use client'

import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { SlashCommand } from './SlashCommand'
import { useEffect } from 'react'

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const btn = (label: string, action: () => void, active?: boolean, title?: string) => (
    <button
      type="button"
      title={title ?? label}
      onMouseDown={(e) => { e.preventDefault(); action() }}
      style={{
        height: 28, padding: '0 8px', border: 'none', borderRadius: 'var(--r-sm)',
        background: active ? 'var(--indigo-light)' : 'transparent',
        color: active ? 'var(--indigo)' : 'var(--fg-2)',
        font: '600 12px/1 var(--font-mono)', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  const sep = () => (
    <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
      padding: '4px 8px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold')}
      {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic')}
      {btn('S̶', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strikethrough')}
      {btn('`', () => editor.chain().focus().toggleCode().run(), editor.isActive('code'), 'Inline code')}
      {sep()}
      {btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
      {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
      {sep()}
      {btn('• —', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet list')}
      {btn('1. —', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list')}
      {btn('☑', () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList'), 'Checklist')}
      {sep()}
      {btn('"', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Blockquote')}
      {btn('</>', () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), 'Code block')}
      {btn('—', () => editor.chain().focus().setHorizontalRule().run(), false, 'Divider')}
      {sep()}
      {btn('⊞', () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), false, 'Insert table')}
      {editor.isActive('table') && (
        <>
          {btn('+col', () => editor.chain().focus().addColumnAfter().run(), false, 'Add column')}
          {btn('+row', () => editor.chain().focus().addRowAfter().run(), false, 'Add row')}
          {btn('✕tbl', () => editor.chain().focus().deleteTable().run(), false, 'Delete table')}
        </>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export type RichEditorProps = {
  value?: string          // plain text (for backwards compat / initial hydration)
  valueJson?: JSONContent // structured JSON (preferred, takes precedence)
  onChange?: (text: string, json: JSONContent) => void
  placeholder?: string
  minHeight?: number
  readOnly?: boolean
  showToolbar?: boolean
}

export function RichEditor({
  value,
  valueJson,
  onChange,
  placeholder = 'Tulis sesuatu, atau ketik / untuk perintah…',
  minHeight = 240,
  readOnly = false,
  showToolbar = true,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Typography,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      SlashCommand,
    ],
    content: valueJson ?? (value ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] } : undefined),
    editable: !readOnly,
    onUpdate({ editor }) {
      onChange?.(editor.getText(), editor.getJSON())
    },
  })

  // Keep editor in sync if controlled value changes externally
  useEffect(() => {
    if (!editor) return
    const json = valueJson ?? (value ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] } : undefined)
    if (!json) return
    const current = JSON.stringify(editor.getJSON())
    const next = JSON.stringify(json)
    if (current !== next) {
      editor.commands.setContent(json)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueJson, value])

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {showToolbar && !readOnly && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        style={{ minHeight, flex: 1 }}
        className="rich-editor-content"
      />
      <style>{EDITOR_CSS}</style>
    </div>
  )
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────────

const EDITOR_CSS = `
.rich-editor-content .tiptap {
  padding: 12px 16px;
  outline: none;
  font: 14px/1.7 var(--font-sans);
  color: var(--fg-1);
  min-height: inherit;
}
.rich-editor-content .tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--fg-3);
  pointer-events: none;
  height: 0;
}
.rich-editor-content .tiptap h1 { font: 700 26px/1.3 var(--font-sans); margin: 20px 0 8px; color: var(--fg-1); }
.rich-editor-content .tiptap h2 { font: 700 20px/1.3 var(--font-sans); margin: 18px 0 6px; color: var(--fg-1); }
.rich-editor-content .tiptap h3 { font: 600 16px/1.3 var(--font-sans); margin: 16px 0 4px; color: var(--fg-1); }
.rich-editor-content .tiptap ul,
.rich-editor-content .tiptap ol { padding-left: 20px; margin: 6px 0; }
.rich-editor-content .tiptap li { margin: 2px 0; }
.rich-editor-content .tiptap blockquote {
  border-left: 3px solid var(--indigo);
  padding: 4px 0 4px 14px;
  margin: 8px 0;
  color: var(--fg-2);
  font-style: italic;
}
.rich-editor-content .tiptap code {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font: 13px/1 var(--font-mono);
  color: var(--indigo);
}
.rich-editor-content .tiptap pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 12px 16px;
  margin: 8px 0;
  overflow-x: auto;
}
.rich-editor-content .tiptap pre code {
  background: none;
  border: none;
  padding: 0;
  font: 13px/1.5 var(--font-mono);
  color: var(--fg-1);
}
.rich-editor-content .tiptap hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0;
}
.rich-editor-content .tiptap table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font: 13px/1.4 var(--font-sans);
}
.rich-editor-content .tiptap th,
.rich-editor-content .tiptap td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.rich-editor-content .tiptap th {
  background: var(--bg);
  font-weight: 600;
}
.rich-editor-content .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
.rich-editor-content .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
.rich-editor-content .tiptap ul[data-type="taskList"] li input[type="checkbox"] {
  margin-top: 3px; cursor: pointer; accent-color: var(--indigo);
}
.rich-editor-content .tiptap a { color: var(--indigo); text-decoration: underline; }
.rich-editor-content .tiptap img { max-width: 100%; border-radius: var(--r-sm); }
`
