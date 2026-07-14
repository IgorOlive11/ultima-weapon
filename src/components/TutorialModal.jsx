import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LuChevronRight, LuChevronLeft, LuSwords } from 'react-icons/lu'
import { GER_CONFIG, SET_TYPES, SET_TYPE_DESCRIPTIONS } from '../data/protocol'
import DoomFace from './DoomFace'

const GER_ENTRIES = Object.entries(GER_CONFIG).map(([ger, cfg]) => ({ ger: Number(ger), ...cfg }))
const SET_ENTRIES = Object.entries(SET_TYPES).map(([key, cfg]) => ({
  key,
  ...cfg,
  desc: SET_TYPE_DESCRIPTIONS[key],
}))

function SlideWelcome() {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <LuSwords size={36} className="text-neon" />
      <div className="font-display text-3xl text-neon tracking-[0.15em]">OVERLOAD</div>
      <p className="font-mono text-[11px] text-muted leading-relaxed tracking-wider max-w-xs">
        App de treino com sobrecarga progressiva baseado na <span className="text-ink">Escala GER</span>.
      </p>
      <div className="w-full space-y-2 mt-2">
        {[
          ['01', 'Monte seu protocolo de treino'],
          ['02', 'Registre cada série com carga e reps'],
          ['03', 'Progrida sistematicamente baseado no GER'],
        ].map(([n, txt]) => (
          <div key={n} className="flex items-center gap-3 bg-s2 border border-border2 px-3 py-2.5 text-left">
            <span className="font-display text-xs text-neon/60 tracking-widest flex-shrink-0">{n}</span>
            <span className="font-mono text-[10px] text-muted tracking-wider">{txt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideGER() {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center mb-1">
        <div className="font-display text-lg text-neon tracking-[0.2em]">ESCALA GER</div>
        <p className="font-mono text-[10px] text-muted tracking-wider mt-1">
          Grau de Esforço Relativo — o quão perto da falha você vai.
        </p>
      </div>
      {GER_ENTRIES.map(({ ger, label, title, subtitle, face }) => (
        <div key={ger} className="flex items-center gap-3 bg-s2 border border-border2 px-3 py-2">
          <DoomFace face={face} size={36} />
          <div className="min-w-0">
            <div className="font-display text-xs text-neon tracking-widest">{label}</div>
            <div className="font-mono text-[9px] text-ink tracking-wider leading-snug">{title}</div>
            <div className="font-mono text-[8px] text-muted tracking-wider">{subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SlideSets() {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center mb-1">
        <div className="font-display text-lg text-neon tracking-[0.2em]">TIPOS DE SÉRIE</div>
        <p className="font-mono text-[10px] text-muted tracking-wider mt-1">
          Cada tipo tem um protocolo de execução específico.
        </p>
      </div>
      {SET_ENTRIES.map(({ key, label, color, ger, desc }) => (
        <div key={key} className="bg-s2 border border-border2 px-3 py-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-display text-[11px] tracking-[0.15em]" style={{ color }}>{label}</span>
            <span className="font-mono text-[8px] text-muted tracking-widest">GER {ger}</span>
          </div>
          <p className="font-mono text-[9px] text-muted leading-relaxed tracking-wider">{desc}</p>
        </div>
      ))}
    </div>
  )
}

function SlideReady() {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <DoomFace face="ger10" size={96} />
      <div className="font-display text-2xl text-neon tracking-[0.2em]">BORA TREINAR</div>
      <p className="font-mono text-[11px] text-muted leading-relaxed tracking-wider max-w-xs">
        Vá em <span className="text-ink">Protocolo</span> para montar seu plano de treino,
        depois volte para <span className="text-ink">Treino</span> e execute.
      </p>
      <p className="font-mono text-[9px] text-muted/60 tracking-wider">
        Você pode rever esse tutorial em Configurações.
      </p>
    </div>
  )
}

const SLIDES = [
  { id: 'welcome', Component: SlideWelcome },
  { id: 'ger',     Component: SlideGER     },
  { id: 'sets',    Component: SlideSets    },
  { id: 'ready',   Component: SlideReady   },
]

export default function TutorialModal({ onDone }) {
  const [idx, setIdx]   = useState(0)
  const [dir, setDir]   = useState(1)
  const isLast = idx === SLIDES.length - 1

  function go(next) {
    setDir(next > idx ? 1 : -1)
    setIdx(next)
  }

  const { Component } = SLIDES[idx]

  return (
    <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-s1 border border-border1 flex flex-col"
           style={{ maxHeight: 'calc(100dvh - 48px)' }}>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-2 flex-shrink-0">
          {SLIDES.map((s, i) => (
            <div
              key={s.id}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                i === idx ? 'w-6 bg-neon' : i < idx ? 'w-3 bg-neon/40' : 'w-3 bg-border2'
              }`}
            />
          ))}
        </div>

        {/* slide content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ x: dir > 0 ? 48 : -48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir > 0 ? -48 : 48, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              <Component />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* nav */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border1 flex-shrink-0">
          {idx > 0 ? (
            <button
              onClick={() => go(idx - 1)}
              className="flex items-center gap-1 font-mono text-[10px] text-muted tracking-widest hover:text-ink transition-colors px-3 py-2.5 border border-border2"
            >
              <LuChevronLeft size={13} /> VOLTAR
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <button
            onClick={() => isLast ? onDone() : go(idx + 1)}
            className="flex-1 flex items-center justify-center gap-1.5 btn-primary py-2.5"
          >
            {isLast ? 'COMEÇAR' : <><span>PRÓXIMO</span><LuChevronRight size={13} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
