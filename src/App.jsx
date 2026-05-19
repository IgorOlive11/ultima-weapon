import { useRef, useEffect } from 'react'
import { useStore } from './hooks/useStore'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import GlobalRestTimer from './components/GlobalRestTimer'
import ViewingAsBanner from './components/ViewingAsBanner'
import WorkoutPage from './pages/WorkoutPage'
import ProtocolPage from './pages/ProtocolPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import TrainerPage from './pages/TrainerPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import TutorialModal from './components/TutorialModal'

export default function App() {
  const activeTab        = useStore((s) => s.activeTab)
  const resumeRestTimer  = useStore((s) => s.resumeRestTimer)
  const tutorialSeen     = useStore((s) => s.tutorialSeen)
  const setTutorialSeen  = useStore((s) => s.setTutorialSeen)
  const scrollRef        = useRef(null)

  const { authUser, authLoading } = useAuth()

  useEffect(() => { resumeRestTimer() }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg max-w-[430px] mx-auto">
        <div className="font-display text-neon text-sm tracking-[0.2em] animate-pulse">CARREGANDO...</div>
      </div>
    )
  }

  if (!authUser) return <AuthPage />

  return (
    <div className="scanlines flex flex-col h-dvh max-w-[430px] mx-auto bg-bg overflow-hidden relative">
      <Sidebar />
      <Header scrollRef={scrollRef} />
      <ViewingAsBanner />
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {activeTab === 'workout'  && <WorkoutPage />}
        {activeTab === 'protocol' && <ProtocolPage />}
        {activeTab === 'history'  && <HistoryPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'trainer'  && <TrainerPage />}
        {activeTab === 'admin'    && <AdminPage />}
      </main>
      <GlobalRestTimer />
      {!tutorialSeen && <TutorialModal onDone={setTutorialSeen} />}
    </div>
  )
}
