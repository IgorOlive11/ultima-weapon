import React, { useEffect, useRef, useState } from 'react'
import { LuMenu, LuChevronDown } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { PROTOCOL } from '../data/protocol'

const PHASE_COLORS = { REVOLUME:'#39FF14', BASE:'#ffaa00', PEAK:'#ff2d2d', DEVOLUME:'#00aaff', DELOAD:'#777' }
const TAB_TITLES   = { workout:'TREINO', timer:'TIMER', history:'HISTÓRICO', settings:'CONFIG' }

export default function Header({ scrollRef }) {
  const setSidebar  = useStore(s=>s.setSidebar)
  const currentWeek = useStore(s=>s.currentWeek)
  const currentDay  = useStore(s=>s.currentDay)
  const activeTab   = useStore(s=>s.activeTab)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  const week       = PROTOCOL[currentWeek]
  const day        = week?.days[currentDay]
  const phaseColor = PHASE_COLORS[week?.phase]||'#39FF14'

  useEffect(()=>{
    const el=scrollRef?.current
    if(!el) return
    const onScroll=()=>{
      const y=el.scrollTop
      if(y>lastY.current&&y>50) setHidden(true)
      else if(y<lastY.current) setHidden(false)
      lastY.current=y
    }
    el.addEventListener('scroll',onScroll,{passive:true})
    return()=>el.removeEventListener('scroll',onScroll)
  },[scrollRef])

  const showHeader = () => {
    setHidden(false)
    scrollRef?.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {/* Collapsing wrapper — height 0 when hidden so no layout gap */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ height: hidden ? 0 : 52, transition: 'height 0.3s ease' }}
      >
        <header
          className="flex items-center gap-3 px-3 bg-s1 border-b z-10"
          style={{ height: 52, borderBottomColor: phaseColor }}
        >
          <button onClick={()=>setSidebar(true)} className="text-muted2 hover:text-ink transition-colors" aria-label="Menu">
            <LuMenu size={22}/>
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-display text-base text-ink tracking-[0.15em] leading-none">{TAB_TITLES[activeTab]||activeTab.toUpperCase()}</div>
            {activeTab==='workout'&&(
              <div className="font-mono text-[9px] text-muted tracking-[0.15em] mt-0.5">
                {day?.name} · SEMANA {week.num} · {week.phase}
              </div>
            )}
          </div>
          <div className="font-display text-sm px-3 py-1 tracking-wider font-bold flex-shrink-0" style={{background:phaseColor,color:'#080808'}}>
            S{String(week.num).padStart(2,'0')}
          </div>
        </header>
      </div>

      {hidden && (
        <button
          onClick={showHeader}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-s2 border border-border1 border-t-0 px-5 py-1 font-mono text-[9px] text-muted tracking-[0.2em] flex items-center gap-1 hover:text-ink transition-colors"
        >
          <LuChevronDown size={10}/>MENU
        </button>
      )}
    </>
  )
}
