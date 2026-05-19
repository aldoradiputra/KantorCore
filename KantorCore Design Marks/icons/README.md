# KantorCore — Icons & Brand Assets

This folder holds the static visual identity files for the KantorCore app:
**brand marks** (wordmark, monogram, lockup, favicon) in `../brand/` and
**module icons** (multi-tone Odoo-style) in `modules/`.

The earlier design system spec called for Lucide module icons; that has been
replaced by the custom set documented below. The brand-preview page
(`/brand-preview.html`) renders the whole system in context.

---

## Brand files

All marks are SVG with the letterforms converted to paths — no font
dependency at consumption. The wordmark is Inter 700 outlined; the K
monogram is custom-drawn geometric construction (not a font glyph).

| File | Use it for |
|---|---|
| `brand/kantorcore-wordmark.svg` | "KantorCore" wordmark alone, on light surfaces. Marketing headers, signature blocks, document footers, in-app empty states where the brand needs to be named without the mark. |
| `brand/kantorcore-mark.svg` | K monogram alone, on light surfaces. App tiles, avatars, embossed materials, social profile photos, business-card backs, anywhere the icon stands alone. |
| `brand/kantorcore-lockup.svg` | Mark + wordmark, horizontal, 8px gap. The primary brand presentation: top of the marketing site, decks, partner pages, press releases, slide masters. |
| `brand/kantorcore-wordmark-ondark.svg` | Wordmark in white, transparent background — overlay on navy `#1A2B5A` or any sufficiently dark surface. |
| `brand/kantorcore-mark-ondark.svg` | Monogram in white, transparent background — overlay on navy or dark photography. |
| `brand/kantorcore-lockup-ondark.svg` | Full lockup in white, transparent — overlay on navy. |
| `brand/kantorcore-favicon.svg` | 32×32, navy fill, white K. Browser tab favicon. The only brand file that ships with its own background plate baked in. |

### Clear-space rule

Minimum padding around any brand mark equals **1× the cap-height of the K**.

For the standalone monogram (`kantorcore-mark.svg`, viewBox 64×64), the visible K
extends from y=10 to y=54 — a cap-height of **44 units**. Reserve at least
44 units (≈ the K's own height) of empty space on all four sides before any
adjacent content, edge, or image.

For the lockup (`kantorcore-lockup.svg`, height 45), the cap-height is also 44.
Same 44-unit (≈ 1×K) clear-space rule applies on all sides.

### Color use

| Surface | Mark fill | Wordmark fill |
|---|---|---|
| White / off-white background (`#FFFFFF`, `#F8F9FB`) | Navy `#1A2B5A` | Navy `#1A2B5A` |
| Navy background (`#1A2B5A`) | White `#FFFFFF` | White `#FFFFFF` |
| Photography (warm-neutral, desaturated) | White `#FFFFFF` | White `#FFFFFF` |
| Indigo `#3B4FC4` (rare — never default) | White `#FFFFFF` | White `#FFFFFF` |

Never render the marks in teal, amber, red, or any phase color. Never
combine the mark with a globe, building, map pin, or any other glyph.
Never apply drop shadow, glow, gradient, bevel, 3D extrusion, or stroke
to any brand mark. The mark fills with one solid color, period.

### Minimum sizes

| Mark | Minimum render size |
|---|---|
| `kantorcore-mark.svg` | 16×16 px |
| `kantorcore-favicon.svg` | 16×16 px |
| `kantorcore-wordmark.svg` | 64px wide |
| `kantorcore-lockup.svg` | 96px wide (use `kantorcore-mark.svg` alone below this) |

Below the lockup minimum, drop the wordmark and use the monogram alone.

### What lives where in the SVG

Every file uses `fill-rule="nonzero"` and a single `<path>` element per
shape — no strokes, no filters, no `<defs>`. Geometry is defined directly
in absolute units so the files survive any downstream optimizer (SVGO,
imagemin) without distortion. Open any file in a text editor; the path
data is human-readable.

---

## Module icons

Nine modules, each with its own multi-tone illustrated icon. Lives in
`modules/` as standalone 48×48 SVGs with no external dependencies (no
strokes that scale weirdly, no filters, no fonts).

| File | Module | Bahasa | Lead color | Family |
|---|---|---|---|---|
| `modules/hr.svg` | HR | Karyawan | Indigo `#3B4FC4` | three figures, white front + indigo back |
| `modules/finance.svg` | Finance | Keuangan | Teal `#0F7B6C` | coin stack with Rp glyph |
| `modules/sales.svg` | Sales | Penjualan | Amber `#B35A00` | ascending bars + trend dot |
| `modules/crm.svg` | CRM | Pelanggan | Navy `#1A2B5A` | headset with mic boom |
| `modules/procurement.svg` | Procurement | Pengadaan | Amber `#B35A00` | shopping cart with handle |
| `modules/inventory.svg` | Inventory | Gudang | Indigo `#3B4FC4` | isometric cube, three faces |
| `modules/projects.svg` | Projects | Proyek | Indigo `#3B4FC4` | kanban board, three columns |
| `modules/documents.svg` | Documents | Dokumen | Navy `#1A2B5A` | stacked papers with corner fold |
| `modules/chat.svg` | Chat | Pesan | Teal `#0F7B6C` | two overlapping bubbles with dots |

### The 3-layer system

Every icon is built from exactly three layers, in this z-order:

1. **Tile** — a full-bleed 48×48 rounded square (radius 11, the iOS-squircle
   approximation). Filled with the module's lead color from the locked
   palette. The tile carries the module's color identity — the user spots
   Finance (teal) across a sidebar without reading the label.
2. **Shadow layer** — a darker shade of the lead color (≈70% darken in
   oklch). Used for receding shapes: the back figures in HR, the bottom
   coins in Finance, the far face of the Inventory cube. Suggests depth
   without ever using a CSS shadow filter.
3. **Focal layer** — always white. The user's eye lands here first. Used
   for the one element that names the module: the front figure, the top
   coin, the tallest bar, the front document.

Derived mid-tones (e.g. `#8590D5` indigo-mid, `#2D9588` teal-mid) appear
*only inside icon glyphs* — they are not promoted to the global design-token
list and do not appear in `colors_and_type.css`.

### Usage

**As `<img>`.** Preferred. Lossless, cacheable, swappable per-theme.

```html
<img src="/public/icons/modules/finance.svg" alt="" width="48" height="48">
```

**Inline `<svg>`.** Only when you need to recolor or animate per-instance.
Copy the file contents directly into your component; do not load via
`<use href>` because Safari has historically broken `currentColor`
inheritance through external symbols.

**Sizes.**

| Surface | Render size |
|---|---|
| Sidebar nav (inactive + active) | 22×22 px |
| Inline list / table row | 24×24 px |
| Dashboard widget header | 32×32 px |
| App launcher card | 48×48 px |
| Marketing tile / press kit | 96×96 px or larger |

Minimum legible render size is **20×20 px**. Below that the cube faces
in Inventory and the Rp glyph in Finance start to crush; use the wordmark
or the K monogram instead.

### What never to do

- Don't recolor the tile to a non-palette color. The lead-color choices
  are deliberate; an off-palette tile breaks the system.
- Don't apply CSS filters (drop-shadow, blur, hue-rotate) to the icon.
  The depth is already in the SVG.
- Don't add a stroke around the tile. The icon is its own boundary.
- Don't combine an icon with a text badge inside the same tile.
  Counts and statuses sit *next to* the tile, not on it.
- Don't mix this set with Lucide on the same screen. Pick one icon system
  per surface.

### Roadmap

The current set covers the nine first-class modules. Future additions
(Settings, Notifications, Reports, Government Connect) will follow the
same 3-layer system. When adding a new module:

1. Pick a lead color from the locked palette (`navy / indigo / teal / amber`).
   Don't introduce a fifth lead color without design-system review.
2. Sketch the glyph in white only, against the lead-color tile.
3. Add the shadow layer as the receding element — not as a literal drop
   shadow.
4. Test at 22×22 px (sidebar) first. If the glyph crushes there, simplify
   it; don't add detail.
