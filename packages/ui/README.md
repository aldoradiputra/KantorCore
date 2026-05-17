# @kantr/ui

Shared React components for Kantr apps.

## Usage

```tsx
import { Button } from '@kantr/ui'

export default function Page() {
  return <Button variant="primary" size="md">Simpan</Button>
}
```

Consumers must also import `@kantr/design-tokens/tokens.css` in their root
layout — components reference design token CSS variables (`--indigo`,
`--r-md`, `--font-sans`, etc.) and assume they are defined.

## Philosophy

This package stays narrow. A component lands here when **two or more** apps
need it; single-app UI stays in the app. Avoid over-abstracting from a single
caller — the right shape only becomes clear with multiple consumers.

## Components

- **Button** — `variant: 'primary' | 'secondary' | 'ghost'`, `size: 'sm' | 'md' | 'lg'`, `fullWidth?`

Likely to land here as the product is built: `Badge`, `Avatar`, `Card`,
`Input`, `Select`, `Toast`, `Modal`, `Sidebar`, `TopBar`.

## Constraints

- Token-driven — no hard-coded colors or sizes
- Accessible — keyboard nav, ARIA, focus visible
- Locale-agnostic — copy is the consumer's responsibility
- Server-component-compatible where possible
