'use client'

import { useEffect } from 'react'

export function ThemeProvider() {
  useEffect(() => {
    function apply() {
      try {
        const t = localStorage.getItem('kc-theme')
        const dark =
          t === 'dark' ||
          ((!t || t === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)
        if (dark) document.documentElement.setAttribute('data-theme', 'dark')
        else document.documentElement.removeAttribute('data-theme')
      } catch {}
    }

    apply()

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    window.addEventListener('storage', apply)
    return () => {
      mq.removeEventListener('change', apply)
      window.removeEventListener('storage', apply)
    }
  }, [])

  return null
}
