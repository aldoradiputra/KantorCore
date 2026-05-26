import type { TargetField, RowError } from './types'

// ── Boolean coercion ──────────────────────────────────────────────────────────
const TRUE_VALUES  = new Set(['yes', 'y', 'true', '1'])
const FALSE_VALUES = new Set(['no', 'n', 'false', '0'])

function coerceBoolean(val: string): boolean | null {
  const v = val.trim().toLowerCase()
  if (TRUE_VALUES.has(v))  return true
  if (FALSE_VALUES.has(v)) return false
  return null
}

// ── E.164 phone standardisation ───────────────────────────────────────────────
// Strips all non-digits (except leading +) and validates length 7–15 digits.
// Does not add country code — source data must include it.
function toE164(val: string): string | null {
  const stripped = val.trim().replace(/[\s\-().]/g, '')
  if (/^\+?\d{7,15}$/.test(stripped)) {
    return stripped.startsWith('+') ? stripped : '+' + stripped
  }
  return null
}

// ── Date coercion ─────────────────────────────────────────────────────────────
function coerceDate(val: string): string | null {
  const d = new Date(val.trim())
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

// ── Field validator ───────────────────────────────────────────────────────────

export interface CoercedValue {
  raw: string
  coerced: unknown
  valid: boolean
  error?: string
}

export function validateField(field: TargetField, raw: string): CoercedValue {
  const trimmed = raw?.trim() ?? ''

  if (!trimmed) {
    if (field.required) return { raw, coerced: null, valid: false, error: `Required field "${field.name}" is empty` }
    return { raw, coerced: null, valid: true }
  }

  if (field.type === 'boolean') {
    const b = coerceBoolean(trimmed)
    if (b === null) return { raw, coerced: null, valid: false, error: `Cannot coerce "${trimmed}" to boolean` }
    return { raw, coerced: b, valid: true }
  }

  if (field.type === 'number') {
    const n = Number(trimmed.replace(/,/g, ''))
    if (isNaN(n)) return { raw, coerced: null, valid: false, error: `"${trimmed}" is not a valid number` }
    // Anomaly: age-like field > 120 → warn but don't block unless regex says so
    return { raw, coerced: n, valid: true }
  }

  if (field.type === 'date') {
    const d = coerceDate(trimmed)
    if (!d) return { raw, coerced: null, valid: false, error: `"${trimmed}" is not a recognisable date` }
    return { raw, coerced: d, valid: true }
  }

  // string — apply regex if present
  if (field.regex) {
    try {
      if (!new RegExp(field.regex).test(trimmed)) {
        // Phone-like regex → try E.164 coercion first
        const e164 = toE164(trimmed)
        if (e164) return { raw, coerced: e164, valid: true }
        return { raw, coerced: null, valid: false, error: `"${trimmed}" fails pattern ${field.regex}` }
      }
    } catch { /* invalid regex — ignore */ }
  }

  // Phone name heuristic: if field name contains "phone"/"mobile"/"hp"/"tel"
  if (/phone|mobile|hp|tel/i.test(field.name)) {
    const e164 = toE164(trimmed)
    if (!e164) return { raw, coerced: null, valid: false, error: `"${trimmed}" is not a valid phone number (E.164 required)` }
    return { raw, coerced: e164, valid: true }
  }

  return { raw, coerced: trimmed, valid: true }
}

// ── Row validator ─────────────────────────────────────────────────────────────

export interface ValidatedRow {
  data: Record<string, unknown>
  errors: RowError[]
  valid: boolean
}

export function validateRow(
  rawRow: Record<string, string>,
  mappings: { sourceHeader: string; targetField: string | null }[],
  fields: TargetField[],
  rowIndex: number,
): ValidatedRow {
  const data: Record<string, unknown> = {}
  const errors: RowError[] = []
  const fieldMap = new Map(fields.map((f) => [f.name, f]))

  for (const mapping of mappings) {
    if (!mapping.targetField) continue
    const field = fieldMap.get(mapping.targetField)
    if (!field) continue
    const raw = rawRow[mapping.sourceHeader] ?? ''
    const result = validateField(field, raw)
    if (result.valid) {
      data[field.name] = result.coerced
    } else {
      errors.push({ row: rowIndex, field: field.name, value: raw, message: result.error ?? 'Invalid value' })
    }
  }

  // Check required fields that have no mapping
  for (const field of fields) {
    if (field.required && !(field.name in data)) {
      const hasMappingForField = mappings.some((m) => m.targetField === field.name)
      if (!hasMappingForField) {
        errors.push({ row: rowIndex, field: field.name, value: '', message: `Required field "${field.name}" is not mapped` })
      }
    }
  }

  return { data, errors, valid: errors.length === 0 }
}
