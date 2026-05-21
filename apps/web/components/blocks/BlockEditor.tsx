'use client'

import { useState } from 'react'
import type { BlocksBlock, BlockType } from '../../lib/blocks'
import type { AnyBlockConfig } from '@kantorcore/db'
import { RichEditor } from '../editor'
import type { JSONContent } from '@tiptap/react'

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: 'Teks',
  heading: 'Judul',
  image: 'Gambar',
  cta_button: 'Tombol CTA',
  divider: 'Pemisah',
  articles_list: 'Daftar Artikel',
  tickets_list: 'Daftar Tiket',
  gift_cards_grid: 'Gift Card',
  field: 'Field Data',
  custom_html: 'HTML Kustom',
}

const DEFAULT_CONFIGS: Record<BlockType, AnyBlockConfig> = {
  text: { content: '', bodyJson: undefined },
  heading: { text: 'Judul Baru', level: 2 },
  image: { url: '', alt: '' },
  cta_button: { label: 'Klik di sini', href: '#', style: 'primary' },
  divider: { style: 'solid', margin: 16 },
  articles_list: { limit: 5, showExcerpt: true },
  tickets_list: { limit: 5 },
  gift_cards_grid: { limit: 6 },
  field: { entity: 'contact', field: 'name', label: 'Nama' },
  custom_html: { html: '' },
}

// ── Config forms per block type ───────────────────────────────────────────────

function TextConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>Konten</label>
      <RichEditor
        value={config.content as string}
        valueJson={config.bodyJson as JSONContent | undefined}
        onChange={(text, json) => onChange({ ...config, content: text, bodyJson: json })}
        placeholder="Tulis teks blok…"
        minHeight={160}
      />
    </div>
  )
}

function HeadingConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Teks Judul</label>
        <input
          value={config.text as string}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          style={inputStyle}
          placeholder="Teks judul"
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Level</label>
          <select value={config.level as number} onChange={(e) => onChange({ ...config, level: Number(e.target.value) })} style={inputStyle}>
            <option value={1}>H1 — Besar</option>
            <option value={2}>H2 — Sedang</option>
            <option value={3}>H3 — Kecil</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Rata</label>
          <select value={config.align as string ?? 'left'} onChange={(e) => onChange({ ...config, align: e.target.value })} style={inputStyle}>
            <option value="left">Kiri</option>
            <option value="center">Tengah</option>
            <option value="right">Kanan</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function ImageConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>URL Gambar</label>
        <input value={config.url as string} onChange={(e) => onChange({ ...config, url: e.target.value })} style={inputStyle} placeholder="https://…" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Teks Alt</label>
        <input value={config.alt as string ?? ''} onChange={(e) => onChange({ ...config, alt: e.target.value })} style={inputStyle} placeholder="Deskripsi gambar" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Keterangan (opsional)</label>
        <input value={config.caption as string ?? ''} onChange={(e) => onChange({ ...config, caption: e.target.value })} style={inputStyle} placeholder="Caption gambar" />
      </div>
    </div>
  )
}

function CtaButtonConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Label Tombol</label>
        <input value={config.label as string} onChange={(e) => onChange({ ...config, label: e.target.value })} style={inputStyle} placeholder="Teks tombol" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>URL Tujuan</label>
        <input value={config.href as string} onChange={(e) => onChange({ ...config, href: e.target.value })} style={inputStyle} placeholder="/portal/orders" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Gaya</label>
          <select value={config.style as string ?? 'primary'} onChange={(e) => onChange({ ...config, style: e.target.value })} style={inputStyle}>
            <option value="primary">Primer (solid)</option>
            <option value="secondary">Sekunder (outline)</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Rata</label>
          <select value={config.align as string ?? 'left'} onChange={(e) => onChange({ ...config, align: e.target.value })} style={inputStyle}>
            <option value="left">Kiri</option>
            <option value="center">Tengah</option>
            <option value="right">Kanan</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function ArticlesListConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Maks. artikel</label>
        <input type="number" min={1} max={20} value={config.limit as number ?? 5} onChange={(e) => onChange({ ...config, limit: Number(e.target.value) })} style={inputStyle} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!config.showExcerpt} onChange={(e) => onChange({ ...config, showExcerpt: e.target.checked })} style={{ accentColor: 'var(--indigo)' }} />
        Tampilkan ringkasan artikel
      </label>
    </div>
  )
}

function FieldConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Entitas</label>
          <select value={config.entity as string} onChange={(e) => onChange({ ...config, entity: e.target.value })} style={inputStyle}>
            <option value="contact">Kontak (pelanggan)</option>
            <option value="tenant">Tenant</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Field</label>
          <input value={config.field as string} onChange={(e) => onChange({ ...config, field: e.target.value })} style={inputStyle} placeholder="name, phone, email…" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Label (opsional)</label>
          <input value={config.label as string ?? ''} onChange={(e) => onChange({ ...config, label: e.target.value })} style={inputStyle} placeholder="Nama Lengkap" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Format</label>
          <select value={config.format as string ?? 'text'} onChange={(e) => onChange({ ...config, format: e.target.value })} style={inputStyle}>
            <option value="text">Teks</option>
            <option value="date">Tanggal</option>
            <option value="currency">Mata uang</option>
            <option value="badge">Badge</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function CustomHtmlConfigForm({ config, onChange }: { config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>HTML Kustom</label>
      <textarea
        value={config.html as string ?? ''}
        onChange={(e) => onChange({ ...config, html: e.target.value })}
        rows={8}
        style={{ ...inputStyle, height: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, padding: 10, resize: 'vertical' }}
        placeholder="<div>HTML kustom…</div>"
      />
    </div>
  )
}

function BlockConfigForm({ type, config, onChange }: { type: BlockType; config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  switch (type) {
    case 'text': return <TextConfigForm config={config} onChange={onChange} />
    case 'heading': return <HeadingConfigForm config={config} onChange={onChange} />
    case 'image': return <ImageConfigForm config={config} onChange={onChange} />
    case 'cta_button': return <CtaButtonConfigForm config={config} onChange={onChange} />
    case 'articles_list': return <ArticlesListConfigForm config={config} onChange={onChange} />
    case 'field': return <FieldConfigForm config={config} onChange={onChange} />
    case 'custom_html': return <CustomHtmlConfigForm config={config} onChange={onChange} />
    case 'divider':
    case 'tickets_list':
    case 'gift_cards_grid':
      return <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>Blok ini tidak memerlukan konfigurasi tambahan.</div>
    default: return null
  }
}

// ── Block card in editor ────────────────────────────────────────────────────────

type LocalBlock = BlocksBlock & { _draft?: boolean }

function BlockCard({
  block,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onToggleVisible,
}: {
  block: LocalBlock
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleVisible: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
      background: block.visible ? 'var(--surface)' : 'var(--bg)',
      opacity: block.visible ? 1 : 0.6,
    }}>
      <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--fg-3)', minWidth: 18, textAlign: 'center' }}>
        {index + 1}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
          {BLOCK_TYPE_LABELS[block.type]}
        </div>
        <div style={{ font: '11px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>
          {summarizeConfig(block.type, block.config as Record<string, unknown>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <ToolBtn title="Pindah ke atas" disabled={index === 0} onClick={onMoveUp}>↑</ToolBtn>
        <ToolBtn title="Pindah ke bawah" disabled={index === total - 1} onClick={onMoveDown}>↓</ToolBtn>
        <ToolBtn title={block.visible ? 'Sembunyikan' : 'Tampilkan'} onClick={onToggleVisible}>
          {block.visible ? '👁' : '🙈'}
        </ToolBtn>
        <ToolBtn title="Edit blok" onClick={onEdit}>✏️</ToolBtn>
        <ToolBtn title="Hapus blok" onClick={onDelete} danger>✕</ToolBtn>
      </div>
    </div>
  )
}

function ToolBtn({ title, onClick, disabled, danger, children }: {
  title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        font: '12px/1 var(--font-sans)', color: danger ? 'var(--danger)' : 'var(--fg-2)',
        opacity: disabled ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function summarizeConfig(type: BlockType, cfg: Record<string, unknown>): string {
  switch (type) {
    case 'text': return (cfg.content as string ?? '').slice(0, 60) || '(kosong)'
    case 'heading': return `H${cfg.level} — ${cfg.text ?? ''}`
    case 'image': return (cfg.url as string ?? '').slice(0, 60) || '(belum ada URL)'
    case 'cta_button': return `"${cfg.label ?? ''}" → ${cfg.href ?? ''}`
    case 'articles_list': return `Maks. ${cfg.limit ?? 5} artikel`
    case 'field': return `${cfg.entity}.${cfg.field}`
    case 'custom_html': return (cfg.html as string ?? '').slice(0, 60) || '(kosong)'
    default: return ''
  }
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  block,
  onSave,
  onClose,
}: {
  block: LocalBlock
  onSave: (config: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [config, setConfig] = useState<Record<string, unknown>>(block.config as Record<string, unknown>)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto', padding: 'var(--s-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
          <span style={{ font: '600 16px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
            Edit Blok: {BLOCK_TYPE_LABELS[block.type]}
          </span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', font: '16px/1 var(--font-sans)', color: 'var(--fg-3)' }}>✕</button>
        </div>
        <BlockConfigForm type={block.type} config={config} onChange={setConfig} />
        <div style={{ display: 'flex', gap: 'var(--s-3)', marginTop: 'var(--s-4)' }}>
          <button
            type="button"
            onClick={() => onSave(config)}
            style={{ height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: 'pointer' }}
          >
            Simpan
          </button>
          <button type="button" onClick={onClose} style={{ height: 36, padding: '0 var(--s-4)', background: 'transparent', color: 'var(--fg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', font: '13px/1 var(--font-sans)', cursor: 'pointer' }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main BlockEditor ──────────────────────────────────────────────────────────

export type BlockEditorProps = {
  layoutId: string
  initialBlocks: BlocksBlock[]
  onSave: (blocks: Array<{ id?: string; type: BlockType; position: number; config: Record<string, unknown>; visible: boolean }>) => Promise<void>
}

export function BlockEditor({ layoutId, initialBlocks, onSave }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<LocalBlock[]>(initialBlocks)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingType, setAddingType] = useState<BlockType | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editingBlock = editingId ? blocks.find((b) => b.id === editingId) : null

  function moveBlock(index: number, dir: -1 | 1) {
    const next = [...blocks]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    setBlocks(next.map((b, i) => ({ ...b, position: i })))
  }

  function addBlock(type: BlockType) {
    const newBlock: LocalBlock = {
      id: `draft-${Date.now()}`,
      tenantId: '',
      layoutId,
      type,
      position: blocks.length,
      config: DEFAULT_CONFIGS[type] as Record<string, unknown>,
      visible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _draft: true,
    }
    setBlocks((prev) => [...prev, newBlock])
    setEditingId(newBlock.id)
    setAddingType(null)
  }

  function updateBlockConfig(id: string, config: Record<string, unknown>) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, config } : b))
    setEditingId(null)
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, position: i })))
  }

  function toggleVisible(id: string) {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, visible: !b.visible } : b))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      await onSave(blocks.map((b, i) => ({
        id: b._draft ? undefined : b.id,
        type: b.type,
        position: i,
        config: b.config as Record<string, unknown>,
        visible: b.visible,
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      {blocks.map((block, i) => (
        <BlockCard
          key={block.id}
          block={block}
          index={i}
          total={blocks.length}
          onMoveUp={() => moveBlock(i, -1)}
          onMoveDown={() => moveBlock(i, 1)}
          onEdit={() => setEditingId(block.id)}
          onDelete={() => deleteBlock(block.id)}
          onToggleVisible={() => toggleVisible(block.id)}
        />
      ))}

      {!addingType ? (
        <button
          type="button"
          onClick={() => setAddingType('text')}
          style={{
            height: 36, border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)',
            background: 'transparent', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
          }}
        >
          + Tambah blok
        </button>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 'var(--s-4)' }}>
          <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 10 }}>Pilih jenis blok:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                style={{
                  height: 30, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                  background: 'var(--surface)', color: 'var(--fg-1)', font: '13px/1 var(--font-sans)', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setAddingType(null)} style={{ height: 30, padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--fg-3)', font: '13px/1 var(--font-sans)', cursor: 'pointer' }}>Batal</button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 'var(--s-3)', background: 'var(--red-light)', border: '1px solid var(--danger)', borderRadius: 'var(--r-sm)', font: '13px/1.4 var(--font-sans)', color: 'var(--danger)' }}>{error}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--s-2)' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ height: 36, padding: '0 var(--s-5)', background: 'var(--indigo)', color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Menyimpan…' : 'Simpan Layout'}
        </button>
      </div>

      {editingBlock && (
        <EditModal
          block={editingBlock}
          onSave={(config) => updateBlockConfig(editingBlock.id, config)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }
const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  font: '13px/1 var(--font-sans)', color: 'var(--fg-1)', background: 'var(--surface)', width: '100%',
}
