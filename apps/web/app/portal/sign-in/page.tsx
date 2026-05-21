import SignInForm from './SignInForm'

export default function PortalSignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--s-5)',
    }}>
      <div style={{
        width: 400,
        maxWidth: '95vw',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--s-6)',
        boxShadow: 'var(--shadow-md)',
      }}>
        <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: '0 0 8px' }}>
          Portal Pelanggan
        </h1>
        <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '0 0 24px' }}>
          Masukkan alamat email Anda — kami akan mengirim tautan masuk yang aman.
        </p>
        <SignInForm />
      </div>
    </div>
  )
}
