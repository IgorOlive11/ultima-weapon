import React, { useState } from 'react'
import { LuSave, LuCircleCheck } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { PROTOCOL } from '../data/protocol'

const PHASE_COLORS = {
  REVOLUME: '#39FF14', BASE: '#ffaa00', PEAK: '#ff2d2d',
  DEVOLUME: '#00aaff', DELOAD: '#888',
}

export default function SettingsPage() {
  const startDate    = useStore((s) => s.startDate)
  const setStartDate = useStore((s) => s.setStartDate)
  const currentWeek  = useStore((s) => s.currentWeek)

  const [input, setInput] = useState(startDate)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setStartDate(input)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const week = PROTOCOL[currentWeek]

  return (
    <div className="p-3 pb-10 space-y-3">
      {/* Status */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          STATUS DO PROTOCOLO
        </div>
        <div className="space-y-2">
          {[
            ['Semana atual', `${week.num} — ${week.phase}`],
            ['Data de início', new Date(startDate + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-border1 last:border-0">
              <span className="font-mono text-[10px] text-muted tracking-widest">{label.toUpperCase()}</span>
              <span className="font-display text-sm text-ink tracking-wider">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date input */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-1 pb-2 border-b border-border1">
          DATA DE INÍCIO
        </div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed mt-3 mb-3">
          Define quando você começou o protocolo.<br />
          A semana atual é calculada automaticamente.
        </p>
        <input
          type="date"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-s2 border border-border2 text-ink px-3 py-3
            font-mono text-sm tracking-wider outline-none focus:border-neon transition-colors mb-3"
          style={{ colorScheme: 'dark' }}
        />
        <button
          onClick={handleSave}
          className={`btn-primary flex items-center justify-center gap-2 ${saved ? 'saved' : ''}`}
        >
          {saved
            ? <><LuCircleCheck size={16} />SALVO!</>
            : <><LuSave size={16} />SALVAR DATA</>
          }
        </button>
      </div>

      {/* Protocol overview */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          VISÃO GERAL
        </div>
        <div className="space-y-1">
          {PROTOCOL.map((w, i) => {
            const active = i === currentWeek
            const color  = PHASE_COLORS[w.phase] || '#888'
            return (
              <div
                key={i}
                className={`flex items-center gap-3 py-2 border-b border-border1 last:border-0
                  ${active ? '' : 'opacity-50'}`}
              >
                <span
                  className="font-display text-base tracking-wider w-9 flex-shrink-0"
                  style={{ color: active ? color : '#555' }}
                >
                  S{String(w.num).padStart(2, '0')}
                </span>
                <span
                  className="flex-1 font-body font-semibold text-sm tracking-wider"
                  style={{ color: active ? '#e8e8e8' : '#555' }}
                >
                  {w.phase}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {w.days.filter((d) => !d.rest).length} treinos
                </span>
                {active && (
                  <span
                    className="font-mono text-[9px] px-2 py-0.5 font-bold tracking-widest"
                    style={{ background: color + '22', color, border: `1px solid ${color}44` }}
                  >
                    ATUAL
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* About */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          SOBRE
        </div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
          Ultima Weapon — 8 Week Low Volume Training<br />
          by Mr. Saizen · Weapons of Mass Construction<br /><br />
          <span className="text-muted/60">
            iOS: Safari → Compartilhar → Adicionar à Tela de Início
          </span>
        </p>
      </div>
    </div>
  )
}
