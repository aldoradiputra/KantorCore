import { createHmac, createHash, randomBytes } from 'crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf: Buffer): string {
  let result = ''
  let bits = 0
  let value = 0
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += B32[(value >> bits) & 31]
    }
  }
  if (bits > 0) result += B32[(value << (5 - bits)) & 31]
  return result
}

function base32Decode(str: string): Buffer {
  const s = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const char of s) {
    const idx = B32.indexOf(char)
    if (idx < 0) throw new Error(`Invalid base32 character: ${char}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 0xff)
    }
  }
  return Buffer.from(bytes)
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = (hmac[19] ?? 0) & 0xf
  const code =
    ((((hmac[offset] ?? 0) & 0x7f) << 24) |
      (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
      (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
      ((hmac[offset + 3] ?? 0) & 0xff)) %
    1_000_000
  return code.toString().padStart(6, '0')
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

export function buildTotpUri(secret: string, email: string): string {
  const issuer = 'KantorCore'
  const label = encodeURIComponent(`${issuer}:${email}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

export function verifyTotp(secret: string, code: string, windowSteps = 1): boolean {
  const T = Math.floor(Date.now() / 1000 / 30)
  for (let i = -windowSteps; i <= windowSteps; i++) {
    if (hotp(secret, T + i) === code) return true
  }
  return false
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(5).toString('hex'))
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.toLowerCase()).digest('hex')
}

export function verifyAndConsumeBackupCode(
  inputCode: string,
  hashes: string[],
): { valid: boolean; remaining: string[] } {
  const h = hashBackupCode(inputCode)
  const idx = hashes.indexOf(h)
  if (idx < 0) return { valid: false, remaining: hashes }
  return { valid: true, remaining: hashes.filter((_, i) => i !== idx) }
}
