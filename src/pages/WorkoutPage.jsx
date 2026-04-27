import React from 'react'
import { PROTOCOL, DAY_NAMES } from '../data/protocol'
import { useStore } from '../hooks/useStore'
import ExerciseCard from '../components/ExerciseCard'
import styles from './WorkoutPage.module.css'

const PHASE_COLORS = {
  REVOLUME: '#39FF14',
  BASE:     '#ffaa00',
  PEAK:     '#ff3333',
  DEVOLUME: '#00aaff',
  DELOAD:   '#888888',
}

export default function WorkoutPage() {
  const currentWeek = useStore((s) => s.currentWeek)
  const currentDay  = useStore((s) => s.currentDay)
  const setWeek     = useStore((s) => s.setWeek)
  const setDay      = useStore((s) => s.setDay)
  const getLog      = useStore((s) => s.getLog)

  const week = PROTOCOL[currentWeek]
  const day  = week?.days[currentDay]
  const phaseColor = PHASE_COLORS[week?.phase] || '#39FF14'

  // Count how many exercises have been logged today
  const loggedCount = day?.exercises
    ? day.exercises.filter((_, i) => !!getLog(currentWeek, currentDay, i)?.kg).length
    : 0
  const total = day?.exercises?.length || 0

  return (
    <div className={styles.container}>
      {/* Week selector */}
      <div className={styles.weekRow}>
        {PROTOCOL.map((w, i) => (
          <button
            key={i}
            className={`${styles.weekChip} ${i === currentWeek ? styles.weekChipActive : ''}`}
            style={i === currentWeek ? { background: phaseColor, color: '#000', borderColor: phaseColor } : {}}
            onClick={() => setWeek(i)}
          >
            S{String(w.num).padStart(2, '0')}
          </button>
        ))}
      </div>

      {/* Day selector */}
      <div className={styles.dayRow}>
        {week.days.map((d, i) => (
          <button
            key={i}
            className={`${styles.dayChip} ${i === currentDay ? styles.dayChipActive : ''} ${d.rest ? styles.dayChipRest : ''}`}
            onClick={() => setDay(i)}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Phase / progress bar */}
      <div className={styles.phaseBanner} style={{ borderColor: phaseColor }}>
        <div className={styles.phaseLeft}>
          <span className={styles.phaseLabel} style={{ color: phaseColor }}>
            SEMANA {week.num} — {week.phase}
          </span>
          {!day?.rest && total > 0 && (
            <span className={styles.phaseProgress}>
              {loggedCount}/{total} exercícios
            </span>
          )}
        </div>
        {!day?.rest && total > 0 && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(loggedCount / total) * 100}%`, background: phaseColor }}
            />
          </div>
        )}
      </div>

      {/* Rest day */}
      {day?.rest && (
        <div className={styles.restDay}>
          <div className={styles.restTitle}>DESCANSO</div>
          <div className={styles.restSub}>RECUPERE-SE. CRESÇA.</div>
          <div className={styles.restSub} style={{ marginTop: 8, fontSize: 12 }}>
            "A hipertrofia acontece fora da academia."
          </div>
        </div>
      )}

      {/* Exercises */}
      {!day?.rest && day?.exercises && (
        <div className={styles.exerciseList}>
          {day.exercises.map((ex, i) => (
            <ExerciseCard
              key={i}
              exercise={ex}
              weekIdx={currentWeek}
              dayIdx={currentDay}
              exIdx={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
