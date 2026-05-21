import type { Metadata, Viewport } from 'next'
import '@kantorcore/design-tokens/tokens.css'
import './globals.css'
import PwaInit from '../components/PwaInit'

export const metadata: Metadata = {
  title: 'KantorCore — Sistem operasi korporat',
  description: 'The KantorCore product app. Pre-alpha.',
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/brand/kantorcore-favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/kantorcore-mark.svg', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KantorCore',
  },
}

export const viewport: Viewport = {
  themeColor: '#3B4FC4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <PwaInit />
      </body>
    </html>
  )
}
