'use client'

import { useEffect, useRef, useState } from 'react'

export type CopyRecordField = { label: string; value: string | null | undefined }

type Props = {
  fields: CopyRecordField[]
  /** Path or absolute URL of the record. If a path is given, the browser origin is prepended. */
  recordPath?: string
  buttonLabel?: string
}

function compile(fields: CopyRecordField[], recordPath: string | undefined): string {
  const url = recordPath
    ? recordPath.startsWith('http')
      ? recordPath
      : typeof window !== 'undefined'
        ? window.location.origin + recordPath
        : recordPath
    : ''
  const lines = fields
    .filter((f) => f.value != null && String(f.value).trim() !== '')
    .map((f) => `${f.label}: ${f.value}`)
  if (url) lines.push(`Link: ${url}`)
  return lines.join('\n')
}

export function CopyRecordButton({ fields, recordPath, buttonLabel = 'Salin info' }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  function openPopover() {
    setText(compile(fields, recordPath))
    setCopied(false)
    setOpen(true)
  }

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [open])

  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={openPopover}
        style={{
          font: '500 12px/1 var(--font-sans)',
          color: 'var(--fg-2)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-sm, 6px)',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {buttonLabel}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'transparent' }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 51,
              width: 380,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md, 8px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Salin info (bisa diedit)
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              style={{
                width: '100%',
                resize: 'vertical',
                font: '12px/1.5 var(--font-mono, monospace)',
                color: 'var(--fg-1)',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm, 6px)',
                padding: 8,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setText(compile(fields, recordPath))}
                style={{
                  font: '500 12px/1 var(--font-sans)',
                  color: 'var(--fg-3)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 4px',
                }}
              >
                Reset
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    font: '500 12px/1 var(--font-sans)',
                    color: 'var(--fg-2)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm, 6px)',
                    padding: '6px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={doCopy}
                  style={{
                    font: '600 12px/1 var(--font-sans)',
                    color: '#fff',
                    background: copied ? 'var(--teal)' : 'var(--indigo)',
                    border: '1px solid transparent',
                    borderRadius: 'var(--r-sm, 6px)',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    minWidth: 80,
                  }}
                >
                  {copied ? 'Disalin ✓' : 'Salin'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
