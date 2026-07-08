import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LuPlay, LuCheck, LuSwords, LuTriangleAlert,
  LuFlame, LuDumbbell, LuPlus, LuMinus,
} from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { DAY_NAMES, SET_TYPES, GER_CONFIG, getWeightQuestion, MIN_PLATE_INCREMENT } from '../data/protocol'
import { ACHIEVEMENTS } from '../data/achievements'
import DoomFace from '../components/DoomFace'
import { round25 } from '../utils/loads'

// ─── helpers ──────────────────────────────────────────────────────────────────

const WEEK_LABELS = ['S01','S02','S03','S04','S05','S06','S07','S08']

function fmtKg(v) {
  if (!v || v <= 0) return '—'
  return `${round25(v)} KG`
}

function roundToMinPlate(v) {
  return Math.round(v / MIN_PLATE_INCREMENT) * MIN_PLATE_INCREMENT
}

// ─── ConfirmFinishModal ───────────────────────────────────────────────────────

function ConfirmModal({ title, subtitle, confirmLabel, confirmClass, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/85 flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-s1 border border-neon/30 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="font-display text-xl tracking-[0.2em] text-neon mb-2">{title}</div>
          <div className="font-mono text-[11px] text-muted">{subtitle}</div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 font-display text-sm tracking-[0.15em] border border-border2 text-muted hover:text-ink transition-colors"
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-display text-sm tracking-[0.15em] ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── gamification ─────────────────────────────────────────────────────────────

function checkGamification(history) {
  if (!history?.sets?.length) return null
  const normal = history.sets.filter(s => s.setType === 'NORMAL' && s.repRange && s.reps != null)
  if (!normal.length) return null
  for (const s of normal) {
    const [lo] = s.repRange.split('-').map(Number)
    if (!isNaN(lo) && s.reps < lo) return 'angry'
  }
  for (const s of normal) {
    const parts = s.repRange.split('-').map(Number)
    const hi = parts.length > 1 ? parts[1] : parts[0]
    if (!isNaN(hi) && s.reps > hi) return 'happy'
  }
  return null
}

const ANGRY_LINES = [
  'Ficou abaixo do range. Isso não é treino, é passeio.',
  'Menos reps que o alvo? Que vergonha. Sem desculpa hoje.',
  'O Doomguy ficou com pena — e ele não tem piedade de nada.',
  'Abaixo do range. Hoje você vai pagar essa dívida.',
]
const HAPPY_LINES = [
  'Acima do rep range! Aumente o peso agora. Não deixa isso mofar.',
  'Rep range superado — progressão de carga obrigatória.',
  'Você destruiu o alvo. Capriche no peso antes que sua força envergonhe você.',
  'Acima do alvo. Sobe a carga ou vira decoração da academia.',
]
function rndLine(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function GamificationPopup({ type, exerciseName, onDismiss }) {
  const isAngry = type === 'angry'
  const color   = isAngry ? '#FF1414' : '#39FF14'
  const face    = isAngry ? 'ger12'   : 'ger13'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[450] bg-black/90 flex items-center justify-center px-5"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.82, y: 32 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.82, y: 32 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="w-full max-w-sm bg-s1 border p-6 text-center"
        style={{ borderColor: color + '55' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <DoomFace face={face} size={88}/>
        </div>
        <div className="font-display text-xl tracking-[0.2em] mb-2" style={{ color }}>
          {isAngry ? 'QUE COVARDIA!' : 'PROGRESSÃO!'}
        </div>
        <div className="font-display text-sm tracking-wider mb-3 text-ink/70">
          {exerciseName}
        </div>
        <div className="font-mono text-[11px] text-muted leading-relaxed mb-5">
          {rndLine(isAngry ? ANGRY_LINES : HAPPY_LINES)}
          {!isAngry && (
            <span className="block mt-1.5 text-neon/80">Avalie o peso antes de confirmar.</span>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-3 font-display text-sm tracking-[0.2em] border transition-colors hover:opacity-80"
          style={{ borderColor: color, color }}
        >
          {isAngry ? 'VAI TRABALHAR' : 'BORA PROGREDIR'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── AchievementPopup ─────────────────────────────────────────────────────────

function AchievementPopup({ achievementId, onDismiss }) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!achievement) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[460] bg-black/90 flex items-center justify-center px-5"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.82, y: 32 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.82, y: 32 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="w-full max-w-sm bg-s1 border border-yellow-400/40 p-6 text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <DoomFace face={achievement.face} size={88} />
        </div>
        <div className="font-mono text-[9px] text-yellow-400 tracking-[0.3em] mb-1">CONQUISTA DESBLOQUEADA</div>
        <div className="font-display text-xl tracking-[0.2em] mb-2 text-yellow-400">
          {achievement.title}
        </div>
        <div className="font-mono text-[11px] text-muted leading-relaxed mb-5">
          {achievement.desc}
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-3 font-display text-sm tracking-[0.2em] border border-yellow-400/60 text-yellow-400 transition-colors hover:bg-yellow-400/10"
        >
          RECEBER
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── step cards ───────────────────────────────────────────────────────────────

function fmtSetResult(s) {
  if (!s) return ''
  switch (s.setType) {
    case 'REST_PAUSE':
      return s.blocks?.length
        ? s.blocks.map((b, i) => `B${i+1}: ${b.reps}r`).join(', ') + ` · ${fmtKg(s.kg)}`
        : fmtKg(s.kg)
    case 'MUSCLE_ROUND': {
      const partial = s.failedReps > 0 ? ` (${s.failedReps}r parcial)` : ''
      return `${s.blocks ?? '?'} blocos${partial} · ${fmtKg(s.kg)}`
    }
    case 'WIDOWMAKER':
      return `${s.reps ?? '?'} reps · ${fmtKg(s.kg)}`
    case 'PULSE':
      return fmtKg(s.kg)
    default:
      return s.reps ? `${s.reps} reps · ${fmtKg(s.kg)}` : fmtKg(s.kg)
  }
}

// Compact last-session badge shown on all exercise cards
function PrevRecord({ prevData, setDef }) {
  if (!prevData) return null

  let text
  if (prevData.setType) {
    text = fmtSetResult(prevData)
  } else {
    text = prevData.reps ? `${prevData.reps} reps · ${fmtKg(prevData.kg)}` : fmtKg(prevData.kg)
  }

  let alert = null
  if (setDef?.type === 'NORMAL' && setDef?.repRange && prevData.reps > 0) {
    const parts = setDef.repRange.split('-')
    const min = parseInt(parts[0])
    const max = parseInt(parts[parts.length - 1])
    if (!isNaN(max) && prevData.reps > max)       alert = 'over'
    else if (!isNaN(min) && prevData.reps < min)  alert = 'under'
  }

  return (
    <div className={`border px-3 py-2 mb-2 ${
      alert === 'over'  ? 'border-neon/30 bg-neon/5' :
      alert === 'under' ? 'border-yellow-500/30 bg-yellow-500/5' :
      'border-border1 bg-s2/50'
    }`}>
      <div className={`font-mono text-[9px] tracking-[0.2em] mb-0.5 ${
        alert === 'over' ? 'text-neon' : alert === 'under' ? 'text-yellow-400' : 'text-muted/60'
      }`}>
        ÚLTIMO REGISTRO
      </div>
      <div className="font-mono text-[10px] text-muted">{text}</div>
      {alert === 'over' && (
        <div className="font-mono text-[9px] text-neon mt-1 leading-snug">
          Você superou as expectativas no último treino. Progrida a carga e cresça.
        </div>
      )}
      {alert === 'under' && (
        <div className="font-mono text-[9px] text-yellow-400 mt-1 leading-snug">
          Você foi egoísta com esse peso no último treino. Reduz a carga e para de fugir do exercício.
        </div>
      )}
    </div>
  )
}

function WeightQuestionCard({ step, onConfirm, history, isLocked }) {
  const [weight, setWeight] = useState('')
  const question = getWeightQuestion(step.setDef)
  const typeInfo = SET_TYPES[step.setDef?.type] || SET_TYPES.NORMAL

  const handleConfirm = () => {
    const w = parseFloat(weight)
    if (!w || w <= 0) return
    onConfirm(w)
  }

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      {/* type strip */}
      <div className="h-1" style={{ background: typeInfo.color }} />

      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.muscle}</div>
        <div className="font-display text-lg tracking-wider text-ink mb-1 truncate">{step.exerciseName}</div>
        <div
          className="font-display text-xs tracking-[0.15em] mb-3"
          style={{ color: typeInfo.color }}
        >
          {typeInfo.label}
        </div>

        <div className="bg-s2 border border-border1 px-3 py-3 mb-3">
          <div className="font-mono text-[10px] text-muted tracking-wider leading-snug">
            {question}
          </div>
        </div>

        {/* last session history */}
        {history && (
          <div className="border border-border1 bg-s2/50 px-3 py-2 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-[9px] text-neon tracking-[0.2em]">ÚLTIMO REGISTRO</div>
              <div className="font-mono text-[9px] text-muted/50">
                {new Date(history.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                {history.kg > 0 && <span className="text-neon/70 ml-1.5">{fmtKg(history.kg)}</span>}
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 max-h-[74px] overflow-hidden">
              {history.warmups?.filter(w => w.reps > 0).slice(0, 2).map((w, i) => (
                <>
                  <span key={`wl${i}`} className="font-mono text-[9px] text-muted/50">AQUEC. {i+1}</span>
                  <span key={`wr${i}`} className="font-mono text-[10px] text-muted">{w.reps}r · {fmtKg(w.kg)}</span>
                </>
              ))}
              {history.feeders?.filter(f => f.reps > 0).slice(0, 2).map((f, i) => (
                <>
                  <span key={`fl${i}`} className="font-mono text-[9px] text-muted/50">PREP {i+1}</span>
                  <span key={`fr${i}`} className="font-mono text-[10px] text-muted">{f.reps}r · {fmtKg(f.kg)}</span>
                </>
              ))}
              {history.sets?.slice(0, 3).map((s, i) => (
                <>
                  <span key={`sl${i}`} className="font-mono text-[9px] text-muted/50">SÉRIE {i+1}</span>
                  <span key={`sr${i}`} className="font-mono text-[10px] text-ink/80">{fmtSetResult(s)}</span>
                </>
              ))}
            </div>
          </div>
        )}

        {/* weight input */}
        <div className="flex items-center gap-3 mt-auto mb-3">
          <button
            onClick={() => setWeight(w => String(Math.max(0, round25(parseFloat(w||0) - 2.5))))}
            className="w-12 h-12 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          >
            <LuMinus size={18}/>
          </button>
          <div className="flex-1 relative">
            <input
              type="number"
              inputMode="decimal"
              className="w-full bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-2.5 focus:border-neon outline-none transition-colors"
              placeholder="0"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted">KG</span>
          </div>
          <button
            onClick={() => setWeight(w => String(round25(parseFloat(w||0) + 2.5)))}
            className="w-12 h-12 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          >
            <LuPlus size={18}/>
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!parseFloat(weight) || isLocked}
          className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          style={{ background: typeInfo.color }}
        >
          CONFIRMAR PESO
        </button>
      </div>
    </div>
  )
}

function WarmupFeederCard({ step, workingWeight, onDone, isLocked, prevData, savedResult }) {
  const defaultKg = workingWeight > 0 ? roundToMinPlate(workingWeight * step.pct) : 0
  const [reps, setReps] = useState(savedResult?.reps != null ? String(savedResult.reps) : '')
  const [kg, setKg]     = useState(savedResult?.kg   != null ? String(savedResult.kg)   : (defaultKg > 0 ? String(defaultKg) : ''))
  const isWarmup = step.type === 'WARMUP'

  const handleDone = () => {
    onDone({ reps: parseInt(reps) || 0, kg: parseFloat(kg) || defaultKg })
  }

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1 bg-muted/30" />
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.exerciseName}</div>

        <div className="font-display text-lg tracking-wider text-ink mb-1 truncate">
          {isWarmup
            ? `AQUECIMENTO ${step.setNum} DE ${step.totalSets ?? 2}`
            : `PREP ${step.setNum} DE ${step.totalSets ?? 1}`}
        </div>
        <div className="font-mono text-[10px] text-muted/60 tracking-wider mb-3">
          {isWarmup ? 'Prepare os tecidos' : `Ativação progressiva — GER ${step.gerTarget ?? 7}`}
        </div>

        <div className="bg-s2 border border-border1 px-3 py-3 mb-3 flex items-center gap-4">
          <div>
            <div className="font-mono text-[10px] text-muted tracking-wider mb-1">REPS</div>
            <div className="font-display text-2xl tracking-wider text-ink">{step.reps}</div>
            {!isWarmup && step.gerTarget != null && (
              <div className="font-mono text-[9px] text-neon/70 mt-0.5">GER {step.gerTarget}</div>
            )}
          </div>
          {workingWeight > 0 && (
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] text-muted tracking-wider mb-1">CARGA</div>
              <input
                type="number"
                inputMode="decimal"
                className="w-full bg-s1 border border-border2 text-center font-display text-xl tracking-wider text-neon py-1.5 focus:border-neon outline-none transition-colors"
                value={kg}
                onChange={e => setKg(e.target.value)}
              />
            </div>
          )}
        </div>

        {!isWarmup && (
          <div className="flex items-center gap-2 mb-3">
            <DoomFace face={GER_CONFIG[step.gerTarget ?? 7]?.face} size={28}/>
            <div className="font-mono text-[10px] text-muted leading-relaxed">
              Mantenha GER {step.gerTarget ?? 7} nestas séries.<br/>Sentir o movimento, não chegar perto da falha.
            </div>
          </div>
        )}

        <PrevRecord prevData={prevData} />

        {/* reps done */}
        <div className="mt-auto mb-3">
          <label className="font-mono text-[10px] text-muted tracking-wider block mb-1.5">REPS REALIZADAS</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
              className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
            ><LuMinus size={16}/></button>
            <input
              type="number" inputMode="numeric"
              className="flex-1 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-2 focus:border-neon outline-none transition-colors"
              placeholder="0"
              value={reps}
              onChange={e => setReps(e.target.value)}
            />
            <button
              onClick={() => setReps(r => String((parseInt(r)||0) + 1))}
              className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
            ><LuPlus size={16}/></button>
          </div>
        </div>

        <button
          onClick={handleDone}
          disabled={isLocked}
          className="w-full py-3 font-display text-sm tracking-[0.2em] bg-s2 border border-border2 text-muted hover:text-ink hover:border-neon disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <LuCheck size={16}/> CONCLUÍDO
        </button>
      </div>
    </div>
  )
}

function NormalSetCard({ step, workingWeight, onDone, isLocked, prevData, savedResult }) {
  const [repsHit, setRepsHit] = useState(savedResult?.reps != null ? String(savedResult.reps) : '')
  const typeInfo  = SET_TYPES[step.setDef.type] || SET_TYPES.NORMAL
  const gerCfg    = GER_CONFIG[step.setDef.ger] || GER_CONFIG[10]

  const handleDone = () => {
    onDone({ kg: workingWeight, reps: parseInt(repsHit) || 0 })
  }

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1" style={{ background: typeInfo.color }} />
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.muscle}</div>
        <div className="font-display text-lg tracking-wider text-ink mb-0.5 truncate">{step.exerciseName}</div>
        <div className="font-display text-xs tracking-[0.2em] mb-3" style={{ color: typeInfo.color }}>
          {step.totalSets > 1 ? `SÉRIE ${step.setNum} DE ${step.totalSets}` : 'SÉRIE PRINCIPAL'}
        </div>

        {/* GER face */}
        <div className="flex items-center gap-3 bg-s2 border border-border1 px-3 py-2.5 mb-3">
          <DoomFace face={gerCfg.face} size={40}/>
          <div>
            <div className="font-display text-sm tracking-wider" style={{ color: typeInfo.color }}>
              {gerCfg.label}
            </div>
            <div className="font-mono text-[11px] text-muted">{gerCfg.title}</div>
            <div className="font-mono text-[10px] text-muted/60 mt-0.5">{gerCfg.subtitle}</div>
          </div>
        </div>

        {/* weight + rep range */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-s2 border border-border1 px-3 py-2.5 text-center">
            <div className="font-mono text-[10px] text-muted tracking-wider mb-1">CARGA</div>
            <div className="font-display text-2xl tracking-wider text-neon">{fmtKg(workingWeight)}</div>
          </div>
          {step.setDef.repRange && (
            <div className="flex-1 bg-s2 border border-border1 px-3 py-3 text-center">
              <div className="font-mono text-[10px] text-muted tracking-wider mb-1">REP RANGE</div>
              <div className="font-display text-2xl tracking-wider text-ink">{step.setDef.repRange}</div>
            </div>
          )}
        </div>

        <PrevRecord prevData={prevData} setDef={step.setDef} />

        {/* reps hit input */}
        <div className="mt-auto mb-3">
          <label className="font-mono text-[10px] text-muted tracking-wider block mb-1.5">REPS REALIZADAS</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRepsHit(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
              className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
            ><LuMinus size={16}/></button>
            <input
              type="number"
              inputMode="numeric"
              className="flex-1 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-2 focus:border-neon outline-none transition-colors"
              placeholder="0"
              value={repsHit}
              onChange={e => setRepsHit(e.target.value)}
            />
            <button
              onClick={() => setRepsHit(r => String((parseInt(r)||0) + 1))}
              className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
            ><LuPlus size={16}/></button>
          </div>
        </div>

        <button
          onClick={handleDone}
          disabled={isLocked}
          className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
          style={{ background: typeInfo.color }}
        >
          <LuCheck size={16}/> SÉRIE CONCLUÍDA
        </button>
      </div>
    </div>
  )
}

function RestPauseCard({ step, workingWeight, onDone, isLocked, prevData }) {
  const [blocks, setBlocks]   = useState([{ reps: null }])
  const [phase, setPhase]     = useState('block') // 'block' | 'rest20'
  const [timer20, setTimer20] = useState(null)
  const ivRef = useRef(null)
  const typeInfo  = SET_TYPES.REST_PAUSE

  const currentBlock = blocks.length - 1
  const isDone = blocks.length >= 2 && blocks[blocks.length-1].reps !== null

  const advanceToNextBlock = () => {
    setPhase('block')
    setTimer20(null)
    setBlocks(prev => [...prev, { reps: null }])
  }

  const handleBlockDone = (reps) => {
    const updated = blocks.map((b, i) => i === currentBlock ? { reps } : b)
    setBlocks(updated)
    if (updated.length < 2) {
      setPhase('rest20')
      let t = 20
      setTimer20(t)
      ivRef.current = setInterval(() => {
        t--
        setTimer20(t)
        if (t <= 0) {
          clearInterval(ivRef.current)
          advanceToNextBlock()
        }
      }, 1000)
    }
  }

  const handleSkipRest = () => {
    if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null }
    advanceToNextBlock()
  }

  const handleFinish = () => {
    onDone({ kg: workingWeight, blocks })
  }

  const [localReps, setLocalReps] = useState('')

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1" style={{ background: typeInfo.color }}/>
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.muscle}</div>
        <div className="font-display text-lg tracking-wider text-ink mb-0.5 truncate">{step.exerciseName}</div>
        <div className="font-display text-xs tracking-[0.2em] mb-3" style={{ color: typeInfo.color }}>
          DC STYLE REST PAUSE · {fmtKg(workingWeight)}
        </div>

        {/* GER face */}
        <div className="flex items-center gap-3 bg-s2 border border-border1 px-3 py-2.5 mb-3">
          <DoomFace face={GER_CONFIG[typeInfo.ger].face} size={40}/>
          <div>
            <div className="font-display text-sm tracking-wider" style={{ color: typeInfo.color }}>
              {GER_CONFIG[typeInfo.ger].label}
            </div>
            <div className="font-mono text-[11px] text-muted">{GER_CONFIG[typeInfo.ger].title}</div>
          </div>
        </div>

        {/* instructions */}
        <div className="bg-s2 border border-border1 px-3 py-2.5 mb-3 font-mono text-[10px] text-muted leading-snug">
          Carga para ~8 reps. Vai até a falha → <span className="text-orange-400">Pausa 20s</span> → vai até a falha de novo.
          <br/>Quando chegar 10-11 reps no bloco 1: progride carga.
        </div>

        {/* blocks */}
        <div className="flex flex-col gap-1.5 mb-3">
          {blocks.map((b, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 border px-3 py-2 ${
                i < currentBlock ? 'border-border2 bg-s2 opacity-60' :
                i === currentBlock ? 'border-orange-500/50 bg-orange-500/5' :
                'border-border1 opacity-30'
              }`}
            >
              <div className="font-display text-sm tracking-wider" style={{ color: typeInfo.color }}>
                BLOCO {i+1}
              </div>
              <div className="flex-1 font-mono text-[11px] text-muted">
                {b.reps !== null ? `${b.reps} reps` : i === currentBlock ? 'em andamento…' : '—'}
              </div>
              {b.reps !== null && <LuCheck size={14} className="text-orange-400"/>}
            </div>
          ))}
        </div>

        <PrevRecord prevData={prevData} />

        {/* 20s inter-block countdown */}
        {phase === 'rest20' && timer20 !== null && (
          <div className="bg-orange-500/10 border border-orange-500/30 px-4 py-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] text-orange-400 tracking-wider mb-1">PAUSA 20s</div>
                <div className="font-display text-4xl tracking-wider text-orange-400">{timer20}</div>
              </div>
              <button
                onClick={handleSkipRest}
                className="px-3 py-2 font-display text-xs tracking-wider border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition-colors"
              >
                PULAR
              </button>
            </div>
          </div>
        )}

        {/* block rep input */}
        {phase === 'block' && !isDone && (
          <div className="mt-auto mb-3">
            <label className="font-mono text-[10px] text-muted tracking-wider block mb-1.5">
              REPS DO BLOCO {currentBlock + 1}
            </label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setLocalReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
                className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
              ><LuMinus size={16}/></button>
              <input
                type="number" inputMode="numeric"
                className="flex-1 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-2 focus:border-neon outline-none transition-colors"
                placeholder="0"
                value={localReps}
                onChange={e => setLocalReps(e.target.value)}
              />
              <button
                onClick={() => setLocalReps(r => String((parseInt(r)||0) + 1))}
                className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
              ><LuPlus size={16}/></button>
            </div>
            <button
              onClick={() => { handleBlockDone(parseInt(localReps)||0); setLocalReps('') }}
              disabled={!parseInt(localReps)}
              className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 border-0"
              style={{ background: typeInfo.color }}
            >
              BLOCO {currentBlock+1} CONCLUÍDO
            </button>
          </div>
        )}

        {isDone && (
          <button
            onClick={handleFinish}
            disabled={isLocked}
            className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
            style={{ background: typeInfo.color }}
          >
            <LuFlame size={16}/> REST PAUSE CONCLUÍDO
          </button>
        )}
      </div>
    </div>
  )
}

function MuscleRoundCard({ step, workingWeight, onDone, isLocked, prevData }) {
  const TOTAL_BLOCKS = 12
  const [completedBlocks, setCompletedBlocks] = useState(0)
  const [failedInfo, setFailedInfo]           = useState(null) // { block, reps }
  const [blockTimer, setBlockTimer]           = useState(null)
  const [phase, setPhase]                     = useState('ready') // ready | rest10 | done
  const [currentReps, setCurrentReps]         = useState('')
  const ivRef = useRef(null)
  const typeInfo = SET_TYPES.MUSCLE_ROUND

  const resumeReady = () => { setPhase('ready'); setBlockTimer(null); setCurrentReps('') }

  const handleBlockDone = () => {
    if (phase !== 'ready') return
    const next = completedBlocks + 1
    setCompletedBlocks(next)
    setCurrentReps('')
    if (next >= TOTAL_BLOCKS) { setPhase('done'); return }
    setPhase('rest10')
    let t = 10
    setBlockTimer(t)
    ivRef.current = setInterval(() => {
      t--
      setBlockTimer(t)
      if (t <= 0) { clearInterval(ivRef.current); resumeReady() }
    }, 1000)
  }

  const handleSkipRest = () => {
    if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null }
    resumeReady()
  }

  const handleFail = () => {
    const reps = parseInt(currentReps) || 0
    setFailedInfo({ block: completedBlocks + 1, reps })
    setPhase('done')
  }

  const handleFinish = () => {
    onDone({ kg: workingWeight, blocks: completedBlocks, failedBlock: failedInfo?.block, failedReps: failedInfo?.reps || 0 })
  }

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1" style={{ background: typeInfo.color }}/>
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.muscle}</div>
        <div className="font-display text-lg tracking-wider text-ink mb-0.5 truncate">{step.exerciseName}</div>
        <div className="font-display text-xs tracking-[0.2em] mb-3" style={{ color: typeInfo.color }}>
          MUSCLE ROUND · {fmtKg(workingWeight)}
        </div>

        <div className="bg-s2 border border-border1 px-3 py-2.5 mb-3 font-mono text-[10px] text-muted leading-snug">
          Blocos de <span className="text-red-400 font-bold">4 reps</span> com 10s de descanso entre blocos.
          Continue até falhar uma vez.
        </div>

        <PrevRecord prevData={prevData} />

        {/* block grid */}
        <div className="grid grid-cols-6 gap-1.5 mb-3">
          {Array(TOTAL_BLOCKS).fill(null).map((_, i) => {
            const done   = i < completedBlocks
            const isFail = failedInfo !== null && i === failedInfo.block - 1
            const isCurr = i === completedBlocks && phase === 'ready' && failedInfo === null
            return (
              <div
                key={i}
                className={`h-8 flex items-center justify-center border font-display text-xs transition-all ${
                  isFail ? 'border-red-500 bg-red-500/20 text-red-400' :
                  done   ? 'border-red-400/60 bg-red-400/20 text-red-300' :
                  isCurr ? 'border-red-500 bg-red-500/10 text-red-400' :
                           'border-border2 text-muted/30'
                }`}
              >
                {isFail ? '✕' : done ? '✓' : i+1}
              </div>
            )
          })}
        </div>

        {/* 10s inter-block rest */}
        {phase === 'rest10' && blockTimer !== null && (
          <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] text-red-400 tracking-wider mb-1">DESCANSO 10s</div>
                <div className="font-display text-4xl tracking-wider text-red-400">{blockTimer}</div>
              </div>
              <button
                onClick={handleSkipRest}
                className="px-3 py-2 font-display text-xs tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                PULAR
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && failedInfo && (
          <div className="bg-red-500/10 border border-red-500/30 px-3 py-2 mb-3 text-center">
            <div className="font-mono text-[11px] text-red-400">
              Falha no bloco {failedInfo.block}
              {failedInfo.reps > 0 && ` · ${failedInfo.reps} reps`}
              {' '}— {completedBlocks} blocos completos
            </div>
          </div>
        )}

        {/* current block reps input + actions */}
        {phase === 'ready' && failedInfo === null && (
          <>
            <div className="mt-auto mb-3">
              <label className="font-mono text-[10px] text-muted tracking-wider block mb-1.5">
                REPS NO BLOCO {completedBlocks + 1} (deixe 0 se não iniciou)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
                  className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
                ><LuMinus size={16}/></button>
                <input
                  type="number" inputMode="numeric"
                  className="flex-1 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-2 focus:border-neon outline-none transition-colors"
                  placeholder="0"
                  value={currentReps}
                  onChange={e => setCurrentReps(e.target.value)}
                />
                <button
                  onClick={() => setCurrentReps(r => String((parseInt(r)||0) + 1))}
                  className="w-11 h-11 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
                ><LuPlus size={16}/></button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBlockDone}
                className="flex-1 py-3 font-display text-sm tracking-[0.15em] text-bg"
                style={{ background: typeInfo.color }}
              >
                BLOCO {completedBlocks+1} FEITO
              </button>
              <button
                onClick={handleFail}
                className="px-4 py-3 border border-red-500/40 text-red-400 font-display text-xs tracking-wider hover:bg-red-500/10 transition-colors"
              >
                FALHOU
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <button
            onClick={handleFinish}
            disabled={isLocked}
            className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
            style={{ background: typeInfo.color }}
          >
            <LuCheck size={16}/> MUSCLE ROUND CONCLUÍDO
          </button>
        )}
      </div>
    </div>
  )
}

function WidowmakerCard({ step, workingWeight, onDone, isLocked, prevData }) {
  const [reps, setReps]   = useState(0)
  const [phase, setPhase] = useState('working') // 'working' | 'extending'
  const typeInfo          = SET_TYPES.WIDOWMAKER

  const handleFail = () => {
    setPhase('extending')
  }

  const handleFinish = () => {
    onDone({ kg: workingWeight, reps })
  }

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1" style={{ background: typeInfo.color }}/>
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.muscle}</div>
        <div className="font-display text-lg tracking-wider text-ink mb-0.5 truncate">{step.exerciseName}</div>
        <div className="font-display text-xs tracking-[0.2em] mb-3" style={{ color: typeInfo.color }}>
          DC STYLE WIDOWMAKER · {fmtKg(workingWeight)}
        </div>

        {/* GER face */}
        <div className="flex items-center gap-3 bg-s2 border border-border1 px-3 py-2.5 mb-3">
          <DoomFace face={GER_CONFIG[typeInfo.ger].face} size={40}/>
          <div>
            <div className="font-display text-sm tracking-wider" style={{ color: typeInfo.color }}>
              {GER_CONFIG[typeInfo.ger].label}
            </div>
            <div className="font-mono text-[11px] text-muted">{GER_CONFIG[typeInfo.ger].title}</div>
          </div>
        </div>

        {phase === 'working' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 mb-3 font-mono text-[10px] text-yellow-200 leading-snug">
            <span className="text-yellow-400 font-bold">FASE 1:</span> Carga pra falha TOTAL em 10-12 reps.
            Não economize nada.
          </div>
        )}

        {phase === 'extending' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 mb-3 font-mono text-[10px] text-yellow-200 leading-snug">
            <span className="text-yellow-400 font-bold">FASE 2:</span> Continue até 15-20 reps.
            Dê quanto intervalo precisar entre reps. <span className="text-yellow-400">Não solte a barra.</span>
          </div>
        )}

        <PrevRecord prevData={prevData} />

        {/* rep counter */}
        <div className="bg-s2 border border-border1 px-4 py-3 mb-3 text-center">
          <div className="font-mono text-[10px] text-muted tracking-wider mb-2">REPS TOTAIS</div>
          <div className="font-display text-4xl tracking-wider" style={{ color: typeInfo.color }}>{reps}</div>
          <div className="font-mono text-[10px] mt-2">
            {phase === 'working' && reps < 8 && reps > 0 && (
              <span className="text-muted">{8 - reps} reps para a zona de falha</span>
            )}
            {phase === 'working' && reps >= 8 && reps < 10 && (
              <span className="text-yellow-400">Zona de falha se aproximando</span>
            )}
            {phase === 'working' && reps >= 10 && reps <= 12 && (
              <span className="text-yellow-400">Zona de falha — ótimo!</span>
            )}
            {phase === 'working' && reps > 12 && (
              <span className="text-yellow-400">Passou da zona — vá para fase 2!</span>
            )}
            {phase === 'extending' && reps < 20 && (
              <span className="text-yellow-400">{20 - reps} reps até 20</span>
            )}
            {phase === 'extending' && reps >= 20 && (
              <span className="text-neon">WIDOWMAKER COMPLETO!</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-auto mb-3">
          <button
            onClick={() => setReps(r => Math.max(0, r-1))}
            className="w-12 h-12 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          ><LuMinus size={18}/></button>
          <button
            onClick={() => setReps(r => r+1)}
            className="flex-1 py-3 font-display text-xl tracking-wider border border-border2 text-ink hover:border-neon transition-colors"
          >
            +1 REP
          </button>
        </div>

        {phase === 'working' && reps >= 8 && (
          <button
            onClick={handleFail}
            className="w-full py-3 font-display text-sm tracking-[0.15em] border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors mb-3"
          >
            ATINGIU FALHA → FASE 2
          </button>
        )}

        {phase === 'extending' && reps >= 15 && (
          <button
            onClick={handleFinish}
            disabled={isLocked}
            className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: typeInfo.color }}
          >
            <LuCheck size={16}/> WIDOWMAKER CONCLUÍDO
          </button>
        )}
      </div>
    </div>
  )
}

function PulseSetCard({ step, workingWeight, onDone, isLocked, prevData }) {
  const SEQUENCE = [
    { reps: 5, pulses: 5 },
    { reps: 4, pulses: 5 },
    { reps: 3, pulses: 5 },
    { reps: 2, pulses: 5 },
    { reps: 1, pulses: null }, // pulses to failure
  ]
  const [current, setCurrent] = useState(0)
  const [phase, setPhase]     = useState('reps') // 'reps' | 'pulses'
  const typeInfo               = SET_TYPES.PULSE
  const isDone = current >= SEQUENCE.length

  const handlePhaseNext = () => {
    const step2 = SEQUENCE[current]
    if (phase === 'reps') {
      if (step2.pulses !== null) setPhase('pulses')
      else { setPhase('failure'); }
    } else if (phase === 'pulses') {
      setCurrent(c => c + 1)
      setPhase('reps')
    } else {
      setCurrent(c => c + 1)
    }
  }

  const handleFinish = () => {
    onDone({ kg: workingWeight })
  }

  const cur = SEQUENCE[current] || {}

  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1" style={{ background: typeInfo.color }}/>
      <div className="p-4 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="font-mono text-[10px] text-muted tracking-[0.25em] mb-1">{step.muscle}</div>
        <div className="font-display text-lg tracking-wider text-ink mb-0.5 truncate">{step.exerciseName}</div>
        <div className="font-display text-xs tracking-[0.2em] mb-3" style={{ color: typeInfo.color }}>
          DC STYLE PULSE SET · {fmtKg(workingWeight)}
        </div>

        <PrevRecord prevData={prevData} />

        {/* sequence display */}
        <div className="flex flex-col gap-1 mb-3">
          {SEQUENCE.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 border text-sm transition-all ${
                i < current ? 'border-border2 opacity-40 bg-s2' :
                i === current ? 'border-pink-500/50 bg-pink-500/5' :
                'border-border1 opacity-20'
              }`}
            >
              <div className="font-display text-[13px] tracking-wider w-8" style={{ color: typeInfo.color }}>
                {i+1}.
              </div>
              <div className="flex-1 font-mono text-[11px] text-muted">
                {s.reps} reps completas
                {s.pulses ? ` + ${s.pulses} pulsos` : ' + pulsos até a falha'}
              </div>
              {i < current && <LuCheck size={12} className="text-pink-400"/>}
              {i === current && (
                <div className="font-mono text-[10px]" style={{ color: typeInfo.color }}>
                  {phase === 'reps' ? '← reps' : phase === 'pulses' ? '← pulsos' : '← até falha'}
                </div>
              )}
            </div>
          ))}
        </div>

        {!isDone && (
          <>
            <div className="bg-pink-500/10 border border-pink-500/30 px-4 py-3 text-center mt-auto mb-3">
              <div className="font-mono text-[10px] text-muted tracking-wider mb-1">AGORA</div>
              <div className="font-display text-2xl tracking-wider" style={{ color: typeInfo.color }}>
                {phase === 'reps' ? `${cur.reps} REPS COMPLETAS` :
                 phase === 'pulses' ? `${cur.pulses} PULSOS PARCIAIS` :
                 'PULSOS ATÉ A FALHA'}
              </div>
            </div>

            <button
              onClick={handlePhaseNext}
              className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg"
              style={{ background: typeInfo.color }}
            >
              {phase === 'reps' ? 'REPS FEITAS →' :
               phase === 'pulses' ? 'PULSOS FEITOS →' :
               'FALHOU → CONCLUIR'}
            </button>
          </>
        )}

        {isDone && (
          <button
            onClick={handleFinish}
            disabled={isLocked}
            className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
            style={{ background: typeInfo.color }}
          >
            <LuCheck size={16}/> PULSE SET CONCLUÍDO
          </button>
        )}
      </div>
    </div>
  )
}

// ─── InlineRestTimer ─────────────────────────────────────────────────────────

function InlineRestTimer({ onNext }) {
  const restTimer     = useStore(s => s.restTimer)
  const stopRestTimer = useStore(s => s.stopRestTimer)

  const isDone  = !restTimer.running && restTimer.seconds === 0
  const pct     = restTimer.preset > 0 ? restTimer.seconds / restTimer.preset : 0
  const barColor = pct > 0.5 ? '#39FF14' : pct > 0.2 ? '#ffaa00' : '#ff2d2d'
  const fmtTime  = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleNext = () => {
    stopRestTimer()
    onNext()
  }

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="mt-3 bg-s1 border border-border2 overflow-hidden"
    >
      {/* progress bar */}
      <div className="h-[3px] bg-border1">
        <motion.div
          className="h-full"
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
          style={{ background: barColor }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <div>
          <div className="font-mono text-[9px] text-muted tracking-[0.2em]">
            {isDone ? 'PRONTO' : 'DESCANSO'}
          </div>
          <motion.div
            key={restTimer.seconds}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-display text-3xl leading-none tracking-wider ${isDone ? 'text-neon' : 'text-ink'}`}
          >
            {isDone ? 'GO!' : fmtTime(restTimer.seconds)}
          </motion.div>
        </div>

        <div className="flex-1 h-2 bg-border1 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
            style={{ background: barColor }}
          />
        </div>

        <button
          onClick={handleNext}
          className={`px-4 py-2 font-display text-xs tracking-[0.15em] border transition-colors ${
            isDone
              ? 'border-neon text-bg bg-neon'
              : 'border-border2 text-muted hover:text-ink hover:border-neon'
          }`}
        >
          {isDone ? 'PRONTO →' : 'PULAR'}
        </button>
      </div>
    </motion.div>
  )
}

// ─── WorkingSetCard (dispatcher) ─────────────────────────────────────────────

function WorkingSetCard({ step, workingWeight, onDone, isLocked, prevData, savedResult }) {
  const { type } = step.setDef
  const props = { step, workingWeight, onDone, isLocked, prevData, savedResult }

  switch (type) {
    case 'REST_PAUSE':   return <RestPauseCard {...props}/>
    case 'MUSCLE_ROUND': return <MuscleRoundCard {...props}/>
    case 'WIDOWMAKER':   return <WidowmakerCard {...props}/>
    case 'PULSE':        return <PulseSetCard {...props}/>
    default:             return <NormalSetCard {...props}/>
  }
}

// ─── ActiveWorkout ────────────────────────────────────────────────────────────

function ActiveWorkout() {
  const activeWorkout       = useStore(s => s.activeWorkout)
  const setExerciseWeight   = useStore(s => s.setExerciseWeight)
  const advanceWorkoutStep  = useStore(s => s.advanceWorkoutStep)
  const saveSetResult       = useStore(s => s.saveSetResult)
  const completeWorkout     = useStore(s => s.completeWorkout)
  const abandonWorkout      = useStore(s => s.abandonWorkout)
  const userProtocol        = useStore(s => s.userProtocol)
  const startRestTimer             = useStore(s => s.startRestTimer)
  const stopRestTimer              = useStore(s => s.stopRestTimer)
  const exerciseHistory            = useStore(s => s.exerciseHistory)
  const pendingAchievements        = useStore(s => s.pendingAchievements)
  const dismissPendingAchievement  = useStore(s => s.dismissPendingAchievement)
  const stackNavHintSeen           = useStore(s => s.stackNavHintSeen)
  const setStackNavHintSeen        = useStore(s => s.setStackNavHintSeen)

  const [showConfirm,  setShowConfirm]  = useState(false)
  const [showAbandon,  setShowAbandon]  = useState(false)
  const [isResting,    setIsResting]    = useState(false)
  const [viewingStepIdx, setViewingStepIdx] = useState(0)
  const [shownGamif,   setShownGamif]   = useState(() => new Set())
  const [gamifPopup,   setGamifPopup]   = useState(null) // { type, exerciseName }
  const [showStackHint, setShowStackHint] = useState(false)

  // ── reel (trilho único) ────────────────────────────────────────────────────
  const [reelH,     setReelH]     = useState(0)     // altura medida do viewport do reel, em px
  const [dragY,     setDragY]     = useState(0)     // offset ao vivo do arrasto, em px
  const [animating, setAnimating] = useState(false) // true só durante o snap (commit/bounce-back)

  const reelRef         = useRef(null)
  const prevCurIdxRef   = useRef(0)
  const dragStartYRef   = useRef(null)
  const pointerDownRef  = useRef(false)
  const wheelAccumRef   = useRef(0)
  const wheelLockRef    = useRef(false)

  // mede a altura real do viewport do reel (varia com o dispositivo e com o layout ao redor)
  useLayoutEffect(() => {
    const el = reelRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height
      if (h) setReelH(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!activeWorkout) return null

  const { steps, currentStepIdx, exerciseWeights, weekIdx, dayIdx, setResults } = activeWorkout
  const day = userProtocol.weeks[weekIdx].days[dayIdx]

  // CARD_H fixo (por render): cabe dentro do viewport do reel com respiro.
  // STEP < CARD_H de propósito: mantém o peek, mas o centro do ativo é sempre o mesmo.
  const CARD_H = Math.max(
    1,
    Math.round(Math.min(460, Math.max(320, reelH - 56), Math.max(1, reelH - 24)))
  )
  const STEP   = Math.max(1, CARD_H - Math.min(84, Math.max(56, Math.round(CARD_H * 0.18))))

  // Sync viewingStepIdx to follow currentStepIdx when user was on the current step
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (viewingStepIdx === prevCurIdxRef.current) {
      setViewingStepIdx(currentStepIdx)
    }
    prevCurIdxRef.current = currentStepIdx
  }, [currentStepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dica discreta de navegação (só na primeira vez que o usuário vê o reel)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (stackNavHintSeen) return
    setShowStackHint(true)
    const t = setTimeout(() => {
      setShowStackHint(false)
      setStackNavHintSeen(true)
    }, 4000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show gamification popup when landing on a WEIGHT_QUESTION step
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const vStep = steps[viewingStepIdx]
    if (
      vStep?.type === 'WEIGHT_QUESTION' &&
      viewingStepIdx === currentStepIdx &&
      !shownGamif.has(vStep.exerciseId)
    ) {
      const hist = exerciseHistory?.[vStep.exerciseName?.toUpperCase()?.trim()]
      const type = checkGamification(hist)
      if (type) {
        setGamifPopup({ type, exerciseName: vStep.exerciseName })
        setShownGamif(prev => new Set([...prev, vStep.exerciseId]))
      }
    }
  }, [viewingStepIdx, exerciseHistory]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mudança 3b — corte de feeder na camada de execução (steps gerados permanecem íntegros)
  // Critério: peso arredondado a MIN_PLATE_INCREMENT ≥ peso de trabalho E reps ≥ mín. da série efetiva
  // Peso disponível em exerciseWeights após WEIGHT_QUESTION; buildWorkoutSteps não tem acesso a ele
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const curStep = steps[currentStepIdx]
    if (curStep?.type !== 'FEEDER') return

    // Ajuste 1 — guard de pré-visualização: sem peso informado não roda corte nem cálculo
    const ww = exerciseWeights[curStep.exerciseId] || 0
    if (ww <= 0) return

    const feederKg = Math.round(ww * curStep.pct / MIN_PLATE_INCREMENT) * MIN_PLATE_INCREMENT
    if (feederKg < ww) return

    const wsStep = steps.find(s => s.type === 'WORKING_SET' && s.exerciseId === curStep.exerciseId)
    // Ajuste 2 — tipos sem repRange (REST_PAUSE, MUSCLE_ROUND, PULSE) sempre diferem por GER
    // (7 vs 9+): nunca são duplicatas → wsMinReps = Infinity, corte nunca dispara para esses tipos
    const rawMinReps = parseInt(wsStep?.setDef?.repRange?.split('-')[0])
    const wsMinReps  = isNaN(rawMinReps) ? Infinity : rawMinReps
    const feederReps = parseInt(curStep.reps) || 0

    if (feederReps < wsMinReps) return

    // Ajuste 2 — piso inegociável: preserva sempre o prep de MENOR carga (setNum=1, mais reps)
    // Feeders mais pesados (setNum > 1) podem ser cortados; o mais leve nunca
    if (curStep.setNum === 1) return

    advanceWorkoutStep()
  }, [currentStepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Teclado: setas navegam o reel (ignora se o foco estiver num input/textarea)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowUp')   { setAnimating(false); commit(-1) }
      if (e.key === 'ArrowDown') { setAnimating(false); commit(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewingStepIdx, steps.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const vStep         = steps[viewingStepIdx]
  const isPastStep    = viewingStepIdx < currentStepIdx
  const isFutureStep  = viewingStepIdx > currentStepIdx
  const isCurrentStep = viewingStepIdx === currentStepIdx

  const history  = exerciseHistory?.[vStep?.exerciseName?.toUpperCase()?.trim()]

  // advance runs from currentStepIdx (regardless of where user is browsing)
  const curStep = steps[currentStepIdx]
  const advance = useCallback((result) => {
    if (result) saveSetResult(String(currentStepIdx), result)

    const isLastWorkingSet =
      curStep?.type === 'WORKING_SET' &&
      !steps.slice(currentStepIdx + 1).some(s => s.type === 'WORKING_SET')

    if (isLastWorkingSet || curStep?.type === 'WEIGHT_QUESTION') {
      advanceWorkoutStep()
      return
    }

    const nextStep = steps[currentStepIdx + 1]
    let restSec = 0
    if (nextStep?.type === 'WARMUP')           restSec = day.warmupRestSeconds  ?? 60
    else if (nextStep?.type === 'FEEDER')      restSec = day.feederRestSeconds  ?? 60
    else if (nextStep?.type === 'WORKING_SET') restSec = day.restSeconds        ?? 120

    if (restSec > 0) {
      startRestTimer(restSec)
      setIsResting(true)
    } else {
      advanceWorkoutStep()
    }
  }, [curStep, currentStepIdx, steps, day, advanceWorkoutStep, saveSetResult, startRestTimer])

  const handleRestDone = useCallback(() => {
    stopRestTimer()
    setIsResting(false)
    advanceWorkoutStep()
  }, [stopRestTimer, advanceWorkoutStep])

  const handleWeightConfirm = (weight) => {
    setExerciseWeight(curStep.exerciseId, weight)
    advanceWorkoutStep()
  }

  // onDone for the displayed (active) card
  const handleCardDone = useCallback((result) => {
    if (isCurrentStep) {
      advance(result)
    } else if (isPastStep) {
      // just update the saved result for that past step
      saveSetResult(String(viewingStepIdx), result)
    }
    // future steps: button is disabled, this won't be called
  }, [isCurrentStep, isPastStep, advance, saveSetResult, viewingStepIdx])

  // ── reel: commit troca a série exibida; currentStepIdx (progresso real) nunca é tocado ──
  const DRAG_COMMIT_PX = 48

  const commit = (dir) => {
    const next = viewingStepIdx + dir
    if (next >= 0 && next <= steps.length - 1) setViewingStepIdx(next)
    setDragY(0)
    setAnimating(true)
  }

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartYRef.current = e.clientY
    pointerDownRef.current = true
    setAnimating(false)
  }
  const handlePointerMove = (e) => {
    if (!pointerDownRef.current || dragStartYRef.current == null) return
    let d = e.clientY - dragStartYRef.current // > 0 = arrastou para baixo
    if ((viewingStepIdx === 0 && d > 0) || (viewingStepIdx === steps.length - 1 && d < 0)) d *= 0.3
    setDragY(d)
  }
  const handlePointerUp = () => {
    if (!pointerDownRef.current) return
    pointerDownRef.current = false
    dragStartYRef.current = null
    // arrastou p/ baixo -> revela o card de cima (anterior); p/ cima -> revela o de baixo (próxima)
    if (dragY >= DRAG_COMMIT_PX)       commit(-1)
    else if (dragY <= -DRAG_COMMIT_PX) commit(1)
    else { setDragY(0); setAnimating(true) }
  }

  const lockWheel = () => {
    wheelLockRef.current = true
    setTimeout(() => { wheelLockRef.current = false }, 280)
  }
  const handleWheel = (e) => {
    e.preventDefault()
    if (wheelLockRef.current) return
    wheelAccumRef.current += e.deltaY
    if (wheelAccumRef.current > 40)       { commit(1);  wheelAccumRef.current = 0; lockWheel() }
    else if (wheelAccumRef.current < -40) { commit(-1); wheelAccumRef.current = 0; lockWheel() }
  }

  // renderiza o card de um índice qualquer do trilho — só o índice ativo (viewingStepIdx) é interativo;
  // os demais usam o mesmo chrome/dispatcher, travados e com onDone no-op
  const renderRailCard = (i) => {
    const s = steps[i]
    if (!s) return null
    const isActive = i === viewingStepIdx

    const ww   = exerciseWeights[s.exerciseId] || 0
    const sr   = setResults?.[String(i)] ?? null
    const hist = exerciseHistory?.[s.exerciseName?.toUpperCase()?.trim()]
    const pd   = s.type === 'WARMUP'      ? (hist?.warmups?.[s.setNum - 1] ?? null)
               : s.type === 'FEEDER'      ? (hist?.feeders?.[s.setNum - 1] ?? null)
               : s.type === 'WORKING_SET' ? (hist?.sets?.[s.setNum - 1] ?? null)
               : null

    if (!isActive) {
      const noop = () => {}
      if (s.type === 'WEIGHT_QUESTION') return <WeightQuestionCard step={s} onConfirm={noop} history={hist} isLocked />
      if (s.type === 'WARMUP' || s.type === 'FEEDER') return <WarmupFeederCard step={s} workingWeight={ww} onDone={noop} isLocked prevData={pd} savedResult={sr} />
      if (s.type === 'WORKING_SET') return <WorkingSetCard step={s} workingWeight={ww} onDone={noop} isLocked prevData={pd} savedResult={sr} />
      return null
    }

    if (s.type === 'WEIGHT_QUESTION') {
      return (
        <WeightQuestionCard
          step={s}
          onConfirm={isCurrentStep ? handleWeightConfirm : () => {}}
          history={hist}
          isLocked={!isCurrentStep}
        />
      )
    }
    if (s.type === 'WARMUP' || s.type === 'FEEDER') {
      return (
        <WarmupFeederCard
          step={s}
          workingWeight={ww}
          onDone={handleCardDone}
          isLocked={(isResting && isCurrentStep) || isFutureStep}
          prevData={pd}
          savedResult={isPastStep ? sr : null}
        />
      )
    }
    if (s.type === 'WORKING_SET') {
      return (
        <WorkingSetCard
          step={s}
          workingWeight={ww}
          onDone={handleCardDone}
          isLocked={(isResting && isCurrentStep) || isFutureStep}
          prevData={pd}
          savedResult={isPastStep ? sr : null}
        />
      )
    }
    return null
  }

  // Completed state
  if (activeWorkout.completedAt) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 text-center"
      >
        <div className="font-display text-5xl tracking-[0.2em] text-neon neon-glow mb-4">
          TREINO
          <br/>CONCLUÍDO
        </div>
        <div className="font-mono text-[11px] text-muted tracking-wider mb-8">
          Recupere-se. Você merece.
        </div>
        <button
          onClick={completeWorkout}
          className="px-8 py-3 bg-neon text-bg font-display text-sm tracking-[0.2em]"
        >
          FECHAR
        </button>
      </motion.div>
    )
  }

  const workingSteps = steps.filter(s => s.type === 'WORKING_SET').length
  const workingDone  = steps.slice(0, currentStepIdx).filter(s => s.type === 'WORKING_SET').length
  const exerciseIds  = [...new Set(steps.map(s => s.exerciseId))]
  const curExIdx     = exerciseIds.indexOf(curStep?.exerciseId)
  const isLast       = currentStepIdx === steps.length - 1

  const trackTransform = `translateY(calc(50% - ${viewingStepIdx * STEP + CARD_H / 2}px + ${dragY}px))`
  const snapTransition = 'transform 260ms cubic-bezier(.22,.61,.36,1)'

  return (
    <div className="h-full flex flex-col p-3 pb-3 overflow-hidden">
      {/* top bar */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3">
        <button
          onClick={() => setShowAbandon(true)}
          className="font-mono text-[10px] text-muted hover:text-red-400 tracking-wider transition-colors"
        >
          CANCELAR
        </button>
        <div className="flex-1 h-[3px] bg-border1">
          <div
            className="h-full bg-neon transition-all duration-500"
            style={{ width: `${workingSteps > 0 ? (workingDone/workingSteps)*100 : 0}%` }}
          />
        </div>
        <div className="font-mono text-[10px] text-muted tracking-wider">
          {workingDone}/{workingSteps}
        </div>
      </div>

      {/* past/future banner */}
      {!isCurrentStep && (
        <div className={`flex-shrink-0 mb-2 px-3 py-1.5 font-mono text-[10px] tracking-widest text-center border ${
          isPastStep
            ? 'border-amber-500/30 text-amber-400/70 bg-amber-500/5'
            : 'border-border2 text-muted/50'
        }`}>
          {isPastStep ? '◂ EDITANDO RESULTADO ANTERIOR' : 'PRÉVIA — AGUARDE SUA VEZ ▸'}
        </div>
      )}

      {/* trilho único (reel): todos os steps num único elemento que translada de uma vez só */}
      <div
        ref={reelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
        className="relative flex-1 min-h-0 overflow-hidden"
      >
        {/* dica discreta — só na primeira vez */}
        <AnimatePresence>
          {showStackHint && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-1 left-1/2 -translate-x-1/2 z-[200] w-[85%] max-w-[280px] px-3 py-1.5 bg-black/80 border border-neon/30 font-mono text-[9px] text-neon/90 tracking-wider text-center leading-relaxed pointer-events-none"
            >
              ↕ ROLE PARA VER A SÉRIE ANTERIOR/PRÓXIMA
            </motion.div>
          )}
        </AnimatePresence>

        {reelH > 0 && (
          <div
            className="absolute left-0 right-0 top-0"
            style={{
              transform: trackTransform,
              transition: animating ? snapTransition : 'none',
            }}
            onTransitionEnd={() => setAnimating(false)}
          >
            {steps.map((s, i) => {
              const dist = (i - viewingStepIdx) - dragY / STEP
              const ad = Math.abs(dist)
              if (ad > 2) return null // fora do alcance visível (opacidade já bateu 0 antes disso)
              const scale   = Math.max(0.82, 1 - ad * 0.13)
              const opacity = Math.max(0.25, 1 - ad * 0.5)
              const z       = 100 - Math.round(ad * 10)
              return (
                <div
                  key={i}
                  className={i === viewingStepIdx ? '' : 'pointer-events-none select-none'}
                  style={{
                    position: 'absolute',
                    top: i * STEP,
                    left: '50%',
                    width: 'calc(100% - 4px)',
                    maxWidth: 420,
                    height: CARD_H,
                    transform: `translateX(-50%) scale(${scale})`,
                    transformOrigin: 'center center',
                    opacity,
                    zIndex: z,
                    transition: animating ? `transform 260ms cubic-bezier(.22,.61,.36,1), opacity 260ms cubic-bezier(.22,.61,.36,1)` : 'none',
                  }}
                >
                  <div style={{ height: '100%', overflow: 'hidden' }}>
                    {renderRailCard(i)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* rest timer — always visible when resting, regardless of viewing step */}
      <div className="flex-shrink-0">
        <AnimatePresence>
          {isResting && <InlineRestTimer onNext={handleRestDone}/>}
        </AnimatePresence>
      </div>

      {/* finish button */}
      {isLast && isCurrentStep && curStep?.type === 'WORKING_SET' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex-shrink-0 mt-3"
        >
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 font-display text-sm tracking-[0.2em] border border-neon/60 text-neon hover:bg-neon/5 transition-colors"
          >
            CONCLUIR TREINO
          </button>
        </motion.div>
      )}

      {/* exercise indicator */}
      {exerciseIds.length > 1 && (
        <div className="flex-shrink-0 flex gap-1 justify-center mt-3">
          {exerciseIds.map((id, i) => (
            <div
              key={id}
              className={`h-1 rounded-full transition-all ${
                i < curExIdx ? 'w-4 bg-neon/50' :
                i === curExIdx ? 'w-6 bg-neon' :
                'w-4 bg-border2'
              }`}
            />
          ))}
        </div>
      )}

      {/* contador de posição na sessão */}
      <div className="flex-shrink-0 text-center font-mono text-[9px] text-muted/40 tracking-wider mt-2">
        {viewingStepIdx + 1}/{steps.length}
      </div>

      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            title="CONCLUIR TREINO?"
            subtitle="Isso encerrará a sessão e salvará todos os registros."
            confirmLabel="CONCLUIR"
            confirmClass="bg-neon text-bg"
            onConfirm={() => { setShowConfirm(false); completeWorkout() }}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbandon && (
          <ConfirmModal
            title="CANCELAR TREINO?"
            subtitle="O progresso desta sessão será perdido."
            confirmLabel="CANCELAR TREINO"
            confirmClass="bg-red-500 text-white"
            onConfirm={() => { setShowAbandon(false); stopRestTimer(); abandonWorkout() }}
            onCancel={() => setShowAbandon(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gamifPopup && (
          <GamificationPopup
            type={gamifPopup.type}
            exerciseName={gamifPopup.exerciseName}
            onDismiss={() => setGamifPopup(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingAchievements.length > 0 && (
          <AchievementPopup
            key={pendingAchievements[0]}
            achievementId={pendingAchievements[0]}
            onDismiss={dismissPendingAchievement}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── PreWorkout ───────────────────────────────────────────────────────────────

function PreWorkout() {
  const currentWeek  = useStore(s => s.currentWeek)
  const currentDay   = useStore(s => s.currentDay)
  const setWeek      = useStore(s => s.setWeek)
  const setDay       = useStore(s => s.setDay)
  const startWorkout = useStore(s => s.startWorkout)
  const userProtocol = useStore(s => s.userProtocol)
  const setTab       = useStore(s => s.setTab)

  const week = userProtocol.weeks[currentWeek]
  const day  = week.days[currentDay]
  const hasExercises = !day.isRest && (day.exercises?.length || 0) > 0

  // Group exercises by muscle for display
  const muscleGroups = (day.exercises || []).reduce((acc, ex) => {
    if (!acc[ex.muscle]) acc[ex.muscle] = []
    acc[ex.muscle].push(ex)
    return acc
  }, {})

  return (
    <div className="p-3 pb-8">
      {/* Week selector */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
        {WEEK_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setWeek(i)}
            className={`flex-shrink-0 px-2.5 py-1 font-display text-[13px] tracking-wider border transition-all ${
              i === currentWeek
                ? 'bg-neon text-bg border-neon'
                : 'bg-s2 border-border2 text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Day selector */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
        {DAY_NAMES.map((name, i) => {
          const d = week.days[i]
          return (
            <button
              key={i}
              onClick={() => setDay(i)}
              className={`flex-shrink-0 px-3 py-1.5 font-body font-bold text-xs tracking-wider border transition-all ${
                i === currentDay
                  ? 'bg-neon text-bg border-neon'
                  : d.isRest
                  ? 'bg-s2 border-border2 border-dashed text-muted/40'
                  : 'bg-s2 border-border2 text-muted hover:text-ink'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      {/* Status banner */}
      <div className="flex items-center gap-3 bg-s2 border border-border1 border-l-[3px] border-l-neon px-3 py-2 mb-4">
        <div className="font-display text-[13px] tracking-[0.15em] text-neon">
          SEMANA {currentWeek + 1}
        </div>
        {!day.isRest && hasExercises && (
          <div className="ml-auto font-mono text-[10px] text-muted">
            {day.exercises.length} exercícios
          </div>
        )}
      </div>

      {/* Rest day */}
      {day.isRest && (
        <div className="text-center py-16">
          <div className="font-display text-6xl neon-glow tracking-[0.3em] leading-none text-neon">
            DESCANSO
          </div>
          <div className="font-mono text-[11px] text-muted tracking-[0.25em] mt-4 uppercase">
            Recupere-se. Cresça.
          </div>
        </div>
      )}

      {/* Empty day */}
      {!day.isRest && !hasExercises && (
        <div className="text-center py-12 border border-dashed border-border2">
          <LuDumbbell size={32} className="text-muted/30 mx-auto mb-3"/>
          <div className="font-display text-lg tracking-wider text-muted/40 mb-2">
            DIA SEM TREINO
          </div>
          <div className="font-mono text-[11px] text-muted/30 mb-5">
            Configure exercícios na aba Protocolo
          </div>
          <button
            onClick={() => setTab('protocol')}
            className="px-5 py-2.5 border border-neon/50 text-neon font-display text-xs tracking-[0.2em] hover:bg-neon/5 transition-colors"
          >
            IR PARA PROTOCOLO
          </button>
        </div>
      )}

      {/* Exercise list preview */}
      {!day.isRest && hasExercises && (
        <>
          {Object.entries(muscleGroups).map(([muscle, exs]) => (
            <div key={muscle} className="mb-3">
              <div className="font-mono text-[10px] text-muted/50 tracking-widest mb-1.5 uppercase">
                {muscle}
              </div>
              {exs.map((ex, i) => {
                const typeInfo = ex.sets[0] ? SET_TYPES[ex.sets[0].type] : SET_TYPES.NORMAL
                return (
                  <div
                    key={ex.id}
                    className="flex items-center gap-2 bg-s2 border border-border2 px-3 py-2.5 mb-1"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: typeInfo.color }}
                    />
                    <div className="flex-1">
                      <div className="font-display text-sm tracking-wider text-ink">{ex.name}</div>
                      <div className="font-mono text-[10px] text-muted">
                        {ex.sets.map(s => SET_TYPES[s.type]?.label || s.type).join(' + ')}
                      </div>
                    </div>
                    <div className="font-mono text-[10px] text-muted">
                      {ex.sets.length}×
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          <button
            onClick={() => startWorkout(currentWeek, currentDay)}
            className="w-full py-4 font-display text-base tracking-[0.25em] bg-neon text-bg flex items-center justify-center gap-3 mt-4"
          >
            <LuPlay size={18} fill="currentColor"/>
            INICIAR TREINO
          </button>
        </>
      )}
    </div>
  )
}

// ─── WorkoutPage ──────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const activeWorkout = useStore(s => s.activeWorkout)
  return activeWorkout ? <ActiveWorkout/> : <PreWorkout/>
}
