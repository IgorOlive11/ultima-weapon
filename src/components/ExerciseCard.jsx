import React, { useState } from 'react'
import DoomFace from './DoomFace'
import { GER_CONFIG, SET_TYPES, SET_TYPE_DESCRIPTIONS } from '../data/protocol'
import { useStore } from '../hooks/useStore'
import styles from './ExerciseCard.module.css'

export default function ExerciseCard({ exercise, weekIdx, dayIdx, exIdx }) {
  const [open, setOpen] = useState(false)
  const [kg, setKg] = useState('')
  const [reps, setReps] = useState('')
  const [obs, setObs] = useState('')
  const [saved, setSaved] = useState(false)

  const saveLog = useStore((s) => s.saveLog)
  const getLog = useStore((s) => s.getLog)

  const log = getLog(weekIdx, dayIdx, exIdx)
  const setType = SET_TYPES[exercise.type] || SET_TYPES.NORMAL
  const gerConf = GER_CONFIG[exercise.ger] || GER_CONFIG[9]

  const handleOpen = () => {
    if (!open && log) {
      setKg(log.kg || '')
      setReps(log.reps || '')
      setObs(log.obs || '')
    }
    setOpen((v) => !v)
    setSaved(false)
  }

  const handleSave = () => {
    if (!kg && !reps) return
    saveLog(weekIdx, dayIdx, exIdx, { kg, reps, obs })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const typeColor = setType.color

  return (
    <div className={styles.card} style={{ '--type-color': typeColor }}>
      <button className={styles.header} onClick={handleOpen}>
        <DoomFace ger={exercise.ger} size={36} />
        <div className={styles.info}>
          <div className={styles.name}>{exercise.name}</div>
          <div className={styles.meta}>
            {exercise.sets}
            {exercise.reps ? ` · ${exercise.reps} reps` : ''}
            {' · '}
            <span className={styles.gerLabel}>GER {exercise.ger}</span>
          </div>
        </div>
        <div className={styles.gerBadge}>GER{exercise.ger}</div>
        {log?.kg && <div className={styles.loggedDot} title="Registrado" />}
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▾</span>
      </button>

      {open && (
        <div className={styles.body}>
          {/* Set type tag */}
          <div className={styles.typeTag}>
            <DoomFace ger={exercise.ger} size={20} />
            <div>
              <div className={styles.typeLabel}>{setType.label}</div>
              <div className={styles.typeDesc}>{SET_TYPE_DESCRIPTIONS[exercise.type]}</div>
            </div>
          </div>

          {/* GER description */}
          <div className={styles.gerInfo}>
            <span className={styles.gerInfoLabel}>{gerConf.label}</span>
            <span className={styles.gerInfoTitle}>{gerConf.title}</span>
            <span className={styles.gerInfoSub}>{gerConf.subtitle}</span>
          </div>

          {/* Previous log */}
          {log?.kg && (
            <div className={styles.prevLog}>
              <span className={styles.prevLogLabel}>ÚLTIMO REGISTRO</span>
              <span className={styles.prevLogVal}>{log.kg}kg × {log.reps || '?'} reps</span>
            </div>
          )}

          {/* Input fields */}
          <div className={styles.inputs}>
            <label className={styles.inputGroup}>
              <span className={styles.inputLabel}>CARGA</span>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="—"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                />
                <span className={styles.unit}>kg</span>
              </div>
            </label>
            <label className={styles.inputGroup}>
              <span className={styles.inputLabel}>REPS</span>
              <div className={styles.inputRow}>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="—"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
                <span className={styles.unit}>reps</span>
              </div>
            </label>
          </div>

          <label className={styles.inputGroup} style={{ display: 'block' }}>
            <span className={styles.inputLabel}>OBSERVAÇÕES</span>
            <input
              className={styles.input}
              style={{ width: '100%' }}
              type="text"
              placeholder="notas, sensações..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </label>

          <button
            className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`}
            onClick={handleSave}
          >
            {saved ? '✓ SALVO!' : 'REGISTRAR SÉRIE'}
          </button>

          {/* History */}
          {log?.history?.length > 1 && (
            <div className={styles.history}>
              <div className={styles.historyTitle}>HISTÓRICO</div>
              {log.history.slice(-5).reverse().map((h, i) => (
                <div key={i} className={styles.historyRow}>
                  <span className={styles.historyDate}>
                    {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className={styles.historyVal}>{h.kg}kg × {h.reps || '?'} reps</span>
                  {h.obs && <span className={styles.historyObs}>{h.obs}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
