export function formatIDR(minor: number): string {
  return 'Rp ' + (minor / 100).toLocaleString('id-ID', { minimumFractionDigits: 0 })
}
