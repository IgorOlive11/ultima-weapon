import React from 'react'
import { useStore } from './hooks/useStore'
import WorkoutPage from './pages/WorkoutPage'
import TimerPage from './pages/TimerPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { PROTOCOL } from './data/protocol'
import styles from './App.module.css'

const PHASE_COLORS = {
  REVOLUME: '#39FF14',
  BASE:     '#ffaa00',
  PEAK:     '#ff3333',
  DEVOLUME: '#00aaff',
  DELOAD:   '#888888',
}

const TABS = [
  { id: 'workout',  label: 'TREINO',   icon: '⚔' },
  { id: 'timer',    label: 'TIMER',    icon: '⏱' },
  { id: 'history',  label: 'HISTÓRICO',icon: '📊' },
  { id: 'settings', label: 'CONFIG',   icon: '⚙' },
]

export default function App() {
  const activeTab    = useStore((s) => s.activeTab)
  const setTab       = useStore((s) => s.setTab)
  const currentWeek  = useStore((s) => s.currentWeek)

  const week = PROTOCOL[currentWeek]
  const phaseColor = PHASE_COLORS[week?.phase] || '#39FF14'

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header} style={{ borderBottomColor: phaseColor }}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>ULTIMA WEAPON</div>
          <div className={styles.logoSub}>WEAPONS OF MASS CONSTRUCTION</div>
        </div>
        <div className={styles.weekBadge} style={{ background: phaseColor }}>
          S{String(week.num).padStart(2, '0')}
        </div>
      </header>

      {/* Content */}
      <main className={styles.main}>
        {activeTab === 'workout'  && <WorkoutPage />}
        {activeTab === 'timer'    && <TimerPage />}
        {activeTab === 'history'  && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Bottom nav */}
      <nav className={styles.nav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.navBtn} ${activeTab === tab.id ? styles.navBtnActive : ''}`}
            style={activeTab === tab.id ? { color: phaseColor, borderTopColor: phaseColor } : {}}
            onClick={() => setTab(tab.id)}
          >
            <span className={styles.navIcon}>{tab.icon}</span>
            <span className={styles.navLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
