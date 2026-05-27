'use client'

import Link from 'next/link'
import type { ContactRow } from '../../lib/contacts'
import type { ContactRole } from '@kantorcore/db'

const ROLE_COLOR: Record<ContactRole, string> = {
  staff: 'var(--indigo)', customer: 'var(--teal)', vendor: 'var(--amber)', lead: '#7B5AD8', other: 'var(--fg-3)',
}

interface MapContact extends ContactRow {
  formattedAddress: string
  coords: null
}

function pinColor(type: string) {
  return type === 'company' ? 'var(--indigo)' : 'var(--teal)'
}

export default function ContactMapView({ contacts }: { contacts: MapContact[] }) {
  const withAddress = contacts.filter((c) => c.formattedAddress)
  const noAddress = contacts.filter((c) => !c.formattedAddress)

  return (
    <div>
      {/* Stub map canvas */}
      <div style={{ position: 'relative', width: '100%', height: 360, background: 'linear-gradient(135deg, #e8f0e8 0%, #d4e4d4 50%, #c8dcc8 100%)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 'var(--s-4)' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="1.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>Peta Kontak</div>
          <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center', maxWidth: 280 }}>
            Integrasi geocoding akan ditambahkan pada sprint berikutnya.<br />Menampilkan daftar alamat di bawah.
          </div>
        </div>

        {/* Fake pins scattered on the stub map */}
        {withAddress.slice(0, 12).map((c, i) => {
          const x = 10 + (i * 73) % 80
          const y = 10 + (i * 41 + 17) % 70
          return (
            <div
              key={c.contact.id}
              style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}
              title={c.contact.name}
            >
              <svg width="20" height="28" viewBox="0 0 20 28">
                <path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 18 10 18S20 17.5 20 10C20 4.5 15.5 0 10 0z" fill={pinColor(c.contact.type)} opacity="0.85"/>
                <circle cx="10" cy="10" r="4" fill="white" opacity="0.9"/>
              </svg>
            </div>
          )
        })}
      </div>

      {/* Address cards grid */}
      {withAddress.length > 0 && (
        <>
          <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {withAddress.length} kontak dengan alamat
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 'var(--s-4)' }}>
            {withAddress.map((c) => (
              <Link
                key={c.contact.id}
                href={`/contacts/${c.contact.id}`}
                style={{ display: 'block', textDecoration: 'none', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', borderLeft: `3px solid ${pinColor(c.contact.type)}` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <svg width="12" height="16" viewBox="0 0 20 28">
                    <path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 18 10 18S20 17.5 20 10C20 4.5 15.5 0 10 0z" fill={pinColor(c.contact.type)}/>
                    <circle cx="10" cy="10" r="4" fill="white"/>
                  </svg>
                  <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{c.contact.name}</div>
                </div>
                <div style={{ font: '11px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>{c.formattedAddress}</div>
                {c.roles.map((r) => (
                  <span key={r} style={{ display: 'inline-block', marginTop: 6, marginRight: 4, font: '600 9px/1 var(--font-sans)', color: ROLE_COLOR[r], border: `1px solid ${ROLE_COLOR[r]}`, padding: '2px 5px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {r}
                  </span>
                ))}
              </Link>
            ))}
          </div>
        </>
      )}

      {noAddress.length > 0 && (
        <div style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
          {noAddress.length} kontak tanpa alamat tidak ditampilkan di peta.
        </div>
      )}
    </div>
  )
}
