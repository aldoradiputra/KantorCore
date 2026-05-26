import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { parseFile } from '../../../../lib/import/parser'
import { validateRow } from '../../../../lib/import/validator'
import type { TargetSchema, FieldMapping, ImportConfig } from '../../../../lib/import/types'

export const maxDuration = 30

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const schemaStr = form.get('targetSchema') as string | null
  const mappingsStr = form.get('mappings') as string | null
  const configStr = form.get('config') as string | null

  if (!file || !schemaStr || !mappingsStr) {
    return NextResponse.json({ error: 'file, targetSchema, mappings required' }, { status: 400 })
  }

  const schema: TargetSchema = JSON.parse(schemaStr)
  const mappings: FieldMapping[] = JSON.parse(mappingsStr)
  const config: ImportConfig = configStr ? JSON.parse(configStr) : {}

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseFile(buffer, file.name, {
    delimiter: config.delimiter,
    sheetIndex: config.sheetIndex,
  })

  const DRY_RUN_CAP = 50
  const preview = parsed.rows.slice(0, DRY_RUN_CAP)
  const allErrors: import('../../../../lib/import/types').RowError[] = []
  let validCount = 0
  let invalidCount = 0

  for (let i = 0; i < preview.length; i++) {
    const result = validateRow(preview[i]!, mappings, schema.fields, i + 2) // row 1 = headers
    if (result.valid) validCount++
    else { invalidCount++; allErrors.push(...result.errors) }
  }

  return NextResponse.json({
    headers: parsed.headers,
    preview,
    errors: allErrors,
    validCount,
    invalidCount,
  })
}
