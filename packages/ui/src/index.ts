/**
 * @kantr/ui — shared React components for Kantr apps.
 *
 * Add a component here when it is consumed by more than one app/package.
 * Single-app UI lives in the app that owns it.
 *
 * Components must be:
 * - Token-driven (reference design-tokens CSS variables; no hard-coded colors)
 * - Accessible (keyboard, ARIA, focus visible)
 * - Locale-agnostic (no embedded copy)
 * - Server-component-compatible where possible
 */

export { Button } from './Button'
export type { ButtonProps } from './Button'
