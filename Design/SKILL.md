---
name: indonesia-system-design
description: Use this skill to generate well-branded interfaces and assets for Indonesia System (IS), a corporate operating system for Indonesian mid-market companies. Contains the brandbook, color + typography tokens, logo files, Lucide icon usage rules, microcopy in Bahasa Indonesia + English, and a high-fidelity UI kit (8 illustrated screens + reusable shell.css) ready to remix into prototypes, decks, or production code.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map of this skill

- `README.md` — full context: positioning, principles, content fundamentals, visual foundations, iconography, file index.
- `brandbook.html` — single-document brandbook covering all 10 sections (cover → don'ts).
- `colors_and_type.css` — drop-in CSS variables for color, type scale, spacing, radii, shadows, motion.
- `assets/` — logo files (wordmark, compact mark, mono, on-dark, favicon).
- `preview/` — small specimen cards (one concept each) for color, type, components, motion, voice.
- `ui_kits/is-app/` — 8 desktop + 1 mobile screen, plus the shared `shell.css` and `sidebar.js` Topbar/Sidebar helpers.

## Hard rules (memorize these)

- **Palette is locked.** Navy `#1A2B5A`, Indigo `#3B4FC4`, Indigo-light `#E8EBFA`, Teal `#0F7B6C`, Amber `#B35A00`, plus neutrals. Never invent new brand colors. Never combine more than two phase colors per screen region.
- **One typeface.** Inter for everything. JetBrains Mono only for tabular data (Rupiah, NIK, timestamps, code). No second display face.
- **Bahasa Indonesia is primary.** English ships in parallel — never translated after the fact. Use real Indonesian names (Budi Santoso, Dewi Rahmawati) and real-feeling companies (PT Acme Indonesia).
- **Format conventions:** Currency `Rp 1.250.000` (period thousands, no decimal). Dates `06/05/2026` short, `6 Mei 2026` long. NIK masked as `317•••••••••3456` in monospace.
- **Iconography:** Lucide at 1.5px stroke, 24×24 grid, `currentColor`. Never hand-roll SVG icons; never use emoji as UI.
- **No SaaS clichés:** no decorative gradients, no glassmorphism, no colored left-border accents on cards, no batik/Garuda/flag motifs, no animated text, no shimmer skeletons.

## Words to never use
amazing · delight · synergy · robust · leverage · seamless · effortlessly · revolutionary

## Starting a new artifact

1. Link `colors_and_type.css` (or copy the `:root` block).
2. Reuse `ui_kits/is-app/shell.css` for app screens — it gives you the sidebar, topbar, cards, buttons, badges, tables, and live dot for free.
3. For full screens, copy one of the 8 screen files in `ui_kits/is-app/` as a starting point — they all share the same shell so structure stays consistent.
4. Pull logos from `assets/` rather than redrawing.
