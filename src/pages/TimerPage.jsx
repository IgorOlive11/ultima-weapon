import React, { useState, useEffect, useRef } from 'react'
import { LuPlay, LuPause, LuRotateCcw } from 'react-icons/lu'
import DoomFace from '../components/DoomFace'
import { SET_TYPES, SET_TYPE_DESCRIPTIONS, GER_CONFIG } from '../data/protocol'

const PRESETS = [
  { label: '2:00', secs: 120 },
  { label: '1:30', secs: 90 },
  { label: '1:00', secs: 60 },
  { label: '0:20', secs: 20 },
]

const R = 90
const CIRC = 2 * Math.PI * R

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function TimerPage() {
  const [preset,  setPreset]  = useState(120)
  const [secs,    setSecs]    = useState(120)
  const [running, setRunning] = useState(false)
  const [done,    setDone]    = useState(false)
  const interval = useRef(null)

  const pct    = 1 - secs / preset
  const offset = CIRC * (1 - pct)
  const color  = done ? '#ff2d2d' : secs <= 10 ? '#ff2d2d' : secs <= 30 ? '#ffaa00' : '#39FF14'

  useEffect(() => () => clearInterval(interval.current), [])

  const start = () => {
    setDone(false)
    setRunning(true)
    interval.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(interval.current)
          setRunning(false)
          setDone(true)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const pause = () => {
    clearInterval(interval.current)
    setRunning(false)
  }

  const reset = () => {
    clearInterval(interval.current)
    setRunning(false)
    setDone(false)
    setSecs(preset)
  }

  const changePreset = (s) => {
    clearInterval(interval.current)
    setRunning(false)
    setDone(false)
    setPreset(s)
    setSecs(s)
  }

  return (
    <div className="p-4 pb-10 space-y-3">
      {/* Ring timer */}
      <div className="bg-s1 border border-border1 p-5 flex flex-col items-center">
        <div className="font-mono text-[9px] text-muted tracking-[0.25em] mb-4">
          DESCANSO ENTRE SÉRIES
        </div>

        {/* SVG Ring */}
        <div className="relative w-[200px] h-[200px] mb-5">
          <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#1e1e1e" strokeWidth="6" />
            <circle
              cx="100" cy="100" r={R}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="font-display text-[58px] leading-none tracking-widest transition-colors duration-300"
              style={{ color }}
            >
              {done ? 'GO!' : fmt(secs)}
            </div>
            <div className="font-mono text-[9px] text-muted tracking-[0.2em] mt-1">
              {done ? 'VAMOS!' : 'RESTANTE'}
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.secs}
              onClick={() => changePreset(p.secs)}
              className={`px-3.5 py-1.5 font-display text-sm tracking-wider border transition-all
                ${preset === p.secs
                  ? 'border-orange text-orange bg-orange/5'
                  : 'border-border2 bg-s2 text-muted hover:text-ink'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 w-full">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2
              bg-s2 border border-border2 text-muted font-display text-base tracking-wider py-3
              hover:text-ink transition-colors active:opacity-70"
          >
            <LuRotateCcw size={16} />
            RESET
          </button>
          <button
            onClick={running ? pause : start}
            className="flex-[2] flex items-center justify-center gap-2
              bg-neon text-bg font-display text-lg tracking-widest py-3
              transition-all active:opacity-80 active:scale-[0.99]"
          >
            {running
              ? <><LuPause size={18} />PAUSAR</>
              : <><LuPlay size={18} />{secs === preset ? 'INICIAR' : 'RETOMAR'}</>
            }
          </button>
        </div>
      </div>

      {/* Series legend */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          TIPOS DE SÉRIE
        </div>
        <div className="space-y-3">
          {Object.entries(SET_TYPES).map(([key, val]) => (
            <div key={key} className="flex items-start gap-3 pb-3 border-b border-border1 last:border-0 last:pb-0">
              <DoomFace ger={val.ger} size={32} />
              <div>
                <div className="font-mono text-[10px] font-bold tracking-widest mb-1" style={{ color: val.color }}>
                  {val.label}
                </div>
                <div className="font-body text-[12px] text-muted2 leading-snug">
                  {SET_TYPE_DESCRIPTIONS[key]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GER scale */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          ESCALA GER
        </div>
        <div className="space-y-2">
          {Object.entries(GER_CONFIG).map(([ger, conf]) => (
            <div key={ger} className="flex items-center gap-3 py-1.5 border-b border-border1 last:border-0">
              <DoomFace ger={Number(ger)} size={28} />
              <div>
                <div className="font-display text-[12px] text-ink tracking-wider leading-none">
                  {conf.label} — {conf.title}
                </div>
                <div className="font-mono text-[9px] text-muted mt-0.5">{conf.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
