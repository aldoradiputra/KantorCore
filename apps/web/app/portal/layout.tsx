import type { ReactNode } from 'react'

export default function PortalRootLayout({ children }: { children: ReactNode }) {
  // Portal pages do NOT render the internal AppShell — they get a clean,
  // public-facing chrome managed by individual pages.
  return <>{children}</>
}
