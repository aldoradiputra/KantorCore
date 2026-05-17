import { Argon2id } from 'oslo/password'

const argon2id = new Argon2id({
  memorySize: 65536, // 64 MiB
  iterations: 3,
  parallelism: 1,
  tagLength: 32,
})

export async function hashPassword(plain: string): Promise<string> {
  return argon2id.hash(plain)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return argon2id.verify(hash, plain)
}
