'use client'

import Link from 'next/link'
import type { ContactRow } from '../../lib/contacts'
import type { ContactRole } from '@kantorcore/db'

const ROLE_COLOR: Record<ContactRole, string> = {
  staff: 'var(--indigo)', customer: 'var(--teal)', vendor: 'var(--amber)', lead: '#7B5AD8', other: 'var(--fg-3)',
}
const ROLE_LABEL: Record<ContactRole, string> = {
  staff: 'Karyawan', customer: 'Pelanggan', vendor: 'Vendor', lead: 'Lead', other: 'Lainnya',
}

interface KanbanData {
  companies: ContactRow[]
  byCompany: Record<string, ContactRow[]>
  orphans: ContactRow[]
}

function ContactCard({ row }: { row: ContactRow }) {
  const c = row.contact
  return (
    <Link
      href={`/contacts/${c.id}`}
      style={{ display: 'block', textDecoration: 'none', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 6, transition: 'border-color 0.15s' }}
    >
      <div style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{c.name}</div>
      {c.email && <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{c.email}</div>}
      {c.phone && <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 1 }}>{c.phone}</div>}
      {row.roles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
          {row.roles.map((r) => (
            <span key={r} style={{ font: '600 9px/1 var(--font-sans)', color: ROLE_COLOR[r], border: `1px solid ${ROLE_COLOR[r]}`, padding: '2px 5px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>
      )}
      {c.addressType && (
        <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4, textTransform: 'capitalize' }}>{c.addressType.replace('_', ' ')}</div>
      )}
    </Link>
  )
}

export default function ContactKanbanView({ data }: { data: KanbanData }) {
  const { companies, byCompany, orphans } = data

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 'var(--s-4)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 'max-content' }}>
        {/* Company columns */}
        {companies.map((comp) => {
          const children = byCompany[comp.contact.id] ?? []
          return (
            <div key={comp.contact.id} style={{ width: 240, flexShrink: 0 }}>
              {/* Column header */}
              <Link
                href={`/contacts/${comp.contact.id}`}
                style={{ display: 'block', textDecoration: 'none', marginBottom: 8, padding: '8px 12px', background: 'var(--indigo)', borderRadius: 'var(--r-md)', color: 'var(--white)' }}
              >
                <div style={{ font: '600 12px/1.3 var(--font-sans)' }}>{comp.contact.name}</div>
                <div style={{ font: '11px/1 var(--font-sans)', opacity: 0.75, marginTop: 2 }}>
                  {children.length} kontak
                </div>
              </Link>
              {children.length === 0 ? (
                <div style={{ padding: '20px 12px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center', font: '11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                  Belum ada kontak
                </div>
              ) : (
                children.map((row) => <ContactCard key={row.contact.id} row={row} />)
              )}
            </div>
          )
        })}

        {/* Orphaned individuals */}
        {orphans.length > 0 && (
          <div style={{ width: 240, flexShrink: 0 }}>
            <div style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ font: '600 12px/1.3 var(--font-sans)', color: 'var(--fg-2)' }}>Tanpa Induk</div>
              <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{orphans.length} kontak</div>
            </div>
            {orphans.map((row) => <ContactCard key={row.contact.id} row={row} />)}
          </div>
        )}

        {/* Empty state */}
        {companies.length === 0 && orphans.length === 0 && (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center', font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
            Belum ada kontak.
          </div>
        )}
      </div>
    </div>
  )
}
