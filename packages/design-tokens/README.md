# @kantr/design-tokens

Single source of truth for Kantr's design tokens — colors, typography, spacing, radius, shadow, motion. Locked: changes require an ADR.

## Usage

```ts
// In a Next.js app's root layout
import '@kantr/design-tokens/tokens.css'
```

All CSS variables (`--navy`, `--indigo`, `--font-sans`, etc.) and semantic typography classes (`.t-h1`, `.t-body`, `.t-mono`) become globally available.

## Relationship to `Design/`

The workspace-root `Design/` folder is the documentation and brandbook source. `Design/colors_and_type.css` mirrors this file and is what `brandbook.html` and the `Design/preview/*` examples reference relative to that folder.

For code consumption, **import from this package**. If a token value changes (rare — these are locked), update both files in the same commit.
