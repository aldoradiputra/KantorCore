import type { Metadata } from 'next'
import '@kantorcore/design-tokens/tokens.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dokumentasi — KantorCore',
  description:
    'Dokumentasi KantorCore — panduan, referensi modul, dan API. Sedang disiapkan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
