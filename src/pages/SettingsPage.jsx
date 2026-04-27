import React, { useState } from 'react'
import { useStore } from '../hooks/useStore'
import { PROTOCOL } from '../data/protocol'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const startDate = useStore((s) => s.startDate)
  const setStartDate = useStore((s) => s.setStartDate)
  const currentWeek = useStore((s) => s.currentWeek)
  const [inputDate, setInputDate] = useState(startDate)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setStartDate(inputDate)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const week = PROTOCOL[currentWeek]

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>STATUS DO PROTOCOLO</div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Semana atual</span>
          <span className={styles.statusVal}>{week.num} — {week.phase}</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Data de início</span>
          <span className={styles.statusVal}>{new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>DATA DE INÍCIO</div>
        <p className={styles.hint}>
          Defina quando você começou o protocolo. O app calcula automaticamente a semana atual.
        </p>
        <input
          className={styles.dateInput}
          type="date"
          value={inputDate}
          onChange={(e) => setInputDate(e.target.value)}
        />
        <button
          className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`}
          onClick={handleSave}
        >
          {saved ? '✓ SALVO!' : 'SALVAR DATA'}
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>VISÃO GERAL DO PROTOCOLO</div>
        {PROTOCOL.map((w, i) => (
          <div
            key={i}
            className={`${styles.weekRow} ${i === currentWeek ? styles.weekRowActive : ''}`}
          >
            <span className={styles.weekNum}>S{String(w.num).padStart(2, '0')}</span>
            <span className={styles.weekPhase}>{w.phase}</span>
            <span className={styles.weekWorkouts}>
              {w.days.filter((d) => !d.rest).length} treinos
            </span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>SOBRE</div>
        <p className={styles.about}>
          Ultima Weapon — 8 Week Low Volume Training<br />
          by Mr. Saizen · Weapons of Mass Construction
        </p>
        <p className={styles.about} style={{ marginTop: 8, color: '#444' }}>
          Para adicionar à tela inicial no iOS: Safari → Compartilhar → Adicionar à Tela de Início
        </p>
      </div>
    </div>
  )
}
