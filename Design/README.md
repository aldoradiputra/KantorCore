# Indonesia System — Design System

A national corporate operating system for Indonesia: simpler than Odoo, powerful enough to replace SAP, natively integrated with Indonesian government infrastructure (BPJS, Ketenagakerjaan, CoreTax DJP, NIK, QRIS).

This folder is the **design system + brandbook** for the product. It is the single source of visual truth.

---

## Sources

- **Repo:** [`aldoradiputra/is-roadmap`](https://github.com/aldoradiputra/is-roadmap) — the public roadmap app. Provides the locked color palette (`app/globals.css`), the phase model (Phase 0 / 1 / 2 / 3 → Navy / Indigo / Teal / Amber), and the existing component vocabulary in `app/components/*.tsx` (RoadmapApp, ListView, DetailPanel, SearchFilterBar).
- **Strategy doc:** `Indonesia_System_Master_Strategy.docx` (in repo root, not pulled here).
- **Brief:** the brandbook brief in this conversation — defines product positioning, principles, voice, and the 8 screens to illustrate.

---

## Index

- `README.md` — this file
- `SKILL.md` — Claude Skill manifest (use this folder as a Skill in Claude Code)
- `colors_and_type.css` — every design token (color, type scale, spacing, radius, shadow, motion)
- `assets/` — logo SVGs (wordmark, monogram, mono, on-dark), favicon
- `preview/` — bite-sized cards rendered into the Design System tab (palette, type specimens, components, motion, voice)
- `brandbook.html` — the long-form brandbook (cover → foundation → logo → color → type → icons → components → screens → motion → microcopy)
- `ui_kits/is-app/` — high-fidelity UI kit for the desktop app (sidebar, topbar, tables, forms, modal, toast, presence)
  - `index.html` — the global home dashboard
  - `screens/` — the 8 illustrated screens
  - `components/` — JSX components (Button, Sidebar, TableRow, Badge, Avatar, …)
- `ui_kits/is-mobile/` — PWA mobile UI kit (expense capture, list, scanner)

---

## Brand at a glance

**Name:** Indonesia System (IS)
**One-liner:** The national corporate OS for Indonesia.
**Audience:** Indonesian operations managers, finance leads, HR directors, CEOs of 50–500-person companies.
**Primary language:** Bahasa Indonesia. English supported.

**Voice:** calm, direct, confident, helpful, professional.
**Visual mood:** architectural, quietly precise, long-session software. Linear meets Notion meets a serious accounting tool.

---

## Content fundamentals

How to write copy for IS.

- **Casing.** Sentence case for everything except proper nouns and module names (HR, Finance, Procurement). Never ALL CAPS in body. UPPERCASE only for letterspaced micro-labels (`PHASE 1`, `OVERDUE`, `BPJS`).
- **Person.** "You" addresses the operator. The product never says "I" or "we" — it does, it doesn't claim. (Empty state: "No invoices yet" not "I don't see any invoices.")
- **Tense.** Present and past. Avoid future-conditional ("might", "should be able to").
- **Numbers.** Always use Indonesian formatting in product surfaces — `Rp 1.250.000`, `06/05/2026`, `6 Mei 2026`. NIK is masked in the middle: `317•••••••••3456`.
- **Length.** Buttons ≤ 2 words. Toasts ≤ 7 words. Empty-state titles ≤ 4 words.
- **No emoji** in product UI. (Avatars, marketing materials, and chat input may use them; chrome and system messages do not.)
- **No exclamation marks** in product UI. The product is calm. Reserve `!` for genuine warnings ("Tagihan jatuh tempo!" in marketing only).
- **Bilingual parity.** When a string is shipped, both Bahasa Indonesia and English are written by the same author at the same time. Never translate one from the other after shipping.

**Examples:**

| Situation | ID | EN |
|---|---|---|
| Empty state | "Belum ada faktur." | "No invoices yet." |
| Confirm delete | "Hapus faktur ini?" | "Delete this invoice?" |
| Success toast | "Faktur disetujui." | "Invoice approved." |
| Error | "Perubahan gagal disimpan." | "Couldn't save your changes." |
| Loading | "Memuat…" | "Loading…" |
| Onboarding | "Mulai dengan menambah karyawan pertama." | "Start by adding your first employee." |

**Words to never use:** *amazing, delight, synergy, robust, leverage, seamless, effortlessly, revolutionary.*

---

## Visual foundations

How IS looks and feels.

**Color.** Navy is the brand anchor (used for headings, hero, logo). Indigo is the dominant interactive color (primary buttons, links, active states). Teal/amber appear sparingly as semantic status (success / warning). Phase modules inherit the phase color (Phase 1 = indigo, Phase 2 = teal, Phase 3 = amber). Backgrounds are off-white (`#F8F9FB`); surfaces are pure white. Borders are a single hairline color (`#E5E7EB`). Never combine more than two phase colors in a single screen region.

**Type.** One family does all the work: **Inter** for UI and body, **JetBrains Mono** for tabular numerals, code, NIK, IDs, and timestamps. No display font drama. Numerals always use `font-feature-settings: "tnum"` so columns line up. Letterspacing only for micro-labels (`-0.3px` on h1/h2 for tightening; `+1.2px` on letterspaced caps).

**Spacing.** 4px base. The scale is `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Components are dense — table rows are 36px tall, sidebar items 32px tall. White space is the secondary structural device (after hairlines).

**Backgrounds.** Flat off-white. **No** gradients, no glass, no patterns, no decorative imagery, no AI-shimmer. The hero in marketing may carry a single muted photograph (Jakarta architecture, an office desk) at 60% opacity over navy.

**Borders.** One hairline color (`#E5E7EB`), 1px. Used as table dividers, card borders, sidebar separators, input borders. Cards are `1px solid var(--border)` on white — never shadowed by default. Elevation comes from the border + a faint shadow only on overlays (modals, popovers, toasts).

**Shadows.** Three levels:
- `--shadow-sm` `0 1px 2px rgba(15, 23, 42, 0.04)` — sticky table headers, active sidebar item
- `--shadow-md` `0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)` — popovers, dropdowns
- `--shadow-lg` `0 16px 40px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06)` — modals, right-sliding sheets

**Radius.** Three values: `4px` (badges, pills, small buttons), `8px` (inputs, cards, buttons), `12px` (modals, popovers). Never larger.

**Motion.** Confident and short. Easing `cubic-bezier(0.2, 0, 0, 1)` for default; spring only for confirm-success moments. Durations: instant 80ms / fast 150ms / base 220ms / slow 350ms. Things that animate: panel entrance/exit, hover scale on cards (max 1.02), real-time data pulses (single 600ms opacity pulse, no loop). Things that **never** animate: text content (no count-up, no typing), table-row reorders during data refresh.

**Hover.** Buttons darken 4–6% (computed in oklch, not by hardcoded hex). List rows pick up `--indigo-light` background. Links underline.

**Press.** Buttons darken further and translate `0 1px` to feel tactile. No scale-down (would feel cheap).

**Focus.** 2px outline in indigo, offset 2px from the element. Always visible — never `outline: none` without replacement.

**Transparency / blur.** Used sparingly. The topbar uses `backdrop-filter: blur(8px)` over white at 92% opacity when content scrolls under it. Modal scrims are `rgba(15, 23, 42, 0.4)` — flat, no blur.

**Imagery.** When photos appear (marketing only), they are warm-neutral, desaturated to ~70% saturation, fine grain. People shots: working hands, laptops, ledgers — never stock-smiling-at-camera. No people in product UI except real avatars.

**Cards.** White surface, 1px border, 8px radius. No shadow at rest. No accent border on the left. Inner padding 24px for content cards, 16px for compact (dashboard widget) cards.

**Layout.** App shell is fixed: 240px sidebar (collapsible to 56px) + 52px topbar + content. Content has 32px gutter on desktop. Right-sliding detail panel is 420px wide.

---

## Iconography

IS uses **Lucide** (lucide.dev) at **1.5px stroke weight**, **24×24 grid**, with **2px corner radius** for soft strokes. Lucide is a fork of Feather and matches IS's calm, architectural feel.

- Primary stroke: `currentColor` so icons inherit text color.
- Active sidebar items use a filled variant — IS doesn't ship custom filled icons; instead, the active item gets a `rgba(59, 79, 196, 0.08)` background plate behind the line icon.
- Module icons: `Users` (HR), `Wallet` (Finance), `BarChart3` (Sales), `Headphones` (CRM), `ShoppingCart` (Procurement), `Package` (Inventory), `FolderKanban` (Projects), `FileText` (Documents), `MessageSquare` (Chat).
- Loaded from CDN: `https://unpkg.com/lucide-static@0.453.0/font/lucide.css` for the font; or per-icon SVG via `https://unpkg.com/lucide-static@0.453.0/icons/<name>.svg`.

**Never** use emoji as iconography in product chrome. **Never** mix Lucide with another set on the same screen.

---

## Caveats / things to confirm

- The repo only ships system-font stack (`-apple-system`). The design system commits to **Inter** as the primary face. If the user wants to keep system-fonts for performance, swap `--font-sans` to the system stack — the rest of the system survives.
- Logo is original, designed in this folder. There is no prior logo in the repo.
- The brief mentions phone screens — implemented as PWA, not native. UI kit reflects this.
