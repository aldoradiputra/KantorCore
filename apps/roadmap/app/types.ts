export type Node = {
  id: string
  label: string
  description: string
  type: 'root' | 'module' | 'app' | 'feature' | 'infrastructure'
  status: 'planned' | 'in-progress' | 'done'
  phase: number
  parent?: string
  code?: string
  milestone?: string
  x?: number
  y?: number
}
