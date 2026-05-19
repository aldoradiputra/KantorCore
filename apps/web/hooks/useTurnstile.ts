'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_ID = 'cf-turnstile-script'

/**
 * Renders a Cloudflare Turnstile invisible widget and returns the token once
 * the challenge completes. Call reset() after a failed or successful submission
 * so the widget issues a fresh token for the next attempt.
 *
 * When NEXT_PUBLIC_TURNSTILE_SITE_KEY is absent (dev / Turnstile disabled),
 * token stays null and the server skips verification.
 */
export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) return

    function renderWidget() {
      if (!containerRef.current || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile!.render(containerRef.current, {
        sitekey: siteKey,
        size: 'invisible',
        callback: (t: string) => setToken(t),
      })
    }

    if (typeof window.turnstile !== 'undefined') {
      renderWidget()
    } else if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      script.onload = renderWidget
      document.head.appendChild(script)
    } else {
      document.getElementById(SCRIPT_ID)!.addEventListener('load', renderWidget, { once: true })
    }

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  function reset() {
    setToken(null)
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current)
  }

  return { containerRef, token, reset }
}
