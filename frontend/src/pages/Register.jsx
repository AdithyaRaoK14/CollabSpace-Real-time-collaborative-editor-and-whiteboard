import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleRegister() {
    if (!username || !email || !password) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/register', { username, email, password })
      navigate('/login')
    } catch {
      setError('registration failed — username or email may already exist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.grid} />
      <div style={styles.glow} />

      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>CS</div>
          <span style={styles.logoText}>collabspace</span>
        </div>

        <div style={styles.heading}>
          <h1 style={styles.h1}>create account</h1>
          <p style={styles.sub}>start collaborating in real time</p>
        </div>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>username</label>
            <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" autoComplete="off" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>email</label>
            <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>password</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} placeholder="••••••••" />
          </div>
          {error && <p style={styles.error}>⚠ {error}</p>}
          <button style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }} onClick={handleRegister} disabled={loading}>
            {loading ? 'creating account...' : 'create account →'}
          </button>
        </div>

        <p style={styles.footer}>
          already have an account? <Link to="/login" style={styles.link}>sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'var(--bg)' },
  grid: { position: 'absolute', inset: 0, backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)' },
  glow: { position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, #ff6a6a18 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' },
  card: { position: 'relative', width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '40px 36px', backdropFilter: 'blur(20px)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  logo: { width: 36, height: 36, background: 'var(--accent2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', letterSpacing: 1 },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', letterSpacing: 1 },
  heading: { marginBottom: 28 },
  h1: { fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text-muted)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' },
  input: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%' },
  error: { fontSize: 12, color: 'var(--danger)', background: '#f8717112', border: '1px solid #f8717128', borderRadius: 6, padding: '8px 12px' },
  btn: { background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4, letterSpacing: 0.5 },
  footer: { marginTop: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' },
  link: { color: 'var(--accent)' },
}
