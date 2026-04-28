import React from 'react'
import { LuSwords, LuTimer, LuTrendingUp, LuSlidersHorizontal, LuX, LuCalendar, LuFlame, LuSalad } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { PROTOCOL } from '../data/protocol'

const PHASE_COLORS = { REVOLUME:'#39FF14', BASE:'#ffaa00', PEAK:'#ff2d2d', DEVOLUME:'#00aaff', DELOAD:'#777' }
const NAV = [
  { id:'workout',  label:'TREINO',        Icon:LuSwords },
  { id:'timer',    label:'TIMER',         Icon:LuTimer },
  { id:'diet',     label:'DIETA',         Icon:LuSalad },
  { id:'history',  label:'HISTÓRICO',     Icon:LuTrendingUp },
  { id:'settings', label:'CONFIGURAÇÕES', Icon:LuSlidersHorizontal },
]

export default function Sidebar() {
  const sidebarOpen = useStore(s=>s.sidebarOpen)
  const setSidebar  = useStore(s=>s.setSidebar)
  const activeTab   = useStore(s=>s.activeTab)
  const setTab      = useStore(s=>s.setTab)
  const currentWeek = useStore(s=>s.currentWeek)
  const currentDay  = useStore(s=>s.currentDay)

  const week = PROTOCOL[currentWeek]
  const day  = week?.days[currentDay]
  const phaseColor = PHASE_COLORS[week?.phase] || '#39FF14'
  const pct = Math.round(((currentWeek*7+currentDay)/(8*7))*100)

  return (
    <>
      <div
        className={`fixed inset-0 z-[199] bg-black/70 transition-opacity duration-300 ${sidebarOpen?'opacity-100 pointer-events-auto':'opacity-0 pointer-events-none'}`}
        onClick={()=>setSidebar(false)}
      />
      <aside className={`fixed left-0 top-0 bottom-0 z-[200] w-[260px] bg-s1 border-r border-border1 flex flex-col transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${sidebarOpen?'translate-x-0':'-translate-x-full'}`}>
        <div className="flex items-start justify-between p-4 border-b border-border1">
          <div>
            <div className="font-display text-xl text-neon tracking-[0.15em] leading-none">ULTIMA WEAPON</div>
            <div className="font-mono text-[9px] text-muted tracking-[0.2em] mt-1">WEAPONS OF MASS CONSTRUCTION</div>
          </div>
          <button onClick={()=>setSidebar(false)} className="text-muted hover:text-ink transition-colors p-1">
            <LuX size={18}/>
          </button>
        </div>

        <div className="mx-3 my-3 bg-s2 border border-border2 p-3">
          <div className="flex items-center gap-2 mb-1">
            <LuCalendar size={12} className="text-muted"/>
            <span className="font-mono text-[9px] text-muted tracking-[0.2em]">SEMANA ATUAL</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl leading-none tracking-wider" style={{color:phaseColor}}>
              S{String(week.num).padStart(2,'0')}
            </span>
            <span className="font-display text-lg tracking-wider" style={{color:phaseColor+'99'}}>{week.phase}</span>
          </div>
          <div className="font-body text-[11px] text-muted2 mt-1 font-semibold tracking-wide">
            {day?.rest?'Descanso':day?.name} · {week.num} de 8 semanas
          </div>
          <div className="mt-3 h-[2px] bg-border1">
            <div className="h-full transition-all duration-500" style={{width:`${pct}%`,background:phaseColor}}/>
          </div>
          <div className="font-mono text-[9px] text-muted mt-1 tracking-wider">{pct}% DO PROTOCOLO</div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({id,label,Icon})=>{
            const active=activeTab===id
            return (
              <button key={id} onClick={()=>setTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-[3px] transition-all duration-150 font-body font-semibold text-sm tracking-wider
                  ${active?'border-l-neon text-neon bg-neon/5':'border-l-transparent text-muted2 hover:text-ink hover:bg-s2'}`}>
                <Icon size={18} weight={active?'bold':'regular'}/>
                {label}
                {id==='workout'&&!day?.rest&&(
                  <span className="ml-auto font-mono text-[9px] bg-neon text-bg px-2 py-0.5 font-bold tracking-wider">HOJE</span>
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
