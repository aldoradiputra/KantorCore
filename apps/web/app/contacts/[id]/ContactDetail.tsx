'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ContactWithInheritance, ContactHierarchy } from '../../../lib/contacts'
import type { ContactRole, ContactBankAccount } from '@kantorcore/db'
import ContactHierarchyWidget from './ContactHierarchyWidget'
import SalesPurchaseTab from './SalesPurchaseTab'
import AccountingTab from './AccountingTab'

const ROLE_COLOR: Record<ContactRole, string> = {
  staff: 'var(--indigo)', customer: 'var(--teal)', vendor: 'var(--amber)', lead: '#7B5AD8', other: 'var(--fg-3)',
}
const ROLE_LABEL: Record<ContactRole, string> = {
  staff: 'Karyawan', customer: 'Pelanggan', vendor: 'Vendor', lead: 'Lead', other: 'Lainnya',
}

type Tab = 'overview' | 'sales' | 'accounting'

interface Member { id: string; name: string | null; email: string }

export default function ContactDetail({
  contactData,
  hierarchy,
  banks,
  members,
  canEdit,
}: {
  contactData: ContactWithInheritance
  hierarchy: ContactHierarchy
  banks: ContactBankAccount[]
  members: Member[]
  canEdit: boolean
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const { contact, roles, effectiveFinancials } = contactData
  const isCompany = contact.type === 'company'

  const initials = contact.name.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase()

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      {/* Back navigation */}
      <Link
        href="/contacts"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '500 13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none', marginBottom: 20 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Kontak
      </Link>

      {/* Header card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          {/* Avatar */}
          <div style={{ width: 52, height: 52, borderRadius: isCompany ? 'var(--r-sm)' : '50%', background: isCompany ? 'var(--indigo)' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ font: '700 18px/1 var(--font-sans)', color: 'var(--white)' }}>{initials}</span>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{contact.name}</h1>
              <span style={{ font: '600 10px/1 var(--font-sans)', color: isCompany ? 'var(--indigo)' : 'var(--teal)', border: `1px solid ${isCompany ? 'var(--indigo)' : 'var(--teal)'}`, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isCompany ? 'Perusahaan' : 'Perorangan'}
              </span>
              {roles.map((r) => (
                <span key={r} style={{ font: '600 10px/1 var(--font-sans)', color: ROLE_COLOR[r], border: `1px solid ${ROLE_COLOR[r]}`, padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {ROLE_LABEL[r]}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8 }}>
              {contact.email && (
                <a href={`mailto:${contact.email}`} style={{ font: '13px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-2)', textDecoration: 'none' }}>
                  {contact.phone}
                </a>
              )}
              {contact.website && (
                <a href={contact.website} target="_blank" rel="noopener noreferrer" style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
                  {contact.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {contact.npwp && (
              <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 6 }}>
                NPWP: {contact.npwp}
                {contact.isPkp && <span style={{ marginLeft: 8, font: '600 9px/1 var(--font-sans)', color: 'var(--teal)', border: '1px solid var(--teal)', padding: '2px 5px', borderRadius: 999, textTransform: 'uppercase' }}>PKP</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['overview', 'sales', 'accounting'] as Tab[]).map((t) => {
          const LABELS: Record<Tab, string> = { overview: 'Ikhtisar', sales: 'Penjualan & Pembelian', accounting: 'Akuntansi' }
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ padding: '10px 18px', font: `${active ? '600' : '500'} 13px/1 var(--font-sans)`, color: active ? 'var(--indigo)' : 'var(--fg-3)', background: 'none', border: 'none', borderBottom: active ? '2px solid var(--indigo)' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}
            >
              {LABELS[t]}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          {/* Main info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Address block */}
            {(contact.addrLine1 || contact.addrKota) && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Alamat</div>
                {contact.addrLine1 && <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)' }}>{contact.addrLine1}</div>}
                {contact.addrLine2 && <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-1)' }}>{contact.addrLine2}</div>}
                {(contact.addrRt || contact.addrRw) && (
                  <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {contact.addrRt && `RT ${contact.addrRt}`}{contact.addrRt && contact.addrRw && '/'}{contact.addrRw && `RW ${contact.addrRw}`}
                  </div>
                )}
                {contact.addrKelurahan && <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)' }}>Kel. {contact.addrKelurahan}</div>}
                {contact.addrKecamatan && <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)' }}>Kec. {contact.addrKecamatan}</div>}
                {(contact.addrKota || contact.addrKodePos) && (
                  <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)' }}>
                    {contact.addrKota}{contact.addrKodePos && ` ${contact.addrKodePos}`}
                  </div>
                )}
                {contact.addrProvinsi && <div style={{ font: '12px/1.5 var(--font-sans)', color: 'var(--fg-2)' }}>{contact.addrProvinsi}</div>}
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Catatan</div>
                <div style={{ font: '13px/1.6 var(--font-sans)', color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}>{contact.notes}</div>
              </div>
            )}

            {/* No content placeholder */}
            {!contact.addrLine1 && !contact.addrKota && !contact.notes && (
              <div style={{ padding: '32px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center', font: '13px/1.4 var(--font-sans)', color: 'var(--fg-3)' }}>
                Belum ada informasi tambahan.
                {canEdit && <div style={{ marginTop: 4 }}>Edit kontak untuk menambahkan detail.</div>}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <ContactHierarchyWidget hierarchy={hierarchy} currentId={contact.id} />
        </div>
      )}

      {tab === 'sales' && (
        <SalesPurchaseTab
          contactId={contact.id}
          financials={effectiveFinancials}
          members={members}
          canEdit={canEdit}
        />
      )}

      {tab === 'accounting' && (
        <AccountingTab
          contactId={contact.id}
          banks={banks}
          financials={effectiveFinancials}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
