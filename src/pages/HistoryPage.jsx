import React, { useState } from 'react'
import { LuTrash2, LuTriangleAlert, LuClock } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { DAY_NAMES } from '../data/protocol'
import DoomFace from '../components/DoomFace'

function fmtDuration(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function HistoryPage() {
  const logs             = useStore((s) => s.logs)
  const clearAllLogs     = useStore((s) => s.clearAllLogs)
  const userProtocol     = useStore((s) => s.userProtocol)
  const workoutSessions  = useStore((s) => s.workoutSessions)
  const [confirm, setConfirm] = useState(false)

  const groups = []
  Object.entries(logs).forEach(([key, val]) => {
    if (!val?.kg && !val?.blocks && !val?.sets?.length) return
    const m = key.match(/^w(\d+)_d(\d+)_e(\d+)$/)
    if (!m) return
    const wi = parseInt(m[1]), di = parseInt(m[2]), ei = parseInt(m[3])
    const week = userProtocol.weeks[wi]
    const day  = week?.days[di]
    if (!day || day.isRest) return
    const ex = day.exercises[ei]
    if (!ex) return
    const gkey = `${wi}-${di}`
    let g = groups.find((x) => x.gkey === gkey)
    if (!g) { g = { gkey, wi, di, day, entries: [] }; groups.push(g) }
    g.entries.push({ ex, val, ei })
  })
  groups.sort((a, b) => (a.wi * 10 + a.di) - (b.wi * 10 + b.di))

  // Duração total do treino daquele dia (workoutSessions já guarda durationSec por
  // sessão concluída) — se o dia foi refeito mais de uma vez, mostra a mais recente,
  // mesma regra de "só o estado atual" que os logs por exercício já seguem.
  groups.forEach((g) => {
    const sessions = (workoutSessions || []).filter(s => s.weekIdx === g.wi && s.dayIdx === g.di)
    g.durationSec = sessions.length ? sessions[sessions.length - 1].durationSec : null
  })

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
              S{String(g.wi + 1).padStart(2, '0')}
            </span>
            <span className="font-display text-lg text-ink tracking-wider">{DAY_NAMES[g.di]}</span>
            <span className="font-mono text-[10px] text-muted flex-1 tracking-widest"/>
            {g.durationSec != null && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-neon/80">
                <LuClock size={11}/> {fmtDuration(g.durationSec)}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted">{g.entries.length} exerc.</span>
          </div>

          {g.entries.map(({ ex, val, ei }) => (
            <div key={ei} className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border1/50 last:border-0">
              <DoomFace face={ex.sets?.[0] ? `ger${ex.sets[0].ger || 10}` : 'ger10'} size={26}/>
              <div className="flex-1 min-w-0">
                <div className="font-body font-bold text-[13px] text-muted2 truncate">{ex.name}</div>
                {val.history?.length > 0 ? (
                  <div className="mt-1 space-y-1.5">
                    {val.history.slice(-3).reverse().map((h, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex gap-2 items-baseline">
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
                        {h.warmups?.filter(w => w.reps > 0).map((w, wi) => (
                          <div key={`w${wi}`} className="flex gap-2 items-baseline pl-9">
                            <span className="font-mono text-[10px] text-muted/60">Aq{wi+1} {w.reps}r · {w.kg}kg</span>
                          </div>
                        ))}
                        {h.feeders?.filter(f => f.reps > 0).map((f, fi) => (
                          <div key={`f${fi}`} className="flex gap-2 items-baseline pl-9">
                            <span className="font-mono text-[10px] text-muted/60">Fe{fi+1} {f.reps}r · {f.kg}kg</span>
                          </div>
                        ))}
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
