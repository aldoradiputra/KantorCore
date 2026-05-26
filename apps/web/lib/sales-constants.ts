// Client-safe sales constants and pure functions — no server-only imports
export type SoStatus = 'quotation' | 'confirmed' | 'done' | 'cancelled'

export function formatSoNumber(
  template: string,
  prefix: string,
  seq: number,
  when: Date = new Date(),
): string {
  const year  = when.getFullYear()
  const month = String(when.getMonth() + 1).padStart(2, '0')
  return template
    .replace('{prefix}', prefix)
    .replace('{year}', String(year))
    .replace('{month}', month)
    .replace(/\{seq:0+\}/, (m) => {
      const width = m.length - 6
      return String(seq).padStart(width, '0')
    })
}
