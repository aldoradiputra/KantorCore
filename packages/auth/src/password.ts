import { Argon2id } from 'oslo/password'

const argon2id = new Argon2id({
  // OWASP minimums for interactive logins on 2024-era hardware.
  memorySize: 65536, // 64 MiB
  iterations: 3,
  parallelism: 1,
  tagLength: 32,
})

export async function hashPassword(plain: string): Promise<string> {
  return argon2id.hash(plain)
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return argon2id.verify(stored, plain)
}
