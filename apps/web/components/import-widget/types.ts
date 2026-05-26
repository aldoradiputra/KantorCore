// Re-export from the lib types so UI components don't reach into lib/
export type { TargetSchema, TargetField, FieldMapping, DuplicateStrategy, ErrorStrategy, MatchType, DryRunResult, RowError, StreamEvent, AnalyzeResult, ImportConfig } from '../../lib/import/types'

export type WizardStep = 'idle' | 'config' | 'mapping' | 'dry_run' | 'streaming' | 'done'

export interface ImportWizardProps {
  /** JSON schema describing the import target */
  targetSchema: import('../../lib/import/types').TargetSchema
  /** Called with validated row array on successful import */
  onComplete: (rows: Record<string, unknown>[]) => void
  /** Optional label shown in the wizard header */
  title?: string
}
