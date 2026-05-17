import type { Metadata } from 'next'
import '@kantr/design-tokens/tokens.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kantr — Sistem operasi korporat untuk Indonesia',
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
