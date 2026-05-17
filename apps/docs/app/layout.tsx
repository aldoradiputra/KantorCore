import type { Metadata } from 'next'
import '@kantr/design-tokens/tokens.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dokumentasi — Kantr',
  description:
    'Dokumentasi Kantr — panduan, referensi modul, dan API. Sedang disiapkan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
