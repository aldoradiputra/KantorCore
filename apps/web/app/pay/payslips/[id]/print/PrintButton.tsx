'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 16px',
        background: '#1A2B5A',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        font: '600 13px/1 sans-serif',
      }}
    >
      Cetak / Print
    </button>
  )
}
