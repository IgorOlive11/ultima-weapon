import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LuBug, LuX, LuCamera, LuLoaderCircle, LuCircleCheck, LuCircleAlert } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { supabase } from '../lib/supabase'
import { getRecentErrors } from '../utils/errorBuffer'

const TYPES = [
  { id: 'bug',      label: 'BUG' },
  { id: 'melhoria', label: 'MELHORIA' },
]

const BTN_SIZE = 36
const DRAG_THRESHOLD = 6

function clampPos(x, y) {
  const maxX = Math.max(window.innerWidth - BTN_SIZE, 0)
  const maxY = Math.max(window.innerHeight - BTN_SIZE, 0)
  return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) }
}

async function captureScreenshot() {
  const target = document.querySelector('.scanlines') || document.body
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(target, { backgroundColor: '#080808', scale: Math.min(window.devicePixelRatio || 1, 1.5) })
  return canvas.toDataURL('image/png', 0.8)
}

function buildContext(route, store) {
  const { currentWeek, currentDay, userProtocol, activeWorkout } = store
  const day = userProtocol?.weeks?.[currentWeek]?.days?.[currentDay]
  return {
    route,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform ?? navigator.platform,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    consoleErrors: getRecentErrors(),
    storeSlice: {
      currentWeek,
      currentDay,
      activeWorkout,
      currentDay_exercises: day?.exercises?.map(e => ({
        name: e.name, muscle: e.muscle, accessoryMuscle: e.accessoryMuscle, setsCount: e.sets?.length ?? 0,
      })) ?? [],
    },
  }
}

export default function AdminFeedbackButton() {
  const authUser = useStore(s => s.authUser)
  const enabled  = useStore(s => s.adminFeedbackButtonEnabled)
  const savedPos = useStore(s => s.adminFeedbackButtonPos)
  const setSavedPos = useStore(s => s.setAdminFeedbackButtonPos)
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('bug')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  const [pos, setPos] = useState(savedPos)
  const [dragging, setDragging] = useState(false)
  const movedRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  useEffect(() => {
    const onResize = () => setPos(p => p ? clampPos(p.x, p.y) : p)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (authUser?.role !== 'admin' || !enabled) return null

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: rect.left, posY: rect.top }
    movedRef.current = false
    setDragging(true)
  }

  const handlePointerMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (!movedRef.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      movedRef.current = true
    }
    if (!movedRef.current) return
    setPos(clampPos(dragStartRef.current.posX + dx, dragStartRef.current.posY + dy))
  }

  const handlePointerUp = () => {
    setDragging(false)
    if (movedRef.current) {
      setPos(current => { setSavedPos(current); return current })
    }
  }

  const handleClick = (e) => {
    if (movedRef.current) {
      movedRef.current = false
      e.preventDefault()
      return
    }
    setOpen(true)
  }

  const reset = () => {
    setOpen(false)
    setType('bug')
    setDescription('')
    setScreenshot(null)
    setStatus('idle')
  }

  const handleCapture = async () => {
    setCapturing(true)
    try {
      setOpen(false)
      await new Promise(r => setTimeout(r, 250))
      const dataUrl = await captureScreenshot()
      setScreenshot(dataUrl)
    } catch (err) {
      console.error('[feedback] captura de tela falhou:', err)
    } finally {
      setOpen(true)
      setCapturing(false)
    }
  }

  const handleSend = async () => {
    if (!description.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('sem sessão ativa')

      const context = buildContext(location.pathname, useStore.getState())
      const res = await fetch(`${supabase.supabaseUrl}/functions/v1/send-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, description, context, screenshot }),
      })
      if (!res.ok) throw new Error(await res.text().catch(() => 'falha no envio'))
      setStatus('sent')
      setTimeout(reset, 1500)
    } catch (err) {
      console.error('[feedback] envio falhou:', err)
      setStatus('error')
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          ...(pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : {}),
          touchAction: 'none',
        }}
        className={`fixed z-[220] w-9 h-9 flex items-center justify-center rounded-full bg-s1/80 border select-none transition-colors backdrop-blur-sm ${
          pos ? '' : 'bottom-24 right-3'
        } ${
          dragging ? 'cursor-grabbing border-neon/60 text-neon scale-110' : 'cursor-grab border-border2 text-muted/60 hover:text-neon hover:border-neon/40'
        }`}
        title="Reportar bug ou melhoria (clique e segure para arrastar)"
      >
        <LuBug size={15} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[500] bg-black/85 flex items-end justify-center"
          onClick={reset}
        >
          <div
            className="w-full max-w-[430px] max-h-[85vh] overflow-y-auto bg-s1 border-t border-border1 p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-lg tracking-[0.15em] text-neon">REPORTAR</div>
              <button onClick={reset} className="text-muted hover:text-ink transition-colors">
                <LuX size={18} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex-1 py-2 font-display text-xs tracking-[0.15em] border transition-colors ${
                    type === t.id ? 'border-neon text-neon bg-neon/5' : 'border-border2 text-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o problema ou a ideia..."
              rows={4}
              className="w-full bg-s2 border border-border2 text-ink px-3 py-2.5 font-mono text-sm outline-none focus:border-neon transition-colors resize-none mb-3"
            />

            <button
              onClick={handleCapture}
              disabled={capturing}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 font-mono text-[11px] tracking-widest border border-border2 text-muted hover:text-ink hover:border-neon/40 transition-colors disabled:opacity-50"
            >
              {capturing ? <LuLoaderCircle size={14} className="animate-spin" /> : <LuCamera size={14} />}
              {screenshot ? 'REFAZER CAPTURA DE TELA' : 'CAPTURAR TELA (OPCIONAL)'}
            </button>

            {screenshot && (
              <div className="relative mb-3">
                <img src={screenshot} alt="preview" className="w-full border border-border2" />
                <button
                  onClick={() => setScreenshot(null)}
                  className="absolute top-1.5 right-1.5 bg-black/70 text-white p-1 rounded-full"
                >
                  <LuX size={12} />
                </button>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!description.trim() || status === 'sending'}
              className="w-full py-3 font-display text-sm tracking-[0.15em] bg-neon text-bg disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {status === 'sending' && <><LuLoaderCircle size={16} className="animate-spin" /> ENVIANDO...</>}
              {status === 'sent'    && <><LuCircleCheck size={16} /> ENVIADO!</>}
              {status === 'error'   && <><LuCircleAlert size={16} /> FALHOU — TENTAR DE NOVO</>}
              {status === 'idle'    && 'ENVIAR'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
