export const SESSION_COOKIE_NAME = 'kantr_session'

export interface CookieOptions {
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  path: string
  httpOnly: boolean
  maxAge?: number
}

/** Returns cookie attributes for setting a session cookie. */
export function sessionCookieOptions(expiresAt: Date, secure = true): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  }
}

/** Returns cookie attributes for clearing a session cookie. */
export function clearSessionCookieOptions(secure = true): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }
}

/**
 * Serialises a Set-Cookie header value from name, value, and options.
 * Use this in plain Node.js request handlers; Next.js App Router can use
 * `cookies().set()` directly with the options object.
 */
export function serializeSetCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const parts: string[] = [`${name}=${value}`]
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  parts.push(`SameSite=${options.sameSite}`)
  parts.push(`Path=${options.path}`)
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  return parts.join('; ')
}
