import React, { useRef } from 'react'
import { useStore } from './hooks/useStore'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import WorkoutPage from './pages/WorkoutPage'
import TimerPage from './pages/TimerPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const activeTab = useStore((s) => s.activeTab)
  const scrollRef = useRef(null)

  return (
    <div className="scanlines flex flex-col h-dvh max-w-[430px] mx-auto bg-bg overflow-hidden relative">
      <Sidebar />

      <Header scrollRef={scrollRef} />

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {activeTab === 'workout'  && <WorkoutPage />}
        {activeTab === 'timer'    && <TimerPage />}
        {activeTab === 'history'  && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
