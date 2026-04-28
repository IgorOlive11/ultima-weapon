import { useRef } from 'react'
import { useStore } from './hooks/useStore'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import GlobalRestTimer from './components/GlobalRestTimer'
import WorkoutPage from './pages/WorkoutPage'
import ProtocolPage from './pages/ProtocolPage'
import DietPage from './pages/DietPage'
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
        {activeTab === 'protocol' && <ProtocolPage />}
        {activeTab === 'diet'     && <DietPage />}
        {activeTab === 'history'  && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      <GlobalRestTimer />
    </div>
  )
}
