# @kantr/types

Shared TypeScript types used across the Kantr monorepo.

## Usage

```ts
import type { Node } from '@kantr/types'
```

## When to add a type here

Add a type when it is shared by **more than one** app or package. App-specific or
package-internal types should stay in the package that owns them. Keep this
package narrow — it is a dependency of nearly everything, so churn here ripples
widely.

## Current exports

- `Node` — roadmap feature graph node (used by `apps/roadmap`).

Types likely to land here as the product is built: `Tenant`, `User`, `AgentRun`,
`Locale`, `Phase`.
