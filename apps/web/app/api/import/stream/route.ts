import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { streamRows } from '../../../../lib/import/parser'
import { validateRow } from '../../../../lib/import/validator'
import type { TargetSchema, FieldMapping, ImportConfig, ErrorStrategy, RowError } from '../../../../lib/import/types'

export const maxDuration = 120

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
  const errorStrategy = (form.get('errorStrategy') as ErrorStrategy | null) ?? 'skip_row'

  if (!file || !schemaStr || !mappingsStr) {
    return NextResponse.json({ error: 'file, targetSchema, mappings required' }, { status: 400 })
  }

  const schema: TargetSchema = JSON.parse(schemaStr)
  const mappings: FieldMapping[] = JSON.parse(mappingsStr)
  const config: ImportConfig = configStr ? JSON.parse(configStr) : {}

  const buffer = Buffer.from(await file.arrayBuffer())

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: object) => controller.enqueue(new TextEncoder().encode(JSON.stringify(obj) + '\n'))

      let processed = 0
      let errors = 0
      let rowIndex = 2  // row 1 = headers
      const errorLog: RowError[] = []
      const validRows: Record<string, unknown>[] = []
      let aborted = false

      try {
        for await (const batch of streamRows(buffer, file!.name, {
          delimiter: config.delimiter,
          sheetIndex: config.sheetIndex,
        })) {
          for (const rawRow of batch) {
            const result = validateRow(rawRow, mappings, schema.fields, rowIndex)
            rowIndex++

            if (result.valid) {
              validRows.push(result.data)
              processed++
            } else {
              errors++
              errorLog.push(...result.errors)

              if (errorStrategy === 'abort') {
                emit({ processed, errors, aborted: true })
                aborted = true
                break
              }
              // skip_row and partial_split both skip the row; partial_split includes error log at end
            }
          }
          if (aborted) break
          emit({ processed, errors })
        }

        emit({ done: true, processed, errors, validRows, errorLog: errorStrategy !== 'skip_row' ? errorLog : [] })
      } catch (err) {
        emit({ error: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
