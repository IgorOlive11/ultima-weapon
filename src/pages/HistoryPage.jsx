import React, { useState } from 'react'
import { LuTrash2, LuTriangleAlert } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { PROTOCOL } from '../data/protocol'
import DoomFace from '../components/DoomFace'

export default function HistoryPage() {
  const logs        = useStore((s) => s.logs)
  const clearAllLogs = useStore((s) => s.clearAllLogs)
  const [confirm, setConfirm] = useState(false)

  const groups = []
  Object.entries(logs).forEach(([key, val]) => {
    if (!val?.kg && !val?.blocks) return
    const m = key.match(/^w(\d+)_d(\d+)_e(\d+)$/)
    if (!m) return
    const wi = parseInt(m[1]), di = parseInt(m[2]), ei = parseInt(m[3])
    const week = PROTOCOL[wi], day = week?.days[di]
    if (!week || !day || day.rest) return
    const ex = day.exercises[ei]
    if (!ex) return
    const gkey = `${wi}-${di}`
    let g = groups.find((x) => x.gkey === gkey)
    if (!g) { g = { gkey, wi, di, week, day, entries: [] }; groups.push(g) }
    g.entries.push({ ex, val, ei })
  })
  groups.sort((a, b) => (a.wi * 10 + a.di) - (b.wi * 10 + b.di))

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <DoomFace ger={7} size={56} className="opacity-30 mb-4" />
        <div className="font-display text-xl text-muted tracking-[0.2em]">SEM REGISTROS</div>
        <div className="font-mono text-[11px] text-muted/60 mt-2 tracking-wider leading-relaxed">
          Registre suas cargas<br />na aba TREINO.
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 pb-10 space-y-2">
      {groups.map((g) => (
        <div key={g.gkey} className="bg-s1 border border-border1 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-s2 border-b border-border1">
            <span className="font-display text-lg text-neon tracking-wider">
              S{String(g.week.num).padStart(2, '0')}
            </span>
            <span className="font-display text-lg text-ink tracking-wider">{g.day.name}</span>
            <span className="font-mono text-[10px] text-muted flex-1 tracking-widest">{g.week.phase}</span>
            <span className="font-mono text-[10px] text-muted">{g.entries.length} exerc.</span>
          </div>

          {g.entries.map(({ ex, val, ei }) => (
            <div key={ei} className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border1/50 last:border-0">
              <DoomFace ger={ex.ger} size={26} />
              <div className="flex-1 min-w-0">
                <div className="font-body font-bold text-[13px] text-muted2 truncate">{ex.name}</div>
                {val.history?.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    {val.history.slice(-3).reverse().map((h, i) => (
                      <div key={i} className="flex gap-2 items-baseline">
                        <span className="font-mono text-[10px] text-muted w-9 flex-shrink-0">
                          {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="font-mono text-[11px] text-neon font-bold">
                          {h.kg}kg
                          {h.reps ? ` × ${h.reps}` : ''}
                          {h.blocks ? ` · ${h.blocks} blocos` : ''}
                        </span>
                        {h.obs && <span className="font-mono text-[10px] text-muted truncate">{h.obs}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="font-mono text-[11px] text-neon mt-0.5">
                    {val.kg}kg{val.reps ? ` × ${val.reps}` : ''}{val.blocks ? ` · ${val.blocks} blocos` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Clear */}
      <div className="pt-4 text-center">
        {!confirm ? (
          <button
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border2 text-muted
              font-display text-sm tracking-widest hover:border-danger hover:text-danger transition-colors"
          >
            <LuTrash2 size={14} />
            LIMPAR HISTÓRICO
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <LuTriangleAlert size={16} className="text-danger" />
            <span className="font-mono text-[11px] text-danger tracking-widest">TEM CERTEZA?</span>
            <button
              onClick={() => { clearAllLogs(); setConfirm(false) }}
              className="px-3 py-1.5 bg-danger text-white font-display text-sm tracking-wider"
            >
              LIMPAR
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-3 py-1.5 border border-border2 text-muted font-display text-sm tracking-wider"
            >
              CANCELAR
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
