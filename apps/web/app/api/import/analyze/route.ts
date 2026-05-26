import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { parseFile } from '../../../../lib/import/parser'
import { suggestMappings } from '../../../../lib/import/llm-match'
import type { TargetSchema, ImportConfig } from '../../../../lib/import/types'

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const schemaStr = form.get('targetSchema') as string | null
  const configStr = form.get('config') as string | null

  if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })
  if (!schemaStr) return NextResponse.json({ error: 'targetSchema required' }, { status: 400 })

  if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: 'File exceeds 500 MB limit' }, { status: 413 })

  const schema: TargetSchema = JSON.parse(schemaStr)
  const config: ImportConfig = configStr ? JSON.parse(configStr) : {}

  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseFile(buffer, file.name, {
    delimiter: config.delimiter,
    sheetIndex: config.sheetIndex,
    encoding: config.encoding,
  })

  const sampleRows = parsed.rows.slice(0, 5).map((r) => parsed.headers.map((h) => r[h] ?? ''))
  const mappings = await suggestMappings(parsed.headers, schema.fields, sampleRows)

  return NextResponse.json({
    headers: parsed.headers,
    sampleRows,
    mappings,
    sheets: parsed.sheets,
  })
}
