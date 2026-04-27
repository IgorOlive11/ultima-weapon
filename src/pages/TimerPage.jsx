import React, { useState, useEffect, useRef } from 'react'
import DoomFace from '../components/DoomFace'
import { SET_TYPES, SET_TYPE_DESCRIPTIONS, GER_CONFIG } from '../data/protocol'
import styles from './TimerPage.module.css'

const PRESETS = [
  { label: '2:00', secs: 120 },
  { label: '1:30', secs: 90 },
  { label: '1:00', secs: 60 },
  { label: '0:20', secs: 20 },
]

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function useWakeLock() {
  const wakeLock = useRef(null)
  const acquire = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLock.current = await navigator.wakeLock.request('screen')
      }
    } catch (_) {}
  }
  const release = () => {
    wakeLock.current?.release()
    wakeLock.current = null
  }
  return { acquire, release }
}

export default function TimerPage() {
  const [preset, setPreset] = useState(120)
  const [seconds, setSeconds] = useState(120)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef(null)
  const { acquire, release } = useWakeLock()

  const progress = 1 - seconds / preset

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const start = async () => {
    await acquire()
    setFinished(false)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          setFinished(true)
          release()
          // Vibrate
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const pause = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    release()
  }

  const reset = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setFinished(false)
    setSeconds(preset)
    release()
  }

  const changePreset = (secs) => {
    reset()
    setPreset(secs)
    setSeconds(secs)
  }

  const displayColor = finished
    ? '#ff3333'
    : seconds <= 10
    ? '#ff3333'
    : seconds <= 30
    ? '#ffaa00'
    : '#39FF14'

  const circumference = 2 * Math.PI * 90
  const dashOffset = circumference * (1 - progress)

  return (
    <div className={styles.container}>
      {/* Timer ring */}
      <div className={styles.timerSection}>
        <div className={styles.label}>DESCANSO ENTRE SÉRIES</div>
        <div className={styles.ring}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            {/* Track */}
            <circle cx="110" cy="110" r="90" fill="none" stroke="#222" strokeWidth="6" />
            {/* Progress */}
            <circle
              cx="110" cy="110" r="90"
              fill="none"
              stroke={displayColor}
              strokeWidth="6"
              strokeLinecap="butt"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 110 110)"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <div className={styles.timerInner}>
            <div className={styles.timerDisplay} style={{ color: displayColor }}>
              {finished ? 'GO!' : fmt(seconds)}
            </div>
            {finished && <div className={styles.timerSub}>DESCANSOU</div>}
          </div>
        </div>

        {/* Presets */}
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.secs}
              className={`${styles.preset} ${preset === p.secs ? styles.presetActive : ''}`}
              onClick={() => changePreset(p.secs)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.resetBtn} onClick={reset}>RESET</button>
          {running ? (
            <button className={styles.mainBtn} onClick={pause}>PAUSAR</button>
          ) : (
            <button className={styles.mainBtn} onClick={start}>
              {seconds === preset ? 'INICIAR' : 'RETOMAR'}
            </button>
          )}
        </div>
      </div>

      {/* Series legend */}
      <div className={styles.legendSection}>
        <div className={styles.legendTitle}>TIPOS DE SÉRIE</div>
        {Object.entries(SET_TYPES).map(([key, val]) => (
          <div key={key} className={styles.legendItem}>
            <DoomFace ger={val.ger} size={36} />
            <div className={styles.legendInfo}>
              <div className={styles.legendLabel} style={{ color: val.color }}>
                {val.label}
              </div>
              <div className={styles.legendDesc}>{SET_TYPE_DESCRIPTIONS[key]}</div>
            </div>
          </div>
        ))}

        {/* GER scale */}
        <div className={styles.legendTitle} style={{ marginTop: 24 }}>ESCALA GER</div>
        {Object.entries(GER_CONFIG).map(([ger, conf]) => (
          <div key={ger} className={styles.gerItem}>
            <DoomFace ger={Number(ger)} size={32} />
            <div>
              <div className={styles.gerItemLabel}>{conf.label} — {conf.title}</div>
              <div className={styles.gerItemSub}>{conf.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
