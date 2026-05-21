# MAPS Ledger — Central Data Matrix

Single source of truth for the Multi-Agent Product Development Pipeline (MAPS).
Each row is one feature request; columns are updated in place by the noted agent.

Status legend:
- `Dev Phase`: `—` (not started) → `phase-1`, `phase-2`, … → `complete`
- `Gate Status`: `Pending` / `Approved` / `Rejected`

---

## Cycle 1 — Indonesian SME Retail

| ID | Industry | Persona | User Story | Tech Spec | Tech Implication | Impact | Effort | Priority | Dev Phase | QA Status | Gate Status | User Feedback |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | SME Retail | Ibu Sari (warung owner) | Record a sale in <5s from phone so customers don't wait. | `/pos` PWA route; tap-to-add last-12 SKUs; offline IndexedDB queue → flush on reconnect; reuses `sales_orders` with `source='pos'`. | New `source` enum value on `sales_orders`; service-worker write queue; mobile-first inline-style CSS. Builds on IS-MOB. | 5 | 3 | **High** | — | — | Pending | — |
| REQ-002 | SME Retail | Ibu Sari (warung owner) | Track customer credit (utang) per regular so I stop forgetting balances. | New `credit_ledger(tenant_id, contact_id, amount_idr, direction, sale_id?, note, settled_at)`; per-contact balance derived; UI ranks by outstanding desc; one-tap "tambah utang" / "lunas". | New Drizzle schema + migration; RLS by tenant_id; links to existing IS-CRM `contacts`. | 4 | 2 | **High** | — | — | Pending | — |
| REQ-003 | SME Retail | Pak Budi (toko bangunan owner) | One-tap daily sales summary at closing so I know cash-in before locking up. | `/pos/closing` view; aggregates today's `sales_orders` by payment method, total IDR, count; WhatsApp share via `wa.me?text=` deep link. | Read-only query; no new tables. UI only. | 3 | 1 | Medium | — | — | Pending | — |
| REQ-004 | SME Retail | Pak Budi (toko bangunan owner) | Accept QRIS where customer scans my QR and the system auto-confirms so I stop checking BCA manually. | QRIS confirmation via PSP webhook (Midtrans/Xendit); `payment_intents` table; 60s long-poll fallback; static MPM QR rendered from merchant config. | New `payments` schema; PSP webhook endpoint; per-tenant secrets storage; **external dep: PSP signup**. | 5 | 5 | Medium | — | — | Pending | — |
| REQ-005 | SME Retail | Mbak Rina (cashier) | Low-stock alerts when SKU hits reorder point so I can tell the manager before we run out. | Add `reorder_point` to `products`; re-evaluate on stock-movement insert; emit IS-CHAT notification to `inventory_managers` group. | Migration on `products`; insert hook in `lib/inventory.ts`; reuses IS-CHAT notification channels. | 3 | 2 | Medium | — | — | Pending | — |

---

## Change log

- **2026-05-21** — Cycle 1 opened. CPA + BAA committed REQ-001 → REQ-005.
- **2026-05-21** — KMA scored Impact/Effort. REQ-001 & REQ-002 = High. REQ-001 selected for first Phase 3 dev iteration.
