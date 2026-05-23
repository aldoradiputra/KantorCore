import { and, desc, eq } from 'drizzle-orm'
import {
  triggerRules, triggerLogs, messages, channels,
  type TriggerRule, type TriggerLog, type TriggerEvent, type TriggerAction,
} from '@kantorcore/db'
import { withTenant, getDb } from './db'

export type { TriggerRule, TriggerLog, TriggerEvent, TriggerAction }

export const EVENT_LABEL: Record<TriggerEvent, string> = {
  'invoice.confirmed':       'Faktur Dikonfirmasi',
  'invoice.paid':            'Faktur Dibayar',
  'bill.confirmed':          'Tagihan Dikonfirmasi',
  'bill.paid':               'Tagihan Dibayar',
  'po.confirmed':            'PO Dikonfirmasi',
  'po.received':             'PO Diterima',
  'so.confirmed':            'SO Dikonfirmasi',
  'so.done':                 'SO Selesai',
  'deal.won':                'Deal Menang',
  'deal.lost':               'Deal Kalah',
  'deal.stage_changed':      'Stage Deal Berubah',
  'contact.created':         'Kontak Dibuat',
  'employee.created':        'Karyawan Dibuat',
  'document.expiring_soon':  'Dokumen Segera Kadaluarsa',
  'import.completed':        'Import Selesai',
}

export const ACTION_LABEL: Record<TriggerAction, string> = {
  chat_message: 'Pesan Chat',
  webhook:      'Webhook',
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listTriggerRules(tenantId: string): Promise<TriggerRule[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(triggerRules)
      .where(eq(triggerRules.tenantId, tenantId))
      .orderBy(desc(triggerRules.createdAt)),
  )
}

export async function getTriggerRule(tenantId: string, id: string): Promise<TriggerRule | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.select().from(triggerRules)
      .where(and(eq(triggerRules.tenantId, tenantId), eq(triggerRules.id, id)))
      .limit(1),
  )
  return rows[0] ?? null
}

export async function createTriggerRule(input: {
  tenantId: string
  userId: string
  name: string
  description?: string | null
  event: TriggerEvent
  action: TriggerAction
  config: Record<string, unknown>
}): Promise<{ ok: true; rule: TriggerRule } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: 'Nama rule wajib diisi.' }

  if (input.action === 'chat_message') {
    if (typeof input.config['channel_slug'] !== 'string' || typeof input.config['template'] !== 'string') {
      return { ok: false, error: 'Config chat_message harus berisi channel_slug dan template.' }
    }
  } else if (input.action === 'webhook') {
    const url = input.config['url']
    if (typeof url !== 'string' || !url.startsWith('http')) {
      return { ok: false, error: 'Config webhook harus berisi url yang valid (http/https).' }
    }
  }

  const rows = await withTenant(input.tenantId, (tx) =>
    tx.insert(triggerRules)
      .values({
        tenantId:    input.tenantId,
        name:        input.name.trim(),
        description: input.description?.trim() ?? null,
        event:       input.event,
        action:      input.action,
        config:      input.config,
        status:      'active',
        createdBy:   input.userId,
      })
      .returning(),
  )
  return { ok: true, rule: rows[0]! }
}

export async function toggleTriggerRule(
  tenantId: string,
  id: string,
  status: 'active' | 'inactive',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.update(triggerRules)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(triggerRules.tenantId, tenantId), eq(triggerRules.id, id)))
      .returning({ id: triggerRules.id }),
  )
  if (rows.length === 0) return { ok: false, error: 'Rule tidak ditemukan.' }
  return { ok: true }
}

export async function deleteTriggerRule(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx.delete(triggerRules)
      .where(and(eq(triggerRules.tenantId, tenantId), eq(triggerRules.id, id)))
      .returning({ id: triggerRules.id }),
  )
  if (rows.length === 0) return { ok: false, error: 'Rule tidak ditemukan.' }
  return { ok: true }
}

export async function listTriggerLogs(tenantId: string, ruleId?: string): Promise<TriggerLog[]> {
  return withTenant(tenantId, (tx) => {
    const where = ruleId
      ? and(eq(triggerLogs.tenantId, tenantId), eq(triggerLogs.ruleId, ruleId))
      : eq(triggerLogs.tenantId, tenantId)
    return tx.select().from(triggerLogs)
      .where(where!)
      .orderBy(desc(triggerLogs.firedAt))
      .limit(100)
  })
}

// ── Fire event ────────────────────────────────────────────────────────────────

/** Call after any state transition. Fire-and-forget — never throws. */
export async function fireEvent(
  tenantId: string,
  event: TriggerEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const rules = await withTenant(tenantId, (tx) =>
      tx.select().from(triggerRules)
        .where(and(
          eq(triggerRules.tenantId, tenantId),
          eq(triggerRules.event, event),
          eq(triggerRules.status, 'active'),
        )),
    )
    await Promise.allSettled(rules.map((rule) => executeRule(tenantId, rule, payload)))
  } catch {
    // swallow — triggers are non-critical
  }
}

async function executeRule(
  tenantId: string,
  rule: TriggerRule,
  payload: Record<string, unknown>,
): Promise<void> {
  let ok = false
  let response: string | null = null

  try {
    if (rule.action === 'chat_message') {
      const cfg = rule.config as { channel_slug?: string; template?: string }
      const channelSlug = cfg.channel_slug ?? 'general'
      const template = cfg.template ?? `[Trigger] ${rule.event}`
      const body = interpolate(template, payload)

      const db = getDb()
      const [ch] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(and(eq(channels.tenantId, tenantId), eq(channels.slug, channelSlug)))
        .limit(1)

      if (ch && rule.createdBy) {
        await db.insert(messages).values({
          tenantId,
          channelId: ch.id,
          authorId:  rule.createdBy,
          body,
        })
        ok = true
        response = `Sent to #${channelSlug}`
      } else if (!ch) {
        response = `Kanal #${channelSlug} tidak ditemukan`
      } else {
        response = 'Rule tidak memiliki createdBy — tidak bisa mengirim pesan'
      }
    } else if (rule.action === 'webhook') {
      const cfg = rule.config as { url?: string; method?: string; secret?: string }
      const url = cfg.url
      if (!url) { response = 'URL tidak dikonfigurasi'; return }
      const method = (cfg.method ?? 'POST').toUpperCase()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (cfg.secret) headers['X-Webhook-Secret'] = cfg.secret
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ event: rule.event, tenantId, payload, ruleId: rule.id }),
        signal: AbortSignal.timeout(10_000),
      })
      ok = res.ok
      response = `HTTP ${res.status}`
    }
  } catch (err) {
    response = err instanceof Error ? err.message : String(err)
  }

  await withTenant(tenantId, (tx) =>
    tx.insert(triggerLogs).values({
      tenantId,
      ruleId:  rule.id,
      event:   rule.event,
      payload,
      ok,
      response,
    }),
  ).catch(() => {})
}

function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(ctx[key] ?? ''))
}
