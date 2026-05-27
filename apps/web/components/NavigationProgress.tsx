'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Slim progress bar at the top of the viewport that appears when the user
 * clicks an internal link and disappears once the new route is rendered.
 *
 * Strategy:
 *   1. A document-level mousedown listener detects clicks on <a> elements
 *      that point to internal paths and triggers the "loading" state.
 *   2. usePathname() change → "complete" state → short hold → "idle".
 *
 * Auth navigations that use window.location.href are intentional full reloads
 * and don't need the bar.
 */

type BarState = 'idle' | 'loading' | 'complete'

export default function NavigationProgress() {
  const pathname   = usePathname()
  const [state, setState] = useState<BarState>('idle')
  const [width, setWidth]   = useState(0)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef     = useRef<number | null>(null)
  const prevPath   = useRef(pathname)

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (rafRef.current)   cancelAnimationFrame(rafRef.current)
  }

  // Start the bar: shoot to 70% quickly, then slow-crawl toward 90%.
  function startLoading() {
    clear()
    setWidth(0)
    setState('loading')
    // Ramp to 70% in 200 ms via RAF
    const start = performance.now()
    function step(now: number) {
      const elapsed = now - start
      const pct = Math.min(70, (elapsed / 200) * 70)
      setWidth(pct)
      if (pct < 70) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        // Slow crawl: +1% every 400 ms, cap at 90
        timerRef.current = setInterval(() => {
          setWidth((w) => Math.min(90, w + 1))
        }, 400)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function complete() {
    clear()
    setWidth(100)
    setState('complete')
    timerRef.current = setTimeout(() => {
      setState('idle')
      setWidth(0)
    }, 400)
  }

  // Detect internal link clicks → start bar
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = (e.target as Element).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || !href.startsWith('/')) return
      // Skip same-page anchors and links that open in new tab
      if (target.target === '_blank') return
      if (href === pathname) return
      startLoading()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Also pick up router.push calls by watching pathname changes
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      complete()
    }
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => () => clear(), [])

  if (state === 'idle') return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2,
        width: `${width}%`,
        background: 'var(--indigo)',
        zIndex: 9999,
        transition: state === 'complete'
          ? 'width 0.15s ease, opacity 0.35s ease 0.05s'
          : 'width 0.1s ease',
        opacity: state === 'complete' ? 0 : 1,
        pointerEvents: 'none',
        borderRadius: '0 1px 1px 0',
        boxShadow: '0 0 6px rgba(59,79,196,0.5)',
      }}
    />
  )
}
