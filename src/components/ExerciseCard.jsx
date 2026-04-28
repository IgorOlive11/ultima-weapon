import { useState, useEffect } from 'react'
import {
  LuChevronDown, LuCircleCheck, LuArrowDownToLine, LuFlame, LuZap,
  LuArrowDown, LuSave, LuCheckCheck, LuDumbbell, LuRefreshCw, LuSkull, LuWaves,
} from 'react-icons/lu'
import DoomFace from './DoomFace'
import { GER_CONFIG, SET_TYPES, SET_TYPE_DESCRIPTIONS } from '../data/protocol'
import { calcLoads, fmtKg, numFeeders } from '../utils/loads'
import { useStore } from '../hooks/useStore'

const TYPE_COLORS    = { NORMAL:'#39FF14', REST_PAUSE:'#ff6600', WIDOWMAKER:'#ffdd00', BACKOFF:'#00aaff', PULSE:'#ff44ff' }
const CALC_CLS       = { NORMAL:'calc-chip-neon', REST_PAUSE:'calc-chip-orange', WIDOWMAKER:'calc-chip-yellow', BACKOFF:'calc-chip-orange', PULSE:'calc-chip-neon' }
const TYPE_CHIP_ICON = { NORMAL: LuDumbbell, REST_PAUSE: LuRefreshCw, WIDOWMAKER: LuSkull, BACKOFF: LuArrowDown, PULSE: LuWaves }

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function ExerciseCard({ exercise, weekIdx, dayIdx, exIdx, onSave, savedLog, muscleGroupIdx }) {
  const [open, setOpen]       = useState(false)
  const [topKg, setTopKg]     = useState(savedLog?.kg || '')
  const [reps, setReps]       = useState(savedLog?.reps || '')
  const [obs, setObs]         = useState(savedLog?.obs || '')
  const [saved, setSaved]     = useState(false)
  const [setDone, setSetDone] = useState(false)

  const restTimer      = useStore(s => s.restTimer)
  const startRestTimer = useStore(s => s.startRestTimer)

  const loads     = calcLoads(parseFloat(topKg))
  const feeders   = numFeeders(muscleGroupIdx ?? 0)
  const gerConf   = GER_CONFIG[exercise.ger] || GER_CONFIG[9]
  const setType   = SET_TYPES[exercise.type] || SET_TYPES.NORMAL
  const typeColor = TYPE_COLORS[exercise.type] || '#39FF14'
  const calcCls   = CALC_CLS[exercise.type] || 'calc-chip-neon'
  const ChipIcon  = TYPE_CHIP_ICON[exercise.type] || LuDumbbell

  // Clear setDone 2s after rest completes
  useEffect(() => {
    if (setDone && !restTimer.running && restTimer.seconds === 0) {
      const t = setTimeout(() => setSetDone(false), 2000)
      return () => clearTimeout(t)
    }
  }, [restTimer.running, restTimer.seconds, setDone])

  const handleSave = () => {
    if (!topKg) return
    onSave({ kg: topKg, reps, obs })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const feederPcts = [0.70, 0.75, 0.80].slice(0, feeders)

  const restIsActive = setDone && restTimer.running
  const restIsDone   = setDone && !restTimer.running && restTimer.seconds === 0
  const restPct      = restTimer.preset > 0 ? restTimer.seconds / restTimer.preset : 0

  return (
    <div className="bg-s1 border mb-1.5 overflow-hidden"
      style={{ borderLeftWidth:3, borderLeftColor: open ? typeColor : '#2a2a2a', borderColor: open ? typeColor+'44' : '#222' }}>

      <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpen(v=>!v)}>
        <DoomFace ger={exercise.ger} size={30} />
        <div className="flex-1 min-w-0">
          <div className="font-body font-bold text-sm text-ink leading-tight truncate">{exercise.name}</div>
          <div className="font-mono text-[10px] text-muted mt-0.5">
            {exercise.sets}{exercise.reps ? ` · ${exercise.reps} reps` : ''} · <span style={{color:typeColor}}>GER {exercise.ger}</span>
          </div>
        </div>
        {savedLog?.kg && <LuCircleCheck size={14} className="text-neon flex-shrink-0" />}
        <span className="font-mono text-[10px] font-bold flex-shrink-0" style={{color:typeColor}}>GER{exercise.ger}</span>
        <LuChevronDown size={14} className={`flex-shrink-0 text-muted transition-transform duration-200 ${open?'rotate-180':''}`} />
      </button>

      {open && (
        <div className="px-3 pb-3 animate-slide-down">

          {/* type chip — icon + label, no DoomFace */}
          <div className="inline-flex items-center gap-2 border px-2.5 py-1 mb-3"
            style={{borderColor:typeColor+'66', background:typeColor+'0d', color:typeColor}}>
            <ChipIcon size={11} />
            <span className="font-mono text-[10px] font-bold tracking-widest">{setType.label}</span>
          </div>

          {/* GER info */}
          <div className="flex items-center gap-2.5 bg-s2 border border-border1 p-2.5 mb-3">
            <DoomFace ger={exercise.ger} size={36} />
            <div>
              <div className="font-display text-[13px] tracking-wider" style={{color:typeColor}}>
                GER {exercise.ger} — {gerConf.title}
              </div>
              <div className="font-mono text-[10px] text-muted2 mt-1 leading-relaxed">{SET_TYPE_DESCRIPTIONS[exercise.type]}</div>
              <div className="font-mono text-[9px] text-muted mt-0.5">{gerConf.subtitle}</div>
            </div>
          </div>

          {/* prev log */}
          {savedLog?.kg && (
            <div className="flex items-center justify-between bg-neon/5 border border-neon/15 px-2.5 py-1.5 mb-3">
              <span className="font-mono text-[9px] text-muted tracking-widest">ÚLTIMO</span>
              <span className="font-display text-sm text-neon tracking-wider">{savedLog.kg}KG × {savedLog.reps||'?'} REPS</span>
            </div>
          )}

          {/* top set inputs */}
          <div className="section-label"><LuZap size={10}/>TOP SET — CARGA FINAL</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="font-mono text-[9px] text-muted tracking-widest mb-1">CARGA</div>
              <div className="flex items-center gap-1.5">
                <input className="input-base flex-1" type="number" inputMode="decimal" step="0.5" min="0" placeholder="—" value={topKg} onChange={e=>setTopKg(e.target.value)} />
                <span className="font-mono text-[10px] text-muted">kg</span>
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] text-muted tracking-widest mb-1">
                {exercise.type==='REST_PAUSE' ? 'REPS BLOCO 1' : 'REPS'}
              </div>
              <div className="flex items-center gap-1.5">
                <input className="input-base flex-1" type="number" inputMode="numeric" min="0" placeholder="—" value={reps} onChange={e=>setReps(e.target.value)} />
                <span className="font-mono text-[10px] text-muted">reps</span>
              </div>
            </div>
          </div>

          {/* warmup */}
          <div className="section-label"><LuFlame size={10}/>AQUECIMENTO</div>
          {[1,2].map(n => (
            <div key={n} className="set-row">
              <span className="font-mono text-[10px] text-muted w-4">{n}</span>
              <span className="font-mono text-[10px] text-muted2 flex-1">15-20 reps · 45% · GER 7</span>
              <span className="calc-chip calc-chip-dim">{loads ? fmtKg(loads.warmup) : '—'}</span>
            </div>
          ))}

          {/* feeders */}
          <div className="section-label mt-2"><LuArrowDownToLine size={10}/>FEEDER SETS · GER 7</div>
          {feederPcts.map((pct, i) => (
            <div key={i} className="set-row">
              <span className="font-mono text-[10px] text-muted w-4">F{i+1}</span>
              <span className="font-mono text-[10px] text-muted2 flex-1">4-8 reps · {Math.round(pct*100)}%</span>
              <span className="calc-chip calc-chip-dim">{loads ? fmtKg(loads[`feeder${i+1}`]) : '—'}</span>
            </div>
          ))}

          {/* working set */}
          <div className="section-label mt-2"><LuZap size={10}/>WORKING SET</div>
          <div className="set-row">
            <span className="font-mono text-[10px] text-muted w-4">W</span>
            <span className="font-mono text-[10px] text-muted2 flex-1">
              {exercise.type==='REST_PAUSE' && 'falha → 20s → reps → 20s → falha'}
              {exercise.type==='WIDOWMAKER' && 'falha 10-12 → continua até 15-20 sem soltar'}
              {exercise.type==='NORMAL'     && `${exercise.reps||'?'} reps · GER ${exercise.ger}`}
              {exercise.type==='BACKOFF'    && 'até a falha · GER 10'}
            </span>
            <span className={`calc-chip ${loads ? calcCls : 'calc-chip-dim'}`}>{loads ? fmtKg(loads.top) : '—'}</span>
          </div>

          {/* ── SÉRIE CONCLUÍDA ── */}
          <div className="mt-2 mb-2 space-y-1.5">
            {exercise.type === 'REST_PAUSE' ? (
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 font-display text-[12px] tracking-widest border transition-all active:opacity-80"
                  style={{ borderColor: typeColor+'55', background: typeColor+'0d', color: typeColor }}
                  onClick={() => startRestTimer(20)}
                >
                  <LuCheckCheck size={12} />
                  PAUSAR BLOCO — 0:20
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 font-display text-[12px] tracking-widest border transition-all active:opacity-80"
                  style={setDone
                    ? { background: typeColor, color: '#080808', borderColor: typeColor }
                    : { borderColor: typeColor+'55', background: typeColor+'0d', color: typeColor }}
                  onClick={() => { setSetDone(true); startRestTimer(120) }}
                >
                  <LuCheckCheck size={12} />
                  SÉRIE CONCLUÍDA — 2:00
                </button>
              </div>
            ) : (
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 font-display text-[14px] tracking-widest border transition-all active:opacity-80"
                style={setDone
                  ? { background: typeColor, color: '#080808', borderColor: typeColor }
                  : { borderColor: typeColor+'55', background: typeColor+'0d', color: typeColor }}
                onClick={() => { setSetDone(true); startRestTimer(120) }}
              >
                <LuCheckCheck size={14} />
                SÉRIE CONCLUÍDA — 2:00
              </button>
            )}

            {/* inline rest indicator */}
            {setDone && (
              restIsDone ? (
                <div className="flex items-center justify-center gap-2 py-1" style={{ color: typeColor }}>
                  <span className="font-mono text-[11px] tracking-widest">DESCANSO CONCLUÍDO ✓</span>
                </div>
              ) : restIsActive ? (
                <div className="border px-2.5 py-1.5" style={{ borderColor: typeColor+'33', background: typeColor+'08' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <DoomFace ger={exercise.ger} size={16} />
                    <span className="font-mono text-[11px] tracking-widest" style={{ color: typeColor }}>
                      DESCANSANDO {fmt(restTimer.seconds)}
                    </span>
                  </div>
                  <div className="h-[2px] w-full overflow-hidden" style={{ background: typeColor+'22' }}>
                    <div
                      className="h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${restPct * 100}%`, background: typeColor }}
                    />
                  </div>
                </div>
              ) : null
            )}
          </div>

          {/* optional backoff */}
          {(exercise.type==='NORMAL'||exercise.type==='REST_PAUSE') && (
            <>
              <div className="section-label mt-1"><LuArrowDown size={10}/>BACKOFF SET (opcional)</div>
              <div className="set-row">
                <span className="font-mono text-[10px] text-muted w-4">B</span>
                <span className="font-mono text-[10px] text-muted2 flex-1">-20/30% · falha · GER 10</span>
                <span className={`calc-chip ${loads ? 'calc-chip-orange' : 'calc-chip-dim'}`}>{loads ? fmtKg(loads.backoff) : '—'}</span>
              </div>
            </>
          )}

          {/* obs */}
          <div className="section-label mt-3">OBSERVAÇÕES</div>
          <input
            className="w-full bg-s3 border border-border2 text-ink px-3 py-2.5 font-body font-semibold text-sm tracking-wide outline-none focus:border-neon transition-colors mb-3"
            type="text" placeholder="notas..." value={obs} onChange={e=>setObs(e.target.value)}
          />

          {/* history */}
          {savedLog?.history?.length > 1 && (
            <div className="mb-3 border-t border-border1 pt-2">
              <div className="font-mono text-[9px] text-muted tracking-[0.25em] mb-1.5">HISTÓRICO</div>
              {savedLog.history.slice(-4).reverse().map((h,i) => (
                <div key={i} className="flex gap-2 items-baseline py-1 border-b border-border1/50 last:border-0">
                  <span className="font-mono text-[10px] text-muted w-10 flex-shrink-0">
                    {new Date(h.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}
                  </span>
                  <span className="font-mono text-[11px] text-neon font-bold">{h.kg}kg × {h.reps||'?'}</span>
                  {h.obs && <span className="font-mono text-[10px] text-muted truncate">{h.obs}</span>}
                </div>
              ))}
            </div>
          )}

          <button className={`btn-primary ${saved?'saved':''}`} onClick={handleSave}>
            {saved
              ? <span className="flex items-center justify-center gap-2"><LuCircleCheck size={16}/>SALVO!</span>
              : <span className="flex items-center justify-center gap-2"><LuSave size={16}/>REGISTRAR</span>
            }
          </button>
        </div>
      )}
    </div>
  )
}
