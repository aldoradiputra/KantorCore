import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const ALGO = 'aes-256-gcm'

function key(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY
  if (!secret) throw new Error('APP_ENCRYPTION_KEY is not set')
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted payload')
  const [, ivB64, tagB64, encB64] = parts
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()])
  return dec.toString('utf8')
}
