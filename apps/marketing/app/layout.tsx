import type { Metadata } from 'next'
import '@kantorcore/design-tokens/tokens.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'KantorCore — Sistem operasi korporat untuk Indonesia',
  description:
    'Sesederhana Odoo, sekuat SAP. Terintegrasi natif dengan BPJS, DJP CoreTax, QRIS, dan PrivyID.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
