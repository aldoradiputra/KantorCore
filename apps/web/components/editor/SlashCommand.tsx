'use client'

import { Extension, ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import type { Editor } from '@tiptap/react'

// ─── Command definitions ─────────────────────────────────────────────────────

export type SlashItem = {
  title: string
  description: string
  icon: string
  command: (editor: Editor) => void
}

function getItems(query: string): SlashItem[] {
  const all: SlashItem[] = [
    {
      title: 'Teks',
      description: 'Paragraf biasa',
      icon: '¶',
      command: (e) => e.chain().focus().setParagraph().run(),
    },
    {
      title: 'Judul 1',
      description: 'Heading besar',
      icon: 'H1',
      command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Judul 2',
      description: 'Heading sedang',
      icon: 'H2',
      command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Judul 3',
      description: 'Heading kecil',
      icon: 'H3',
      command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'Daftar Bullet',
      description: 'Daftar tidak berurutan',
      icon: '•',
      command: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Daftar Nomor',
      description: 'Daftar berurutan',
      icon: '1.',
      command: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Checklist',
      description: 'Daftar dengan centang',
      icon: '☑',
      command: (e) => e.chain().focus().toggleTaskList().run(),
    },
    {
      title: 'Kutipan',
      description: 'Blockquote',
      icon: '"',
      command: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Kode',
      description: 'Blok kode monospace',
      icon: '</>',
      command: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Pemisah',
      description: 'Garis horizontal',
      icon: '—',
      command: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    {
      title: 'Tabel',
      description: 'Sisipkan tabel',
      icon: '⊞',
      command: (e) =>
        e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ]
  const q = query.toLowerCase()
  return q ? all.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) : all
}

// ─── Dropdown UI ─────────────────────────────────────────────────────────────

type SlashListRef = {
  onKeyDown: (payload: SuggestionKeyDownProps) => boolean
}

const SlashList = forwardRef<SlashListRef, SuggestionProps<SlashItem>>(
  (props, ref) => {
    const { items, command } = props
    const [selected, setSelected] = useState(0)

    useEffect(() => setSelected(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === 'ArrowUp') {
          setSelected((s) => (s - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          const item = items[selected]
          if (item) command(item)
          return true
        }
        return false
      },
    }))

    if (!items.length) return null

    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: 4,
        minWidth: 240,
        maxHeight: 320,
        overflowY: 'auto',
        zIndex: 9999,
      }}>
        {items.map((item, i) => (
          <button
            key={item.title}
            onMouseDown={(e) => { e.preventDefault(); command(item) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '6px 10px',
              border: 'none',
              background: i === selected ? 'var(--indigo-light)' : 'transparent',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              font: '600 11px/1 var(--font-mono)', color: 'var(--fg-2)', flexShrink: 0,
            }}>
              {item.icon}
            </span>
            <div>
              <div style={{ font: '500 13px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>{item.title}</div>
              <div style={{ font: '11px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    )
  }
)
SlashList.displayName = 'SlashList'

// ─── TipTap Extension ─────────────────────────────────────────────────────────

const suggestion: Omit<SuggestionOptions<SlashItem>, 'editor'> = {
  char: '/',
  command: ({ editor, range, props }) => {
    editor.chain().focus().deleteRange(range).run()
    props.command(editor)
  },
  items: ({ query }) => getItems(query),
  render: () => {
    let component: ReactRenderer<SlashListRef, SuggestionProps<SlashItem>>
    let popup: HTMLDivElement | null = null

    return {
      onStart(props) {
        component = new ReactRenderer(SlashList, { props, editor: props.editor })
        popup = document.createElement('div')
        popup.style.cssText = 'position:absolute;z-index:9999'
        document.body.appendChild(popup)
        popup.appendChild(component.element)
        positionPopup(props, popup)
      },
      onUpdate(props) {
        component.updateProps(props)
        if (popup) positionPopup(props, popup)
      },
      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          if (popup) { popup.remove(); popup = null }
          component.destroy()
          return true
        }
        return component.ref?.onKeyDown(props) ?? false
      },
      onExit() {
        if (popup) { popup.remove(); popup = null }
        component.destroy()
      },
    }
  },
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion({ editor: this.editor, ...suggestion }),
    ]
  },
})

function positionPopup(props: SuggestionProps<SlashItem>, popup: HTMLDivElement) {
  const rect = props.clientRect?.()
  if (!rect) return
  popup.style.top = `${rect.bottom + window.scrollY + 4}px`
  popup.style.left = `${rect.left + window.scrollX}px`
}
