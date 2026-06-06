import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Dashboard() {
  const [rooms, setRooms] = useState([])
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('create')
  const navigate = useNavigate()

  useEffect(() => { fetchRooms() }, [])

  async function fetchRooms() {
    const res = await api.get('/rooms/my')
    setRooms(res.data)
  }

  async function createRoom() {
    if (!roomName.trim()) return
    await api.post('/rooms/create', { name: roomName })
    setRoomName('')
    fetchRooms()
  }

  async function joinRoom() {
    if (!joinCode.trim()) return
    try {
      await api.post('/rooms/join', { code: joinCode.toUpperCase() })
      setJoinCode('')
      setError('')
      fetchRooms()
    } catch {
      setError('room not found — check the code')
    }
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const colors = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', '#f59e0b', '#ec4899']

  return (
    <div style={styles.page}>
      <div style={styles.grid} />

      <div style={styles.sidebar}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>CS</div>
          <span style={styles.logoText}>collabspace</span>
        </div>

        <div style={styles.sideSection}>
          <p style={styles.sideLabel}>new room</p>
          <div style={styles.tabRow}>
            <button style={{ ...styles.tabBtn, ...(tab === 'create' ? styles.tabBtnActive : {}) }} onClick={() => setTab('create')}>create</button>
            <button style={{ ...styles.tabBtn, ...(tab === 'join' ? styles.tabBtnActive : {}) }} onClick={() => setTab('join')}>join</button>
          </div>

          {tab === 'create' ? (
            <div style={styles.inputRow}>
              <input style={styles.input} value={roomName} onChange={e => setRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createRoom()} placeholder="room name..." />
              <button style={styles.actionBtn} onClick={createRoom}>+</button>
            </div>
          ) : (
            <div style={styles.inputCol}>
              <input style={styles.input} value={joinCode} onChange={e => setJoinCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinRoom()} placeholder="6-char code..." maxLength={6} />
              {error && <p style={styles.error}>⚠ {error}</p>}
              <button style={{ ...styles.actionBtn, width: '100%', justifyContent: 'center', padding: '10px' }} onClick={joinRoom}>join room</button>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button style={styles.logoutBtn} onClick={logout}>← sign out</button>
      </div>

      <div style={styles.main}>
        <div style={styles.mainHeader}>
          <h1 style={styles.mainTitle}>your rooms</h1>
          <span style={styles.roomCount}>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
        </div>

        {rooms.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>◈</div>
            <p style={styles.emptyText}>no rooms yet</p>
            <p style={styles.emptySub}>create one or join with a code</p>
          </div>
        ) : (
          <div style={styles.grid2}>
            {rooms.map((room, i) => (
              <div key={room.id} style={styles.roomCard} onClick={() => navigate(`/room/${room.id}`)}>
                <div style={{ ...styles.roomAccent, background: colors[i % colors.length] }} />
                <div style={styles.roomBody}>
                  <p style={styles.roomName}>{room.name}</p>
                  <p style={styles.roomCode}>{room.code}</p>
                </div>
                <div style={styles.roomArrow}>→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' },
  grid: { position: 'absolute', inset: 0, backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`, backgroundSize: '60px 60px', opacity: 0.5 },
  sidebar: { position: 'relative', width: 260, minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24, zIndex: 1 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  logo: { width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', letterSpacing: 1 },
  logoText: { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: 1 },
  sideSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  sideLabel: { fontSize: 11, color: 'var(--text-dim)', letterSpacing: 2, textTransform: 'uppercase' },
  tabRow: { display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: 3 },
  tabBtn: { flex: 1, padding: '7px 0', fontSize: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s' },
  tabBtnActive: { background: 'var(--border-hover)', color: 'var(--text)' },
  inputRow: { display: 'flex', gap: 8 },
  inputCol: { display: 'flex', flexDirection: 'column', gap: 8 },
  input: { flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' },
  actionBtn: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 },
  error: { fontSize: 12, color: 'var(--danger)', background: '#f8717112', border: '1px solid #f8717128', borderRadius: 6, padding: '6px 10px' },
  logoutBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' },
  main: { flex: 1, position: 'relative', padding: '40px 48px', zIndex: 1 },
  mainHeader: { display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 32 },
  mainTitle: { fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 },
  roomCount: { fontSize: 13, color: 'var(--text-dim)' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, opacity: 0.5 },
  emptyIcon: { fontSize: 48, color: 'var(--text-dim)' },
  emptyText: { fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text-muted)' },
  emptySub: { fontSize: 13, color: 'var(--text-dim)' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  roomCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'border-color 0.15s, transform 0.1s', position: 'relative' },
  roomAccent: { width: 4, alignSelf: 'stretch', flexShrink: 0 },
  roomBody: { flex: 1, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  roomName: { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' },
  roomCode: { fontSize: 11, color: 'var(--text-dim)', letterSpacing: 2 },
  roomArrow: { padding: '0 16px', color: 'var(--text-dim)', fontSize: 16 },
}
