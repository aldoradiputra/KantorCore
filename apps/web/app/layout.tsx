import type { Metadata } from 'next'
import '@kantorcore/design-tokens/tokens.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'KantorCore — Sistem operasi korporat',
  description: 'The KantorCore product app. Pre-alpha.',
  robots: 'noindex, nofollow',
  icons: {
    icon: [{ url: '/brand/kantorcore-favicon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
