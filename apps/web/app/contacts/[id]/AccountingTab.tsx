'use client'

import { useState } from 'react'
import type { ContactFinancialProfile, ContactBankAccount } from '@kantorcore/db'

const INDONESIAN_BANKS = [
  'BCA (Bank Central Asia)',
  'Bank Mandiri',
  'BRI (Bank Rakyat Indonesia)',
  'BNI (Bank Negara Indonesia)',
  'CIMB Niaga',
  'Bank Permata',
  'Bank Danamon',
  'BTN (Bank Tabungan Negara)',
  'OCBC NISP',
  'Maybank Indonesia',
  'Bank Panin',
  'UOB Indonesia',
  'DBS Indonesia',
  'HSBC Indonesia',
  'Standard Chartered Indonesia',
  'Commonwealth Bank Indonesia',
  'BSI (Bank Syariah Indonesia)',
  'BCA Syariah',
  'Bank Jago',
  'Bank Neo Commerce (BNC)',
  'Allo Bank',
  'Bank Seabank',
  'Bank Raya',
  'Bank Sahabat Sampoerna',
  'Bank Mega',
  'Bank Bukopin',
  'Bank Muamalat',
  'Bank BTPN',
  'Jenius (BTPN)',
  'Bank BII (Maybank)',
  'Citibank Indonesia',
  'Bank of China Indonesia',
  'Bank BJB (Jabar Banten)',
  'Bank DKI',
  'Bank Jatim',
  'Bank Jateng',
  'Bank BPD DIY',
  'Lainnya',
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', font: '13px/1 var(--font-sans)', color: 'var(--fg-1)',
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  outline: 'none', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

interface BankForm {
  bankName: string
  accountNumber: string
  branch: string
}

const emptyForm: BankForm = { bankName: '', accountNumber: '', branch: '' }

export default function AccountingTab({
  contactId,
  banks: initialBanks,
  financials,
  canEdit,
}: {
  contactId: string
  banks: ContactBankAccount[]
  financials: Partial<ContactFinancialProfile> | null
  canEdit: boolean
}) {
  const [banks, setBanks] = useState<ContactBankAccount[]>(initialBanks)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<BankForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const f = financials ?? {}
  const [arAccount, setArAccount] = useState(f.propertyAccountReceivableLabel ?? '')
  const [apAccount, setApAccount] = useState(f.propertyAccountPayableLabel ?? '')
  const [savingAccounts, setSavingAccounts] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState(false)

  async function handleAddBank() {
    if (!form.bankName || !form.accountNumber) return
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { bank: added }: { bank: ContactBankAccount } = await res.json()
        setBanks((prev) => [...prev, added])
        setForm(emptyForm)
        setShowAdd(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteBank(bankId: string) {
    await fetch(`/api/contacts/${contactId}/banks/${bankId}`, { method: 'DELETE' })
    setBanks((prev) => prev.filter((b) => b.id !== bankId))
  }

  async function handleSaveAccounts() {
    setSavingAccounts(true)
    setSavedAccounts(false)
    try {
      await fetch(`/api/contacts/${contactId}/financials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAccountReceivableLabel: arAccount || null,
          propertyAccountPayableLabel: apAccount || null,
        }),
      })
      setSavedAccounts(true)
      setTimeout(() => setSavedAccounts(false), 2500)
    } finally {
      setSavingAccounts(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Bank accounts section */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>Rekening Bank</div>
          {canEdit && (
            <button
              onClick={() => setShowAdd(true)}
              style={{ padding: '5px 12px', font: '500 12px/1 var(--font-sans)', color: 'var(--indigo)', background: 'rgba(59,79,196,0.06)', border: '1px solid var(--indigo)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
            >
              + Tambah Rekening
            </button>
          )}
        </div>

        {banks.length === 0 && !showAdd && (
          <div style={{ padding: '20px', textAlign: 'center', font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)' }}>
            Belum ada rekening bank terdaftar.
          </div>
        )}

        {banks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {banks.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
                <div>
                  <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{b.bankName}</div>
                  <div style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--fg-3)', marginTop: 3 }}>
                    {b.accountNumber}{b.branch ? ` · ${b.branch}` : ''}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteBank(b.id)}
                    style={{ padding: '4px 10px', font: '11px/1 var(--font-sans)', color: 'var(--danger, #C0392B)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}
                  >
                    Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add bank form */}
        {showAdd && (
          <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--indigo)', borderRadius: 'var(--r-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', marginBottom: 2 }}>Rekening Baru</div>

            <div>
              <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>Bank *</div>
              <select value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} style={selectStyle}>
                <option value="">— Pilih bank —</option>
                {INDONESIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>Nomor Rekening *</div>
              <input
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="mis. 1234567890"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>Cabang</div>
              <input
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                placeholder="mis. Jakarta Pusat"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} style={{ padding: '6px 14px', font: '500 12px/1 var(--font-sans)', color: 'var(--fg-2)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer' }}>
                Batal
              </button>
              <button
                onClick={handleAddBank}
                disabled={saving || !form.bankName || !form.accountNumber}
                style={{ padding: '6px 14px', font: '500 12px/1 var(--font-sans)', color: 'var(--white)', background: 'var(--indigo)', border: 'none', borderRadius: 'var(--r-sm)', cursor: saving ? 'default' : 'pointer', opacity: saving || !form.bankName || !form.accountNumber ? 0.6 : 1 }}
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Default accounts section */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 20px' }}>
        <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 14 }}>Akun Default</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>Piutang Usaha (AR)</div>
            <input
              value={arAccount}
              onChange={(e) => setArAccount(e.target.value)}
              placeholder="mis. 113100 - Piutang Usaha"
              disabled={!canEdit}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 4 }}>Utang Usaha (AP)</div>
            <input
              value={apAccount}
              onChange={(e) => setApAccount(e.target.value)}
              placeholder="mis. 211100 - Utang Usaha"
              disabled={!canEdit}
              style={inputStyle}
            />
          </div>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            {savedAccounts && <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--teal)', alignSelf: 'center' }}>Tersimpan ✓</span>}
            <button
              onClick={handleSaveAccounts}
              disabled={savingAccounts}
              style={{ padding: '8px 18px', font: '500 13px/1 var(--font-sans)', color: 'var(--white)', background: 'var(--indigo)', border: 'none', borderRadius: 'var(--r-sm)', cursor: savingAccounts ? 'default' : 'pointer', opacity: savingAccounts ? 0.7 : 1 }}
            >
              {savingAccounts ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
