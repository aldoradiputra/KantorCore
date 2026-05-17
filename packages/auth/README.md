# @kantr/auth

Authentication primitives for Kantr. Two surfaces:

| Subpath | Safe in | Contents |
|---|---|---|
| `@kantr/auth` | Anywhere (client or server) | Pure functions: password hashing, token generation, cookie serialisation. No DB. |
| `@kantr/auth/server` | Server only | DB-backed session lifecycle: `createSession`, `validateSessionToken`, `invalidateSession`, `invalidateAllUserSessions`. Takes a `@kantr/db` `Database` instance. |

## Usage

```ts
import {
  hashPassword,
  verifyPassword,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@kantr/auth'
import {
  createSession,
  validateSessionToken,
  invalidateSession,
} from '@kantr/auth/server'

// Sign-up
const hash = await hashPassword(plainText)
const [user] = await db.insert(users).values({ email, name, passwordHash: hash }).returning()
const session = await createSession(db, user.id)
cookieStore.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expiresAt))

// Authenticated request
const result = await validateSessionToken(db, cookieToken)
if (!result) return redirect('/sign-in')
const { user, session } = result
```

## Security parameters

- **Argon2id** — 64 MiB memory, 3 iterations, 1 thread, 32-byte tag. OWASP
  minimum for interactive logins on 2024-era hardware. Powered by the native
  `@node-rs/argon2` Rust binding.
- **Session tokens** — 32 bytes from `crypto.randomBytes`, base64url-encoded
  (43 chars, ~256 bits entropy). Opaque; the token itself is the primary key.
- **Cookies** — `HttpOnly; Secure; SameSite=Lax` by default. Pass `secure=false`
  only for local http development.
- **Rolling refresh** — `validateSessionToken` updates `expires_at` in place
  when the session has less than 1/3 of its lifetime remaining. Avoids a write
  on every request while keeping active sessions alive.

## Why not oslo / lucia / NextAuth?

- **Oslo** is the obvious choice but its `password` barrel unconditionally
  imports `@node-rs/bcrypt`, which webpack can't bundle through workspace
  packages. We use `@node-rs/argon2` directly — same underlying library oslo
  would have called.
- **Lucia** is deprecated upstream (the author migrated to oslo).
- **NextAuth/Auth.js** is heavy and OAuth-first; Kantr's primary login is
  email+password with MFA layered later.

## Roadmap

- Phase 10: `platform.memberships` (user ↔ tenant ↔ role)
- Phase 10: `/api/provision` tenant signup endpoint
- Phase 11: TOTP MFA, recovery codes
- Phase 12: SSO via Arctic (Google Workspace, Microsoft Entra)
