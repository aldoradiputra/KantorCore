import type { Metadata } from 'next'
import '@kantr/design-tokens/tokens.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kantr — Sistem operasi korporat',
  description: 'The Kantr product app. Pre-alpha.',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
