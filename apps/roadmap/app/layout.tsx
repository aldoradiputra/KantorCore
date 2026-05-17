import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Indonesia System — Roadmap',
  description: 'Public product roadmap for Indonesia System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
