import { useState, useEffect } from 'react'
import {
  LuChevronDown, LuCircleCheck, LuZap, LuSave, LuCheckCheck,
  LuDumbbell, LuRefreshCw, LuSkull, LuWaves,
} from 'react-icons/lu'
import DoomFace from './DoomFace'
import { resolveGerConfig, SET_TYPES, SET_TYPE_DESCRIPTIONS } from '../data/protocol'
import { calcLoads, fmtKg } from '../utils/loads'
import { useStore } from '../hooks/useStore'

const TYPE_COLORS    = { NORMAL: '#39FF14', REST_PAUSE: '#ff6600', WIDOWMAKER: '#ffdd00', MUSCLE_ROUND: '#ff2222' }
const CALC_CLS       = { NORMAL: 'calc-chip-neon', REST_PAUSE: 'calc-chip-orange', WIDOWMAKER: 'calc-chip-yellow' }
const TYPE_CHIP_ICON = { NORMAL: LuDumbbell, REST_PAUSE: LuRefreshCw, WIDOWMAKER: LuSkull, PULSE: LuWaves }

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function ExerciseCard({ exercise, weekIdx, dayIdx, exIdx, onSave, savedLog }) {
  const numSets = exercise.sets.length
  const topGer  = exercise.sets[numSets - 1].ger

  const [open, setOpen]         = useState(false)
  const [kgValues, setKgValues] = useState(() =>
    Array.from({ length: numSets }, (_, i) => savedLog?.sets?.[i]?.kg || '')
  )
  const [repsValues, setRepsValues] = useState(() =>
    Array.from({ length: numSets }, (_, i) => savedLog?.sets?.[i]?.reps || '')
  )
  const [obs, setObs]               = useState(savedLog?.obs || '')
  const [confirmedSet, setConfirmedSet] = useState(-1)
  const [savedOk, setSavedOk]       = useState(false)

  const restTimer      = useStore(s => s.restTimer)
  const startRestTimer = useStore(s => s.startRestTimer)

  const typeColor = TYPE_COLORS[exercise.type] || '#39FF14'
  const calcCls   = CALC_CLS[exercise.type]    || 'calc-chip-neon'
  const ChipIcon  = TYPE_CHIP_ICON[exercise.type] || LuDumbbell
  const setType   = SET_TYPES[exercise.type]   || SET_TYPES.NORMAL
  const topGerConf = resolveGerConfig(topGer, 9)

  // top set kg is the last set's kg for load calc
  const topKg  = parseFloat(kgValues[numSets - 1]) || 0
  const loads  = calcLoads(topKg)

  const restIsActive = confirmedSet >= 0 && restTimer.running
  const restIsDone   = confirmedSet >= 0 && !restTimer.running && restTimer.seconds === 0
  const restPct      = restTimer.preset > 0 ? restTimer.seconds / restTimer.preset : 0

  useEffect(() => {
    if (confirmedSet >= 0 && !restTimer.running && restTimer.seconds === 0) {
      const t = setTimeout(() => setConfirmedSet(-1), 2000)
      return () => clearTimeout(t)
    }
  }, [restTimer.running, restTimer.seconds, confirmedSet])

  const hasSavedSets = savedLog?.sets?.some(s => s.kg)

  const handleSave = () => {
    if (!kgValues.some(v => v)) return
    onSave({ sets: kgValues.map((kg, i) => ({ kg, reps: repsValues[i] })), obs })
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2000)
  }

  const setSubtitle = exercise.sets.map((s, i) =>
    `${i + 1}·GER${s.ger}${s.reps ? ' ' + s.reps : ''}`
  ).join('  ')

  return (
    <div className="bg-s1 border mb-1.5 overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: open ? typeColor : '#2a2a2a', borderColor: open ? typeColor + '44' : '#222' }}>

      {/* Header */}
      <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpen(v => !v)}>
        <DoomFace ger={topGer} size={30} />
        <div className="flex-1 min-w-0">
          <div className="font-body font-bold text-sm text-ink leading-tight truncate">{exercise.name}</div>
          <div className="font-mono text-[10px] text-muted mt-0.5 truncate">{setSubtitle}</div>
        </div>
        {hasSavedSets && <LuCircleCheck size={14} className="text-neon flex-shrink-0" />}
        <span className="font-mono text-[10px] font-bold flex-shrink-0" style={{ color: typeColor }}>GER{topGer}</span>
        <LuChevronDown size={14} className={`flex-shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 animate-slide-down">

          {/* Type chip */}
          <div className="inline-flex items-center gap-2 border px-2.5 py-1 mb-3"
            style={{ borderColor: typeColor + '66', background: typeColor + '0d', color: typeColor }}>
            <ChipIcon size={11} />
            <span className="font-mono text-[10px] font-bold tracking-widest">{setType.label}</span>
          </div>

          {/* GER info block — shows top GER */}
          <div className="flex items-center gap-2.5 bg-s2 border border-border1 p-2.5 mb-3">
            <DoomFace ger={topGer} size={36} />
            <div>
              <div className="font-display text-[13px] tracking-wider" style={{ color: typeColor }}>
                GER {topGer} — {topGerConf.title}
              </div>
              <div className="font-mono text-[10px] text-muted2 mt-1 leading-relaxed">{SET_TYPE_DESCRIPTIONS[exercise.type]}</div>
              <div className="font-mono text-[9px] text-muted mt-0.5">{topGerConf.subtitle}</div>
            </div>
          </div>

          {/* Prev log */}
          {hasSavedSets && (
            <div className="bg-neon/5 border border-neon/15 px-2.5 py-1.5 mb-3">
              <div className="font-mono text-[9px] text-muted tracking-widest mb-1">ÚLTIMO</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {savedLog.sets.map((s, i) => s.kg ? (
                  <span key={i} className="font-display text-sm text-neon tracking-wider">
                    {i + 1}· {s.kg}KG × {s.reps || '?'}
                  </span>
                ) : null)}
              </div>
            </div>
          )}

          {/* Working sets — one row per sets[] entry */}
          <div className="section-label mb-1"><LuZap size={10} />SÉRIES</div>

          {exercise.sets.map((s, i) => {
            const gerConf = resolveGerConfig(s.ger, 9)
            const isConfirmed = confirmedSet === i
            const isActive    = isConfirmed && restTimer.running
            const isDone      = isConfirmed && !restTimer.running && restTimer.seconds === 0
            const setLoads    = calcLoads(parseFloat(kgValues[i]))

            return (
              <div key={i} className="mb-2.5">
                {/* Row: num · face · ger · reps · inputs */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-mono text-[10px] text-muted w-3 flex-shrink-0">{i + 1}</span>
                  <DoomFace ger={s.ger} size={16} />
                  <span className="font-mono text-[9px] font-bold flex-shrink-0" style={{ color: typeColor }}>GER{s.ger}</span>
                  {s.reps && (
                    <span className="font-mono text-[9px] text-muted2 flex-shrink-0">{s.reps}</span>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <input
                      className="input-base w-14 text-center"
                      type="number" inputMode="decimal" step="0.5" min="0" placeholder="—"
                      value={kgValues[i]}
                      onChange={e => { const v = [...kgValues]; v[i] = e.target.value; setKgValues(v) }}
                    />
                    <span className="font-mono text-[9px] text-muted">kg</span>
                    <input
                      className="input-base w-12 text-center"
                      type="number" inputMode="numeric" min="0" placeholder="—"
                      value={repsValues[i]}
                      onChange={e => { const v = [...repsValues]; v[i] = e.target.value; setRepsValues(v) }}
                    />
                    <span className="font-mono text-[9px] text-muted">×</span>
                  </div>
                  {setLoads && (
                    <span className={`calc-chip flex-shrink-0 ${calcCls}`}>{fmtKg(setLoads.top)}</span>
                  )}
                </div>

                {/* Confirm button */}
                <button
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 font-display text-[11px] tracking-widest border transition-all active:opacity-80"
                  style={isConfirmed
                    ? { background: typeColor, color: '#080808', borderColor: typeColor }
                    : { borderColor: typeColor + '55', background: typeColor + '0d', color: typeColor }}
                  onClick={() => { setConfirmedSet(i); startRestTimer(exercise.rest) }}
                >
                  <LuCheckCheck size={11} />
                  SÉRIE {i + 1} CONCLUÍDA — {fmt(exercise.rest)}
                </button>

                {/* Inline rest indicator */}
                {isConfirmed && (
                  isDone ? (
                    <div className="flex items-center justify-center gap-2 py-1" style={{ color: typeColor }}>
                      <span className="font-mono text-[11px] tracking-widest">DESCANSO CONCLUÍDO ✓</span>
                    </div>
                  ) : isActive ? (
                    <div className="border px-2.5 py-1.5 mt-1" style={{ borderColor: typeColor + '33', background: typeColor + '08' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <DoomFace ger={s.ger} size={16} />
                        <span className="font-mono text-[11px] tracking-widest" style={{ color: typeColor }}>
                          DESCANSANDO {fmt(restTimer.seconds)}
                        </span>
                      </div>
                      <div className="h-[2px] w-full overflow-hidden" style={{ background: typeColor + '22' }}>
                        <div
                          className="h-full transition-all duration-1000 ease-linear"
                          style={{ width: `${restPct * 100}%`, background: typeColor }}
                        />
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )
          })}

          {/* Obs */}
          <div className="section-label mt-2">OBSERVAÇÕES</div>
          <input
            className="w-full bg-s3 border border-border2 text-ink px-3 py-2.5 font-body font-semibold text-sm tracking-wide outline-none focus:border-neon transition-colors mb-3"
            type="text" placeholder="notas..." value={obs} onChange={e => setObs(e.target.value)}
          />

          {/* History */}
          {savedLog?.history?.length > 1 && (
            <div className="mb-3 border-t border-border1 pt-2">
              <div className="font-mono text-[9px] text-muted tracking-[0.25em] mb-1.5">HISTÓRICO</div>
              {savedLog.history.slice(-4).reverse().map((h, i) => (
                <div key={i} className="py-1 border-b border-border1/50 last:border-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-muted w-10 flex-shrink-0">
                      {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    {h.sets?.map((s, j) => s.kg ? (
                      <span key={j} className="font-mono text-[10px] text-neon font-bold">
                        {j + 1}·{s.kg}kg×{s.reps || '?'}
                      </span>
                    ) : null)}
                    {h.kg && (
                      <span className="font-mono text-[11px] text-neon font-bold">{h.kg}kg × {h.reps || '?'}</span>
                    )}
                  </div>
                  {h.obs && <span className="font-mono text-[10px] text-muted">{h.obs}</span>}
                </div>
              ))}
            </div>
          )}

          <button className={`btn-primary ${savedOk ? 'saved' : ''}`} onClick={handleSave}>
            {savedOk
              ? <span className="flex items-center justify-center gap-2"><LuCircleCheck size={16} />SALVO!</span>
              : <span className="flex items-center justify-center gap-2"><LuSave size={16} />REGISTRAR</span>
            }
          </button>
        </div>
      )}
    </div>
  )
}
