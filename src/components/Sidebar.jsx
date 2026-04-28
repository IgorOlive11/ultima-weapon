import React from 'react'
import {
  LuSwords, LuClipboardList, LuTrendingUp,
  LuSlidersHorizontal, LuX, LuCalendar, LuFlame, LuSalad,
} from 'react-icons/lu'
import { useStore } from '../hooks/useStore'

const NAV = [
  { id: 'workout',  label: 'TREINO',        Icon: LuSwords },
  { id: 'protocol', label: 'PROTOCOLO',     Icon: LuClipboardList },
  { id: 'diet',     label: 'DIETA',         Icon: LuSalad },
  { id: 'history',  label: 'HISTÓRICO',     Icon: LuTrendingUp },
  { id: 'settings', label: 'CONFIGURAÇÕES', Icon: LuSlidersHorizontal },
]

export default function Sidebar() {
  const sidebarOpen  = useStore(s => s.sidebarOpen)
  const setSidebar   = useStore(s => s.setSidebar)
  const activeTab    = useStore(s => s.activeTab)
  const setTab       = useStore(s => s.setTab)
  const currentWeek  = useStore(s => s.currentWeek)
  const currentDay   = useStore(s => s.currentDay)
  const userProtocol = useStore(s => s.userProtocol)
  const activeWorkout = useStore(s => s.activeWorkout)

  const week = userProtocol.weeks[currentWeek]
  const day  = week?.days[currentDay]

  // progress: how many day-slots across all 8 weeks have at least 1 exercise
  const totalSlots = 8 * 7
  const filledSlots = userProtocol.weeks.reduce(
    (acc, w) => acc + w.days.filter(d => !d.isRest && d.exercises.length > 0).length,
    0
  )
  const pct = Math.round((filledSlots / totalSlots) * 100)

  return (
    <>
      <div
        className={`fixed inset-0 z-[199] bg-black/70 transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebar(false)}
      />

      <aside className={`fixed left-0 top-0 bottom-0 z-[200] w-[260px] bg-s1 border-r border-border1 flex flex-col transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-start justify-between p-4 border-b border-border1">
          <div>
            <div className="font-display text-xl text-neon tracking-[0.15em] leading-none">ULTIMA WEAPON</div>
            <div className="font-mono text-[9px] text-muted tracking-[0.2em] mt-1">WEAPONS OF MASS CONSTRUCTION</div>
          </div>
          <button onClick={() => setSidebar(false)} className="text-muted hover:text-ink transition-colors p-1">
            <LuX size={18}/>
          </button>
        </div>

        {/* protocol progress widget */}
        <div className="mx-3 my-3 bg-s2 border border-border2 p-3">
          <div className="flex items-center gap-2 mb-1">
            <LuCalendar size={12} className="text-muted"/>
            <span className="font-mono text-[9px] text-muted tracking-[0.2em]">SEMANA ATUAL</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl leading-none tracking-wider text-neon">
              S{String(currentWeek + 1).padStart(2, '0')}
            </span>
            <span className="font-display text-lg tracking-wider text-neon/60">
              {day?.isRest ? 'DESCANSO' : day?.exercises?.length ? `${day.exercises.length} EX.` : 'VAZIO'}
            </span>
          </div>
          <div className="font-body text-[11px] text-muted2 mt-1 font-semibold tracking-wide">
            {['SEG','TER','QUA','QUI','SEX','SAB','DOM'][currentDay]} · Semana {currentWeek + 1} de 8
          </div>
          <div className="mt-3 h-[2px] bg-border1">
            <div className="h-full transition-all duration-500 bg-neon" style={{ width: `${pct}%` }}/>
          </div>
          <div className="font-mono text-[9px] text-muted mt-1 tracking-wider">{pct}% DO PROTOCOLO PREENCHIDO</div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => {
            const active = activeTab === id
            const showBadge = id === 'workout' && !day?.isRest && (day?.exercises?.length || 0) > 0
            const isActive = id === 'workout' && activeWorkout
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-[3px] transition-all duration-150 font-body font-semibold text-sm tracking-wider
                  ${active
                    ? 'border-l-neon text-neon bg-neon/5'
                    : 'border-l-transparent text-muted2 hover:text-ink hover:bg-s2'
                  }`}
              >
                <Icon size={18}/>
                {label}
                {showBadge && !active && (
                  <span className="ml-auto font-mono text-[9px] bg-neon text-bg px-2 py-0.5 font-bold tracking-wider">
                    HOJE
                  </span>
                )}
                {isActive && !active && (
                  <span className="ml-auto font-mono text-[9px] bg-orange-500 text-bg px-2 py-0.5 font-bold tracking-wider animate-pulse">
                    ATIVO
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border1">
          <div className="flex items-center gap-1.5 mb-1">
            <LuFlame size={12} className="text-neon"/>
            <span className="font-mono text-[9px] text-muted tracking-wider">BY MR. SAIZEN</span>
          </div>
          <div className="font-mono text-[9px] text-muted/60 tracking-wider">JUNKYARD · SAIZEN SCHOOL</div>
        </div>
      </aside>
    </>
  )
}
