import 'server-only'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]   // raw strings always
  sheets?: string[]                 // xlsx only
}

export interface ParseOptions {
  delimiter?: string    // CSV: default ','
  sheetIndex?: number   // xlsx: 0-based, default 0
  encoding?: string     // default 'utf-8'
}

// ── CSV ───────────────────────────────────────────────────────────────────────
async function parseCsv(buffer: Buffer, opts: ParseOptions): Promise<ParsedFile> {
  const { parse } = await import('csv-parse')
  return new Promise((resolve, reject) => {
    const records: string[][] = []
    const parser = parse({
      delimiter: opts.delimiter ?? ',',
      relax_quotes: true,
      skip_empty_lines: true,
      trim: true,
    })
    parser.on('readable', () => {
      let record: string[]
      while ((record = parser.read()) !== null) records.push(record)
    })
    parser.on('error', reject)
    parser.on('end', () => {
      if (records.length === 0) return resolve({ headers: [], rows: [] })
      const headers = records[0]!.map(String)
      const rows = records.slice(1).map((r) =>
        Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '')]))
      )
      resolve({ headers, rows })
    })
    parser.write(buffer)
    parser.end()
  })
}

// ── XLSX / XLS ────────────────────────────────────────────────────────────────
async function parseXlsx(buffer: Buffer, opts: ParseOptions): Promise<ParsedFile> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetNames = workbook.SheetNames
  const sheetIndex = opts.sheetIndex ?? 0
  const sheetName = sheetNames[sheetIndex] ?? sheetNames[0]!
  const sheet = workbook.Sheets[sheetName]!
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
  if (raw.length === 0) return { headers: [], rows: [], sheets: sheetNames }
  const headers = raw[0]!.map(String)
  const rows = raw.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '')]))
  )
  return { headers, rows, sheets: sheetNames }
}

// ── XML ───────────────────────────────────────────────────────────────────────
async function parseXml(buffer: Buffer): Promise<ParsedFile> {
  const { XMLParser } = await import('fast-xml-parser')
  const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true })
  const result = parser.parse(buffer.toString('utf-8'))

  // Find the first array of objects in the parsed tree
  function findRows(obj: unknown): Record<string, unknown>[] | null {
    if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') return obj as Record<string, unknown>[]
    if (typeof obj === 'object' && obj !== null) {
      for (const v of Object.values(obj)) {
        const found = findRows(v)
        if (found) return found
      }
    }
    return null
  }

  const rawRows = findRows(result) ?? []
  if (rawRows.length === 0) return { headers: [], rows: [] }
  const headers = Array.from(new Set(rawRows.flatMap((r) => Object.keys(r))))
  const rows = rawRows.map((r) =>
    Object.fromEntries(headers.map((h) => [h, String(r[h] ?? '')]))
  )
  return { headers, rows }
}

// ── JSON ──────────────────────────────────────────────────────────────────────
function parseJson(buffer: Buffer): ParsedFile {
  const data = JSON.parse(buffer.toString('utf-8'))
  const arr: Record<string, unknown>[] = Array.isArray(data) ? data : [data]
  if (arr.length === 0) return { headers: [], rows: [] }
  const headers = Array.from(new Set(arr.flatMap((r) => Object.keys(r))))
  const rows = arr.map((r) =>
    Object.fromEntries(headers.map((h) => [h, String(r[h] ?? '')]))
  )
  return { headers, rows }
}

// ── PDF (text-extractable) ────────────────────────────────────────────────────
async function parsePdf(buffer: Buffer): Promise<ParsedFile> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse')
    const data = await pdfParse(buffer)
    const lines = data.text.split('\n').map((l: string) => l.trim()).filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }
    // Heuristic: first non-empty line = header, split by 2+ spaces or tabs
    const splitLine = (line: string) => line.split(/\t|  +/).map((s: string) => s.trim()).filter(Boolean)
    const headers = splitLine(lines[0]!)
    const rows = lines.slice(1).map((line: string) => {
      const cells = splitLine(line)
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
    })
    return { headers, rows }
  } catch {
    return { headers: ['text'], rows: [{ text: 'PDF extraction failed or no text layer' }] }
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function parseFile(
  buffer: Buffer,
  filename: string,
  opts: ParseOptions = {},
): Promise<ParsedFile> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'csv':  return parseCsv(buffer, opts)
    case 'xlsx':
    case 'xls':  return parseXlsx(buffer, opts)
    case 'xml':  return parseXml(buffer)
    case 'json': return parseJson(buffer)
    case 'pdf':  return parsePdf(buffer)
    default:
      throw new Error(`Unsupported file format: .${ext}`)
  }
}

// ── Streaming row emitter (for /api/import/stream) ────────────────────────────
// Parses the full file and yields rows in batches via an async generator.
export async function* streamRows(
  buffer: Buffer,
  filename: string,
  opts: ParseOptions = {},
  batchSize = 100,
): AsyncGenerator<Record<string, string>[]> {
  const { rows } = await parseFile(buffer, filename, opts)
  for (let i = 0; i < rows.length; i += batchSize) {
    yield rows.slice(i, i + batchSize)
  }
}
