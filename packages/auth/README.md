# @kantr/auth

Authentication primitives for Kantr. No login UI — this package is pure logic
consumed by Next.js route handlers and server actions.

## What's included

| Module | Purpose |
|---|---|
| `password` | Argon2id hash / verify via oslo |
| `session` | Opaque token generation, expiry, rolling refresh |
| `cookies` | Set-Cookie serialisation and option helpers |

## Usage

```ts
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  isSessionValid,
  shouldRefreshSession,
  sessionCookieOptions,
  clearSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@kantr/auth'

// Hashing a password on signup
const hash = await hashPassword(plainText)

// Verifying on sign-in
const ok = await verifyPassword(plainText, storedHash)

// Creating a new session
const { token, expiresAt } = generateSessionToken()
// → store token + expiresAt + userId in platform.sessions (Phase 9)

// Cookie (Next.js App Router)
import { cookies } from 'next/headers'
const cookieStore = await cookies()
cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt))

// Rolling refresh — call on authenticated requests
const newExpiry = shouldRefreshSession(session.expiresAt)
if (newExpiry) {
  // update DB row + re-set cookie
}

// Sign-out
cookieStore.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions())
```

## Security notes

- Argon2id parameters: 64 MiB memory, 3 iterations, 1 thread — OWASP minimum for
  interactive logins on 2024-era hardware.
- Session tokens are 40-char alphanumeric (≈238 bits entropy) from
  `oslo/crypto`, which uses the platform CSPRNG.
- Cookies are `HttpOnly; Secure; SameSite=Lax` by default. Set `secure=false`
  only in local http development.
- Tokens are stored opaque in the DB — no JWT, no server-side signature to
  maintain. Revocation is an O(1) DELETE.

## Roadmap

The session schema (`platform.sessions`) ships in Phase 9 (`packages/db`
migration) alongside the sign-in/sign-up route handlers in `apps/web`.
