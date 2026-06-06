import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

function getCurrentUserId() {
  try {
    const token = localStorage.getItem('token')
    return JSON.parse(atob(token.split('.')[1])).sub
  } catch {
    return null
  }
}

function drawStrokes(canvas, strokes) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  strokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = stroke.color || '#fff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    stroke.points.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.stroke()
  })
}

export default function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('text')
  const [text, setText] = useState('')
  const [users, setUsers] = useState({})
  const [typingUsers, setTypingUsers] = useState([])
  const [connected, setConnected] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#ffffff')
  const wsRef = useRef(null)
  const canvasRef = useRef(null)
  const typingTimeout = useRef(null)
  const strokesRef = useRef([])
  const currentStrokeRef = useRef([])
  const currentUserId = getCurrentUserId()

  const sendWS = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get(`/documents/${roomId}`).then(res => {
      if (cancelled) return
      setText(res.data.text_content || '')
      strokesRef.current = res.data.canvas_content || []
      setTimeout(() => drawStrokes(canvasRef.current, strokesRef.current), 0)
    })
    return () => { cancelled = true }
  }, [roomId])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const ws = new WebSocket(`ws://localhost:8000/documents/ws/${roomId}?token=${token}`)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.sender_id && String(msg.sender_id) === String(currentUserId)) return
      if (msg.type === 'text_edit') setText(msg.content)
      if (msg.type === 'canvas_edit') {
        strokesRef.current = msg.content
        if (canvasRef.current) drawStrokes(canvasRef.current, strokesRef.current)
      }
      if (msg.type === 'presence') setUsers(msg.users)
      if (msg.type === 'typing') {
        setTypingUsers(prev =>
          msg.is_typing ? [...new Set([...prev, msg.user])] : prev.filter(u => u !== msg.user)
        )
      }
    }
    return () => ws.close()
  }, [roomId, currentUserId])

  useEffect(() => {
    if (tab === 'canvas') {
      setTimeout(() => drawStrokes(canvasRef.current, strokesRef.current), 0)
    }
  }, [tab])

  function handleTextChange(e) {
    setText(e.target.value)
    sendWS({ type: 'text_edit', content: e.target.value })
    sendWS({ type: 'typing', is_typing: true })
    clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => sendWS({ type: 'typing', is_typing: false }), 1500)
  }

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e) {
    setIsDrawing(true)
    currentStrokeRef.current = [getPos(e)]
  }

  function draw(e) {
    if (!isDrawing) return
    const pos = getPos(e)
    currentStrokeRef.current.push(pos)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pts = currentStrokeRef.current
    if (pts.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  function endDraw() {
    if (!isDrawing) return
    setIsDrawing(false)
    const newStroke = { points: currentStrokeRef.current, color }
    strokesRef.current = [...strokesRef.current, newStroke]
    currentStrokeRef.current = []
    sendWS({ type: 'canvas_edit', content: strokesRef.current })
  }

  function clearCanvas() {
    strokesRef.current = []
    drawStrokes(canvasRef.current, [])
    sendWS({ type: 'canvas_edit', content: [] })
  }

  const onlineUsers = Object.values(users)
  const colors = ['var(--accent)', 'var(--accent2)', 'var(--accent3)', '#f59e0b']

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>←</button>
          <div style={styles.logo}>CS</div>
          <span style={styles.roomLabel}>Room {roomId}</span>
        </div>

        <div style={styles.headerCenter}>
          <button style={{ ...styles.tabBtn, ...(tab === 'text' ? styles.tabActive : {}) }} onClick={() => setTab('text')}>
            ¶ editor
          </button>
          <button style={{ ...styles.tabBtn, ...(tab === 'canvas' ? styles.tabActive : {}) }} onClick={() => setTab('canvas')}>
            ◎ whiteboard
          </button>
        </div>

        <div style={styles.headerRight}>
          {typingUsers.length > 0 && (
            <span style={styles.typing}>{typingUsers.join(', ')} typing...</span>
          )}
          <div style={styles.users}>
            {onlineUsers.map((u, i) => (
              <div key={u} style={{ ...styles.avatar, background: colors[i % colors.length], zIndex: onlineUsers.length - i }} title={u}>
                {u[0].toUpperCase()}
              </div>
            ))}
          </div>
          <div style={styles.statusDot(connected)} title={connected ? 'connected' : 'disconnected'} />
        </div>
      </header>

      <main style={styles.main}>
        {tab === 'text' && (
          <textarea
            style={styles.textarea}
            value={text}
            onChange={handleTextChange}
            placeholder="// start typing — others see changes in real time"
            spellCheck={false}
          />
        )}

        {tab === 'canvas' && (
          <div style={styles.canvasWrap}>
            <div style={styles.toolbar}>
              <div style={styles.colorPicker}>
                {['#ffffff', '#7c6aff', '#ff6a6a', '#6affd4', '#f59e0b', '#ec4899', '#000000'].map(c => (
                  <button
                    key={c}
                    style={{ ...styles.colorBtn, background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                    onClick={() => setColor(c)}
                  />
                ))}
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={styles.colorInput} title="custom color" />
              </div>
              <button style={styles.clearBtn} onClick={clearCanvas}>clear board</button>
            </div>
            <canvas
              ref={canvasRef}
              width={window.innerWidth - 2}
              height={window.innerHeight - 120}
              style={styles.canvas}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, gap: 16 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1 },
  backBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer' },
  logo: { width: 28, height: 28, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', letterSpacing: 1, flexShrink: 0 },
  roomLabel: { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: 0.5 },
  headerCenter: { display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 8, padding: 3 },
  tabBtn: { padding: '5px 14px', fontSize: 12, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s', letterSpacing: 0.5 },
  tabActive: { background: 'var(--border-hover)', color: 'var(--text)' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' },
  typing: { fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', animation: 'pulse 1.5s infinite' },
  users: { display: 'flex', flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', border: '2px solid var(--surface)', marginLeft: -6, fontFamily: 'Syne, sans-serif' },
  statusDot: (connected) => ({ width: 8, height: 8, borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--danger)', boxShadow: connected ? '0 0 6px var(--success)' : 'none', transition: 'all 0.3s' }),
  main: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  textarea: { flex: 1, width: '100%', height: '100%', background: 'var(--bg)', border: 'none', outline: 'none', resize: 'none', color: 'var(--text)', fontSize: 14, lineHeight: 1.7, padding: '32px 48px', fontFamily: 'DM Mono, monospace', caretColor: 'var(--accent)' },
  canvasWrap: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  colorPicker: { display: 'flex', gap: 6, alignItems: 'center' },
  colorBtn: { width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'transform 0.1s', flexShrink: 0 },
  colorInput: { width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'none', outline: 'none' },
  clearBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' },
  canvas: { display: 'block', background: '#0d0d14', cursor: 'crosshair', flex: 1 },
}
