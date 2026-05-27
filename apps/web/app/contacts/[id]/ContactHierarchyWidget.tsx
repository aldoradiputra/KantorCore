'use client'

import Link from 'next/link'
import type { ContactHierarchy } from '../../../lib/contacts'
import type { Contact, ContactAddressType } from '@kantorcore/db'

const ADDR_TYPE_LABEL: Record<ContactAddressType, string> = {
  main: 'Kontak Utama', invoice: 'Invoice', delivery: 'Pengiriman',
  contact: 'Kontak', other: 'Lain',
}

function ContactChip({ c, active }: { c: Contact; active?: boolean }) {
  return (
    <Link
      href={`/contacts/${c.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: active ? 'rgba(59,79,196,0.06)' : 'var(--bg)',
        border: active ? '1px solid var(--indigo)' : '1px solid var(--border)',
        borderRadius: 'var(--r-sm)', textDecoration: 'none', minWidth: 0,
      }}
    >
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.type === 'company' ? 'var(--indigo)' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--white)' }}>
          {c.name.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: '500 12px/1.3 var(--font-sans)', color: active ? 'var(--indigo)' : 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.name}
        </div>
        {c.addressType && (
          <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
            {ADDR_TYPE_LABEL[c.addressType]}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function ContactHierarchyWidget({
  hierarchy,
  currentId,
}: {
  hierarchy: ContactHierarchy
  currentId: string
}) {
  const { contact, parent, children } = hierarchy

  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Hierarki
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Parent company */}
        {parent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', width: 48, textAlign: 'right', flexShrink: 0 }}>Induk</span>
            <ContactChip c={parent} active={parent.id === currentId} />
          </div>
        )}

        {/* Current contact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: parent ? 54 : 0 }}>
          {parent && <span style={{ width: 1, height: 16, background: 'var(--border)', marginLeft: 23, flexShrink: 0 }} />}
          <ContactChip c={contact} active={contact.id === currentId} />
        </div>

        {/* Children */}
        {children.length > 0 && (
          <div style={{ paddingLeft: 54, display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '1px solid var(--border)', marginLeft: 23 }}>
            {children.filter((ch) => ch.id !== contact.id).map((ch) => (
              <ContactChip key={ch.id} c={ch} active={ch.id === currentId} />
            ))}
          </div>
        )}

        {children.length === 0 && contact.type === 'company' && (
          <div style={{ paddingLeft: 54, font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
            Belum ada kontak terkait.
          </div>
        )}
      </div>
    </div>
  )
}
