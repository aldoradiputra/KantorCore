import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { cookies } from 'next/headers'
import '@kantorcore/design-tokens/tokens.css'
import './globals.css'
import PwaInit from '../components/PwaInit'
import { getCurrentSession } from '../lib/auth'
import { getCurrentTenant } from '../lib/tenants'
import { getUserAppearance } from '../lib/preferences'
import { getTenantBranding } from '../lib/branding'

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

const VALID_ACCENTS = ['indigo', 'teal', 'purple', 'rose', 'amber', 'emerald'] as const

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve theme + accent + brand on the server so we can stamp them on
  // <html> before React hydrates — no flash of unthemed content.
  const session = await getCurrentSession().catch(() => null)
  const cookieStore = await cookies()

  let themeMode: 'light' | 'dark' = 'light'
  let accent: typeof VALID_ACCENTS[number] = 'indigo'
  let brandColor: string | null = null

  if (session) {
    const appearance = await getUserAppearance(session.user.id).catch(() => null)
    if (appearance) {
      themeMode = appearance.themeMode
      accent    = appearance.accentColor
    }
    const tenantCtx = await getCurrentTenant(session.user.id).catch(() => null)
    if (tenantCtx) {
      const branding = await getTenantBranding(tenantCtx.tenant.id).catch(() => null)
      brandColor = branding?.brandColor ?? null
    }
  } else {
    // Unauthed pages (sign-in, sign-up): fall back to cookies so the
    // user's last choice persists across the login screen.
    const ck = cookieStore.get('theme')?.value
    if (ck === 'light' || ck === 'dark') themeMode = ck
    const ak = cookieStore.get('accent')?.value
    if (ak && (VALID_ACCENTS as readonly string[]).includes(ak)) {
      accent = ak as typeof VALID_ACCENTS[number]
    }
  }

  const htmlStyle: CSSProperties | undefined = brandColor
    ? ({ ['--brand' as never]: brandColor } as CSSProperties)
    : undefined

  return (
    <html lang="id" data-theme={themeMode} data-accent={accent} style={htmlStyle}>
      <head>
        {/*
          Inline init script — runs before React hydrates on hard reloads
          so the theme cookie wins even if SSR is slow. SSR + cookie are
          both authoritative; this script only catches the race.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
                if (m && (m[1] === 'light' || m[1] === 'dark')) {
                  document.documentElement.dataset.theme = m[1];
                }
                var a = document.cookie.match(/(?:^|; )accent=([^;]+)/);
                if (a && ${JSON.stringify(VALID_ACCENTS)}.indexOf(a[1]) > -1) {
                  document.documentElement.dataset.accent = a[1];
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        {children}
        <PwaInit />
      </body>
    </html>
  )
}
