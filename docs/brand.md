# KantorCore — Brand Usage Guide

> Version 0.1 · Pre-alpha · May 2026  
> Source of truth for designers, marketers, and engineers.  
> Keep in sync with `packages/design-tokens/tokens.css`.

---

## 1. Name & Casing

| Surface | Form | Example |
|---|---|---|
| Prose, UI copy, documentation | **KantorCore** | "Selamat datang di KantorCore." |
| Domain, URLs, slugs | `kantorcore` | `kantorcore.com`, `app.kantorcore.com` |
| npm / pnpm packages | `@kantorcore/` | `@kantorcore/db`, `@kantorcore/auth` |
| Environment variables | `KANTORCORE_` | `KANTORCORE_API_KEY` |
| CSS custom properties / tokens | `kantorcore-` prefix if needed | (currently unnamespaced; use as-is) |
| Logo logotype | Designer's discretion | All-lowercase or mixed — written prose always uses `KantorCore` |

**Never write:**
- `KantorCORE` — looks like an acronym; dated
- `KANTOR CORE` — two words; legal/banking context only
- `kantor core` — ambiguous (Bahasa Indonesia: "kantor core" could mean "core office")
- `kantorcore` in running prose — fine in code, not in UI copy

**Tagline guidance:** "Sistem Operasi Korporat Indonesia" — avoid truncating to initials in early branding.

---

## 2. Color Tokens

All tokens live in `packages/design-tokens/tokens.css` and are imported globally. Use variable names — never hardcode hex values.

### Brand Colors

| Token | Value | Usage |
|---|---|---|
| `--navy` | `#1A2B5A` | Primary brand color · headlines · wordmark · Phase 0 nodes |
| `--navy-2` | `#0F1A3A` | Deep navy · hover states on dark backgrounds |
| `--indigo` | `#3B4FC4` | Primary action color · CTA buttons · active states · Phase 1 nodes |
| `--indigo-hover` | `#2F40A8` | Hover on indigo elements |
| `--indigo-light` | `#E8EBFA` | Active/selected backgrounds (nav items, chips) |
| `--teal` | `#0F7B6C` | Success · Phase 2 nodes · "Live" badge · enabled state |
| `--teal-light` | `#E0F4F1` | Success background |
| `--amber` | `#B35A00` | Warning · Phase 3 nodes · "Offline" badge · caution states |
| `--amber-light` | `#FEF3E2` | Warning background |
| `--red` | `#B42318` | Destructive actions · error states |
| `--red-light` | `#FEE4E2` | Error background |

### Neutral Palette

| Token | Value | Usage |
|---|---|---|
| `--slate` | `#4A4A5A` | Body text (`--fg-2`) |
| `--slate-2` | `#2A2A36` | Dark surface text |
| `--muted` | `#6B7280` | Secondary / placeholder text (`--fg-3`) |
| `--border` | `#E5E7EB` | Default borders, dividers |
| `--border-strong` | `#D1D5DB` | Emphasized borders |
| `--bg` | `#F8F9FB` | App background |
| `--surface` | `#FFFFFF` | Cards, panels, modals |
| `--white` | `#FFFFFF` | Explicit white (buttons, text-on-dark) |

### Semantic Aliases

| Token | Resolves to | Usage |
|---|---|---|
| `--fg-1` | `--navy` | Headings, high-emphasis text |
| `--fg-2` | `--slate` | Body text, labels |
| `--fg-3` | `--muted` | Captions, placeholders, secondary labels |

### Roadmap Phase Colors

Used exclusively on the SVG map canvas in `apps/roadmap`:

| Phase | Token | Hex | Semantic |
|---|---|---|---|
| 0 (root/core) | `--navy` | `#1A2B5A` | Platform foundation |
| 1 (v1.0) | `--indigo` | `#3B4FC4` | Launch modules |
| 2 (v2.0) | `--teal` | `#0F7B6C` | Growth modules |
| 3 (v3.0+) | `--amber` | `#B35A00` | Future / vertical modules |

---

## 3. Typography

| Token | Value | Usage |
|---|---|---|
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All UI text |
| `--font-mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace` | Code, IDs, keys, monospace data |

**Web font loading:** Inter + JetBrains Mono loaded from Google Fonts in `tokens.css`. Subset to Latin + Latin-Extended for Indonesian.

### Type Scale

| Class | Size | Weight | Usage |
|---|---|---|---|
| `.t-display` | 56px | 800 | Hero headlines (marketing only) |
| `h1 / .t-h1` | 32px | 700 | Page titles |
| `h2 / .t-h2` | 24px | 700 | Section headers |
| `h3 / .t-h3` | 18px | 600 | Card headers |
| `.t-body-l` | 16px | 400 | Large body |
| `p / .t-body` | 14px | 400 | Default body |
| `.t-body-s` | 13px | 400 | Small body |
| `.t-label` | 12px | 500 | Form labels |
| `.t-caption` | 11px | 500 | Captions, timestamps |
| `.t-micro` | 10px | 700 | Section labels (ALL CAPS, 1.2px tracking) |
| `code / .t-mono` | 13px | 500 | Monospace (IDs, slugs, keys) |

---

## 4. Spacing

8pt grid. All spacing tokens are multiples of 4px:

| Token | Value | Common usage |
|---|---|---|
| `--s-1` | 4px | Tight inline gaps |
| `--s-2` | 8px | Icon padding, tight row gaps |
| `--s-3` | 12px | Row padding, button gaps |
| `--s-4` | 16px | Default panel padding, section gaps |
| `--s-5` | 24px | Section spacing |
| `--s-6` | 32px | Card padding, large section gaps |
| `--s-7` | 48px | Page-level vertical padding |
| `--s-8` | 64px | Large separators |
| `--s-9` | 96px | Hero sections |

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--r-sm` | 4px | Inputs, small chips, badges |
| `--r-md` | 8px | Cards, panels, modals |
| `--r-lg` | 12px | Large cards (marketing) |

---

## 6. Shadow

| Token | Usage |
|---|---|
| `--shadow-sm` | Subtle lift |
| `--shadow-md` | Cards, dropdowns |
| `--shadow-lg` | Modals, command palette |
| `--shadow-focus` | Keyboard focus ring (indigo outline) |

---

## 7. Layout Constants

| Token | Value | Usage |
|---|---|---|
| `--topbar-h` | 52px | Top navigation bar height |
| `--sidebar-w` | 240px | Module sidebar width |
| `--sidebar-w-min` | 56px | Icon rail width |
| `--panel-w` | 420px | Right-side slide-in panels |
| `--content-gutter` | 32px | Page content horizontal padding |

---

## 8. Motion

| Token | Value | Usage |
|---|---|---|
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | Default easing |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances |
| `--spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy micro-interactions |
| `--d-instant` | 80ms | Immediate feedback (toggle, checkbox) |
| `--d-fast` | 150ms | Hover transitions, icon swaps |
| `--d-base` | 220ms | Default transitions (panel open) |
| `--d-slow` | 350ms | Large layout shifts |

---

## 9. Component Patterns

### Buttons

- **Primary**: `background: var(--indigo)` · white text · single primary action per view
- **Secondary**: `border: 1px solid var(--border)` · `color: var(--fg-2)` · secondary CTAs
- Heights: `sm` = 28px · `md` = 36px · `lg` = 44px (marketing)

### Badges / Role chips

```css
font: 600 9px/1 var(--font-sans);
text-transform: uppercase;
letter-spacing: 0.8px;
border: 1px solid var(--border);
padding: 3px 5px;
border-radius: var(--r-sm);
```

### Module active state (icon rail)

```css
color: var(--indigo);
background: var(--indigo-light);
border-radius: var(--r-md);
```

### Status indicators

| State | Color |
|---|---|
| Enabled / online / success | `var(--teal)` |
| Disabled / offline / warning | `var(--amber)` |
| Error / rejected | `var(--red)` |
| Inactive / muted | `var(--border-strong)` |

---

## 10. Do / Don't for Claude Design

**Do:**
- Use `--navy` for the wordmark — never pure black
- Use `--indigo` for all primary CTAs and active/selected states
- Keep the topbar at exactly 52px (`--topbar-h`)
- Use Inter 800 only for display/hero; 700 for h1/h2; 600 for h3 and emphasis
- Respect the 8pt grid — only use `--s-*` tokens
- Use sentence case for Indonesian UI copy — "Lihat roadmap" not "Lihat Roadmap"

**Don't:**
- Hardcode hex values — always reference token names
- Use `--amber` for primary actions — it signals warning, not CTA
- Add drop shadows to the topbar or icon rail — borders suffice
- Use roadmap phase colors outside the roadmap canvas
- Design for dark mode yet — single light theme, v1.0 only

---

*When tokens change, update this doc in the same PR.*
