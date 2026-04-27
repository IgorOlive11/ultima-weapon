import React, { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { PROTOCOL } from '../data/protocol'
import DoomFace from '../components/DoomFace'
import styles from './HistoryPage.module.css'

export default function HistoryPage() {
  const logs = useStore((s) => s.logs)
  const clearAllLogs = useStore((s) => s.clearAllLogs)
  const [confirmClear, setConfirmClear] = useState(false)

  // Build grouped history
  const groups = []
  Object.entries(logs).forEach(([key, val]) => {
    if (!val?.kg) return
    const match = key.match(/^w(\d+)_d(\d+)_e(\d+)$/)
    if (!match) return
    const wi = parseInt(match[1])
    const di = parseInt(match[2])
    const ei = parseInt(match[3])
    const week = PROTOCOL[wi]
    const day = week?.days[di]
    if (!week || !day || day.rest) return
    const exercise = day.exercises[ei]
    if (!exercise) return
    const gkey = `${wi}-${di}`
    let group = groups.find((g) => g.gkey === gkey)
    if (!group) {
      group = { gkey, wi, di, week, day, entries: [] }
      groups.push(group)
    }
    group.entries.push({ exercise, val, ei })
  })

  groups.sort((a, b) => (a.wi * 10 + a.di) - (b.wi * 10 + b.di))

  const hasData = groups.length > 0

  return (
    <div className={styles.container}>
      {!hasData && (
        <div className={styles.empty}>
          <div className={styles.emptyFace}>
            <DoomFace ger={7} size={64} />
          </div>
          <div className={styles.emptyTitle}>NENHUM TREINO REGISTRADO</div>
          <div className={styles.emptySub}>Vá treinar e registre suas cargas na aba TREINO.</div>
        </div>
      )}

      {hasData && groups.map((group) => (
        <div key={group.gkey} className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupWeek}>S{String(group.week.num).padStart(2, '0')}</span>
            <span className={styles.groupDay}>{group.day.name}</span>
            <span className={styles.groupPhase}>{group.week.phase}</span>
            <span className={styles.groupCount}>{group.entries.length} exercícios</span>
          </div>
          {group.entries.map(({ exercise, val, ei }) => (
            <div key={ei} className={styles.entry}>
              <DoomFace ger={exercise.ger} size={28} />
              <div className={styles.entryInfo}>
                <div className={styles.entryName}>{exercise.name}</div>
                {val.history?.length > 0 ? (
                  <div className={styles.entryHistory}>
                    {val.history.slice(-3).reverse().map((h, i) => (
                      <div key={i} className={styles.entryHistoryRow}>
                        <span className={styles.entryDate}>
                          {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className={styles.entryVal}>{h.kg}kg × {h.reps || '?'} reps</span>
                        {h.obs && <span className={styles.entryObs}>{h.obs}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.entryHistoryRow}>
                    <span className={styles.entryVal}>{val.kg}kg × {val.reps || '?'} reps</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {hasData && (
        <div className={styles.clearSection}>
          {!confirmClear ? (
            <button className={styles.clearBtn} onClick={() => setConfirmClear(true)}>
              LIMPAR HISTÓRICO
            </button>
          ) : (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>TEM CERTEZA?</span>
              <button className={styles.confirmYes} onClick={() => { clearAllLogs(); setConfirmClear(false) }}>
                SIM, LIMPAR
              </button>
              <button className={styles.confirmNo} onClick={() => setConfirmClear(false)}>
                CANCELAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
