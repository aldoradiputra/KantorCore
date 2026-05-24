import 'server-only'
import { sql } from 'drizzle-orm'
import { withTenant } from '../db'
import { getModel } from './registry'

/**
 * Per-tenant document numbering. Format tokens:
 *   {prefix}        — model.numbering_prefix
 *   {yyyy}, {yy}    — year of the current date
 *   {mm}            — 2-digit month
 *   {seq}           — current counter
 *   {seq:NN}        — counter zero-padded to NN width (e.g. {seq:04} → "0001")
 *
 * Counter resets when the format references a period token (year/month).
 * Otherwise it increments monotonically across the model's lifetime.
 *
 * Concurrency: uses a single INSERT … ON CONFLICT DO UPDATE … RETURNING
 * round trip per call so two simultaneous callers can never get the same
 * number (Postgres serializes the row lock).
 */
export async function nextNumber(
  tenantId: string,
  modelKey: string,
  now: Date = new Date(),
): Promise<string> {
  const def = await getModel(modelKey)
  if (!def) throw new Error(`Unknown model: ${modelKey}`)
  const format = def.model.numberingFormat
  const prefix = def.model.numberingPrefix ?? ''
  if (!format) throw new Error(`Model ${modelKey} has no numbering_format configured.`)

  const yyyy = String(now.getUTCFullYear())
  const yy = yyyy.slice(-2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')

  // Derive period_key from format: yearly if {yyyy}/{yy}, monthly if {mm}, else global
  let periodKey = ''
  if (format.includes('{mm}')) periodKey = `${yyyy}-${mm}`
  else if (format.includes('{yyyy}') || format.includes('{yy}')) periodKey = yyyy

  return withTenant(tenantId, async (tx) => {
    // Atomic increment via UPSERT … RETURNING. The unique index on
    // (tenant_id, model_id, period_key) makes the conflict deterministic.
    const result = await tx.execute(sql`
      INSERT INTO platform.sequences (tenant_id, model_id, format, period_key, current_value, updated_at)
      VALUES (${tenantId}, ${def.model.id}, ${format}, ${periodKey}, 1, now())
      ON CONFLICT (tenant_id, model_id, period_key)
      DO UPDATE SET current_value = platform.sequences.current_value + 1, updated_at = now()
      RETURNING current_value
    `)
    const row = (result as unknown as { rows: { current_value: number }[] }).rows[0]
    const seq = Number(row?.current_value ?? 1)
    return renderFormat(format, { prefix, yyyy, yy, mm, seq })
  })
}

function renderFormat(
  format: string,
  vars: { prefix: string; yyyy: string; yy: string; mm: string; seq: number },
): string {
  return format.replace(/\{(\w+)(?::(\d+))?\}/g, (_, token: string, pad?: string) => {
    if (token === 'prefix') return vars.prefix
    if (token === 'yyyy') return vars.yyyy
    if (token === 'yy') return vars.yy
    if (token === 'mm') return vars.mm
    if (token === 'seq') {
      const s = String(vars.seq)
      return pad ? s.padStart(Number(pad), '0') : s
    }
    return ''
  })
}
