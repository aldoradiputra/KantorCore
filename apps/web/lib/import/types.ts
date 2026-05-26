export interface TargetField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
  regex?: string
}

export interface TargetSchema {
  fields: TargetField[]
}

export type DuplicateStrategy = 'skip' | 'overwrite' | 'merge'
export type ErrorStrategy = 'abort' | 'skip_row' | 'partial_split'
export type MatchType = 'exact' | 'ai' | 'manual' | 'none'

export interface FieldMapping {
  sourceHeader: string
  targetField: string | null
  confidence?: number
  matchType: MatchType
}

export interface ImportConfig {
  encoding?: string
  delimiter?: string      // for CSV: ',', ';', '\t', '|'
  dateFormat?: string     // e.g. 'DD/MM/YYYY'
  sheetIndex?: number     // for xlsx
}

export interface ImportOptions {
  targetSchema: TargetSchema
  mappings: FieldMapping[]
  duplicateStrategy: DuplicateStrategy
  errorStrategy: ErrorStrategy
  config: ImportConfig
}

export interface RowError {
  row: number
  field: string
  value: string
  message: string
}

export interface DryRunResult {
  headers: string[]
  preview: Record<string, string>[]    // first 50 rows, raw strings
  errors: RowError[]
  validCount: number
  invalidCount: number
}

export interface StreamEvent {
  processed: number
  errors: number
  total?: number
  done?: boolean
  errorLog?: RowError[]
}

export interface AnalyzeResult {
  headers: string[]
  sampleRows: string[][]
  mappings: FieldMapping[]
  sheets?: string[]            // xlsx only
}
