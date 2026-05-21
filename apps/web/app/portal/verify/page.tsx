import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { consumeMagicLink, PORTAL_COOKIE } from '../../../lib/portal-auth'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) {
    return <ErrorView reason="Tautan tidak valid." />
  }

  const result = await consumeMagicLink(token)
  if (!result) {
    return <ErrorView reason="Tautan tidak valid atau sudah kadaluarsa." />
  }

  const cookieStore = await cookies()
  cookieStore.set(PORTAL_COOKIE, result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/portal',
    maxAge: 30 * 24 * 60 * 60,
  })

  redirect('/portal/dashboard')
}

function ErrorView({ reason }: { reason: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s-5)',
    }}>
      <div style={{
        width: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--s-6)',
        textAlign: 'center',
      }}>
        <h1 style={{ font: '600 18px/1.2 var(--font-sans)', color: 'var(--danger)', margin: '0 0 12px' }}>
          Gagal Masuk
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', margin: '0 0 20px' }}>
          {reason}
        </p>
        <a
          href="/portal/sign-in"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'var(--indigo)',
            color: 'var(--white)',
            borderRadius: 'var(--r-sm)',
            font: '600 13px/1 var(--font-sans)',
            textDecoration: 'none',
          }}
        >
          Minta Tautan Baru
        </a>
      </div>
    </div>
  )
}
