import { hash, verify } from '@node-rs/argon2'

// `algorithm: 2` = Argon2id. Using the literal avoids importing the ambient
// const enum from @node-rs/argon2, which trips Next.js isolatedModules.
const OPTIONS = {
  // OWASP minimums for interactive logins on 2024-era hardware.
  algorithm: 2,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
} as const

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS)
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return verify(stored, plain)
}
