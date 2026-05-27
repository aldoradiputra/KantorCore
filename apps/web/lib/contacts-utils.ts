// Pure client-safe utilities for contacts — no server-only imports.

export interface IndonesianAddressInput {
  line1?: string | null; line2?: string | null
  rt?: string | null; rw?: string | null
  kelurahan?: string | null; kecamatan?: string | null
  kota?: string | null; provinsi?: string | null; kodePos?: string | null
}

export function formatIndonesianAddress(addr: IndonesianAddressInput): string {
  const parts: string[] = []
  if (addr.line1) parts.push(addr.line1)
  if (addr.line2) parts.push(addr.line2)
  if (addr.rt || addr.rw) {
    const rt = (addr.rt ?? '').padStart(3, '0')
    const rw = (addr.rw ?? '').padStart(3, '0')
    parts.push(`RT ${rt}/RW ${rw}`)
  }
  if (addr.kelurahan) parts.push(`Kel. ${addr.kelurahan}`)
  if (addr.kecamatan) parts.push(`Kec. ${addr.kecamatan}`)
  const cityLine = [addr.kota, addr.kodePos].filter(Boolean).join(' ')
  if (cityLine) parts.push(cityLine)
  if (addr.provinsi) parts.push(addr.provinsi.toUpperCase())
  return parts.join(', ')
}
