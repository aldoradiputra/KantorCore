// Client-safe timesheet utility functions — no server-only imports
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}j`
  return `${h}j ${m}m`
}

export function weekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function weekEnd(weekStartStr: string): string {
  const d = new Date(weekStartStr)
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}
