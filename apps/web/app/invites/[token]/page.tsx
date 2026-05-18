import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getInviteByToken } from '../../../lib/settings'
import { getCurrentTenant } from '../../../lib/tenants'
import AcceptInviteForm from './AcceptInviteForm'

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invite = await getInviteByToken(token)

  if (!invite) {
    return <ErrorPage message="Undangan tidak ditemukan atau sudah kedaluwarsa." />
  }
  if (invite.acceptedAt) {
    return <ErrorPage message="Undangan ini sudah digunakan." />
  }
  if (invite.expiresAt < new Date()) {
    return <ErrorPage message="Undangan sudah kedaluwarsa. Minta undangan baru dari admin workspace." />
  }

  const session = await getCurrentSession()

  // If the user is already signed in, check if they're already a member.
  if (session) {
    const ctx = await getCurrentTenant(session.user.id)
    if (ctx?.tenant.id === invite.tenantId) {
      redirect('/')
    }
    // Different email? Show the form so we handle the edge case cleanly.
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 'var(--s-5)' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 'var(--s-6)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
        <span style={{ font: '800 15px/1 var(--font-sans)', color: 'var(--navy)', letterSpacing: '-0.3px', display: 'block', marginBottom: 'var(--s-5)' }}>
          Kantr
        </span>
        <h2 style={{ marginBottom: 'var(--s-2)' }}>Anda diundang</h2>
        <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 'var(--s-5)' }}>
          Bergabung sebagai <strong style={{ color: 'var(--fg-1)' }}>{invite.role}</strong> untuk workspace ini.
          Undangan berlaku untuk <strong style={{ color: 'var(--fg-1)' }}>{invite.email}</strong>.
        </p>

        {session ? (
          // Already signed in — just accept.
          <AcceptInviteForm token={token} mode="accept-only" userEmail={session.user.email} />
        ) : (
          // Not signed in — redirect to sign-up with token pre-filled.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <Link
              href={`/sign-up?invite=${token}&email=${encodeURIComponent(invite.email)}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38, background: 'var(--indigo)', color: 'var(--white)', borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', textDecoration: 'none' }}
            >
              Buat akun & bergabung
            </Link>
            <Link
              href={`/sign-in?invite=${token}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg-2)', borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)', textDecoration: 'none' }}
            >
              Sudah punya akun? Masuk
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 'var(--s-5)' }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 'var(--s-3)' }}>Undangan tidak valid</h2>
        <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 'var(--s-5)' }}>{message}</p>
        <Link href="/" style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
          Kembali ke beranda
        </Link>
      </div>
    </div>
  )
}
