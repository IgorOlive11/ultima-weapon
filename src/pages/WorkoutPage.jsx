import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LuPlay, LuCheck, LuSwords, LuTriangleAlert,
  LuFlame, LuDumbbell, LuPlus, LuMinus, LuClock, LuImage,
} from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { DAY_NAMES, SET_TYPES, GER_CONFIG, getWeightQuestion, MIN_PLATE_INCREMENT, getPrepRestSeconds } from '../data/protocol'
import { ACHIEVEMENTS } from '../data/achievements'
import DoomFace from '../components/DoomFace'
import ExerciseDetailModal from '../components/ExerciseDetailModal'
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

function fmtDuration(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// cronômetro geral do treino — número grande, tabular (sem trepidação a cada
// segundo), separador ":" pulsando discretamente. Cor acompanha a fase atual
// (prep vs série válida), com fade suave em vez de trocar seco.
function ElapsedClock({ sec, color }) {
  const parts = fmtDuration(sec).split(':')
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-2 mt-1 mb-3">
      <LuClock size={22} className="flex-shrink-0 transition-colors duration-500" style={{ color, opacity: 0.55 }} />
      <span
        className="font-mono text-3xl font-bold leading-none transition-colors duration-500"
        style={{ fontVariantNumeric: 'tabular-nums', color, textShadow: `0 0 14px ${hexToRgba(color, 0.4)}` }}
      >
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="animate-pulse">:</span>}
            {p}
          </span>
        ))}
      </span>
    </div>
  )
}

const WORKING_GER_FACE_SIZE = 40

// cor principal por fase: aquecimento/feeder (preparo) = verde; séries válidas
// (working sets de qualquer tipo, incl. a pergunta de peso que as precede) = vermelho
const PHASE_COLOR_PREP    = '#39FF14'
const PHASE_COLOR_WORKING = '#FF1414'
function phaseColorForStepType(type) {
  return type === 'PREP' ? PHASE_COLOR_PREP : PHASE_COLOR_WORKING
}

function getGerConfig(ger) {
  return GER_CONFIG[ger] || GER_CONFIG[10]
}

function fmtRir(ger, cfg) {
  const { min, max } = cfg.rirRange || {}
  if (min == null || max == null) return cfg.rir || cfg.subtitle // GER 11-13: sem número, cai pro texto
  return `GER ${ger} · ${min === max ? min : `${min}-${max}`} na reserva`
}

function GerEffortPanel({ ger, color }) {
  const cfg = getGerConfig(ger)
  return (
    <div className="flex items-center gap-3 bg-s2 border border-border1 px-3 py-2 mb-2.5 min-h-[74px]">
      <DoomFace face={cfg.face} size={WORKING_GER_FACE_SIZE}/>
      <div className="min-w-0">
        <div className="font-display text-sm tracking-wider leading-none mb-1" style={{ color }}>
          {cfg.label}
        </div>
        <div className="font-mono text-[10px] text-muted truncate">{cfg.title}</div>
        <div className="font-mono text-[10px] text-muted/60 mt-0.5">
          {fmtRir(ger, cfg)}
        </div>
      </div>
    </div>
  )
}

// alvo (reps) e carga na mesma linha — mesmo esqueleto em todo tipo de série.
// editableKg/onEditableKgChange: quando presentes, a carga vira um input (warmup/feeder,
// onde o peso é uma sugestão ajustável); sem eles, é só o peso de trabalho (read-only).
function TargetLoadRow({ alvo, alvoSub, workingWeight, editableKg, onEditableKgChange }) {
  return (
    <div className="flex gap-2 mb-2.5">
      <div className="flex-1 bg-s2 border border-border1 px-3 py-2 text-center">
        <div className="font-mono text-[9px] text-muted tracking-wider mb-0.5">ALVO</div>
        <div className="font-display text-xl tracking-wider text-ink leading-none">{alvo}</div>
        {alvoSub && <div className="font-mono text-[9px] text-muted/60 mt-0.5">{alvoSub}</div>}
      </div>
      <div className="flex-1 bg-s2 border border-border1 px-3 py-2 text-center">
        <div className="font-mono text-[9px] text-muted tracking-wider mb-0.5">CARGA</div>
        {editableKg !== undefined ? (
          <input
            type="number"
            inputMode="decimal"
            className="w-full bg-transparent text-center font-display text-xl tracking-wider text-neon leading-none outline-none"
            value={editableKg}
            onChange={onEditableKgChange}
          />
        ) : (
          <div className="font-display text-xl tracking-wider text-neon leading-none">{fmtKg(workingWeight)}</div>
        )}
      </div>
    </div>
  )
}

// Botão discreto "ver exercício" — só aparece quando o exercício está linkado à
// biblioteca (exerciseLibraryId presente). Abre o mesmo modal de detalhe (GIF +
// instruções) usado na tela EXERCÍCIOS.
function ViewExerciseButton({ libraryId }) {
  const [open, setOpen] = useState(false)
  if (!libraryId) return null
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-shrink-0 p-1 text-muted/60 hover:text-neon transition-colors"
        title="Ver exercício"
      >
        <LuImage size={15} />
      </button>
      {open && <ExerciseDetailModal id={libraryId} onClose={() => setOpen(false)} />}
    </>
  )
}

// ger: override explícito do GER a mostrar (null = não mostra o painel — caso do aquecimento,
// que não tem meta de esforço/falha). Sem override, usa o GER da série de trabalho normalmente.
function WorkingSetShell({ step, typeInfo, label, workingWeight, ger, children }) {
  const resolvedGer = ger !== undefined ? ger : (step.setDef?.ger ?? typeInfo.ger)
  return (
    <div className="h-full bg-s1 border border-border2 rounded-sm overflow-hidden flex flex-col">
      <div className="h-1 flex-shrink-0" style={{ background: typeInfo.color }} />
      <div className="p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
        {step.muscle && <div className="font-mono text-[9px] text-muted tracking-[0.22em] mb-0.5">{step.muscle}</div>}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="font-display text-base tracking-wider text-ink leading-none truncate">
            {step.exerciseNamePt || step.exerciseName}
          </div>
          <ViewExerciseButton libraryId={step.exerciseLibraryId} />
        </div>
        <div className="font-display text-[11px] tracking-[0.18em] mb-2" style={{ color: typeInfo.color }}>
          {label}{workingWeight > 0 ? ` · ${fmtKg(workingWeight)}` : ''}
        </div>
        {resolvedGer != null && <GerEffortPanel ger={resolvedGer} color={typeInfo.color}/>}
        {children}
      </div>
    </div>
  )
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

function WeightQuestionCard({ step, onConfirm, history, isLocked, initialWeight }) {
  const [weight, setWeight] = useState(initialWeight > 0 ? String(initialWeight) : '')
  const question = getWeightQuestion(step.setDef)
  const typeInfo = { ...(SET_TYPES[step.setDef?.type] || SET_TYPES.NORMAL), color: PHASE_COLOR_WORKING }

  // Todos os steps ficam montados o tempo todo (reel exibe tudo, só troca o
  // destaque) — sem isso, voltar pra um WEIGHT_QUESTION já respondido mostraria o
  // campo vazio em vez do peso confirmado (initialWeight só existe no momento do
  // mount inicial, quando ainda ninguém confirmou nada).
  useEffect(() => {
    if (initialWeight > 0) setWeight(String(initialWeight))
  }, [initialWeight])

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
        <div className="flex items-center gap-1.5 mb-1">
          <div className="font-display text-lg tracking-wider text-ink truncate">
            {step.exerciseNamePt || step.exerciseName}
          </div>
          <ViewExerciseButton libraryId={step.exerciseLibraryId} />
        </div>
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

// Rampa única de preparo — substituiu os antigos warmup+feeder separados (ver PR de
// unificação). Um único esqueleto pra toda série de rampa, sem distinção de tipo.
function PrepSetCard({ step, workingWeight, onDone, isLocked, prevData, savedResult }) {
  const defaultKg = workingWeight > 0 ? roundToMinPlate(workingWeight * step.pct) : 0
  const [reps, setReps] = useState(savedResult?.reps != null ? String(savedResult.reps) : '')
  const [kg, setKg]     = useState(savedResult?.kg   != null ? String(savedResult.kg)   : (defaultKg > 0 ? String(defaultKg) : ''))
  const typeInfo = { color: PHASE_COLOR_PREP }

  // Todo step do reel monta de uma vez só, antes de qualquer peso existir — no
  // primeiro render workingWeight é sempre 0 (a weight question daquele exercício
  // ainda nem foi respondida), então defaultKg também nasce 0 e o useState acima
  // trava vazio pra sempre. Sincroniza assim que o peso de trabalho existir/mudar
  // (confirmação inicial ou edição posterior da weight question) — não mexe se já
  // tem um resultado salvo (série já concluída, valor é o que foi feito de verdade).
  useEffect(() => {
    if (savedResult?.kg != null) return
    if (defaultKg > 0) setKg(String(defaultKg))
  }, [defaultKg]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDone = () => {
    onDone({ reps: parseInt(reps) || 0, kg: parseFloat(kg) || defaultKg })
  }

  return (
    <WorkingSetShell
      step={step}
      typeInfo={typeInfo}
      label={`SÉRIE DE PREPARO ${step.setNum} DE ${step.totalSets ?? 1}`}
      workingWeight={workingWeight}
      ger={step.gerTarget ?? 7}
    >
      <TargetLoadRow
        alvo={step.reps}
        alvoSub="reps"
        workingWeight={workingWeight}
        editableKg={workingWeight > 0 ? kg : undefined}
        onEditableKgChange={e => setKg(e.target.value)}
      />

      <PrevRecord prevData={prevData} />

      <div className="mt-auto mb-2.5">
        <label className="font-mono text-[9px] text-muted tracking-wider block mb-1">REPS REALIZADAS</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
            className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          ><LuMinus size={16}/></button>
          <input
            type="number" inputMode="numeric"
            className="flex-1 min-w-0 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-1.5 focus:border-neon outline-none transition-colors"
            placeholder="0"
            value={reps}
            onChange={e => setReps(e.target.value)}
          />
          <button
            onClick={() => setReps(r => String((parseInt(r)||0) + 1))}
            className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          ><LuPlus size={16}/></button>
        </div>
      </div>

      <button
        onClick={handleDone}
        disabled={isLocked}
        className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
        style={{ background: typeInfo.color }}
      >
        <LuCheck size={16}/> CONCLUÍDO
      </button>
    </WorkingSetShell>
  )
}

function NormalSetCard({ step, workingWeight, onDone, isLocked, prevData, savedResult }) {
  const [repsHit, setRepsHit] = useState(savedResult?.reps != null ? String(savedResult.reps) : '')
  const typeInfo  = { ...(SET_TYPES[step.setDef.type] || SET_TYPES.NORMAL), color: PHASE_COLOR_WORKING }

  const handleDone = () => {
    onDone({ kg: workingWeight, reps: parseInt(repsHit) || 0 })
  }

  return (
    <WorkingSetShell
      step={step}
      typeInfo={typeInfo}
      label={step.totalSets > 1 ? `SÉRIE ${step.setNum} DE ${step.totalSets}` : 'SÉRIE PRINCIPAL'}
      workingWeight={workingWeight}
    >
      <TargetLoadRow alvo={step.setDef.repRange || '—'} alvoSub="reps" workingWeight={workingWeight} />

      <PrevRecord prevData={prevData} setDef={step.setDef} />

      <div className="mt-auto mb-2.5">
        <label className="font-mono text-[9px] text-muted tracking-wider block mb-1">REPS REALIZADAS</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRepsHit(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
            className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          ><LuMinus size={16}/></button>
          <input
            type="number"
            inputMode="numeric"
            className="flex-1 min-w-0 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-1.5 focus:border-neon outline-none transition-colors"
            placeholder="0"
            value={repsHit}
            onChange={e => setRepsHit(e.target.value)}
          />
          <button
            onClick={() => setRepsHit(r => String((parseInt(r)||0) + 1))}
            className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
          ><LuPlus size={16}/></button>
        </div>
      </div>

      <button
        onClick={handleDone}
        disabled={isLocked}
        className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity"
        style={{ background: typeInfo.color }}
      >
        <LuCheck size={16}/> SÉRIE CONCLUÍDA
      </button>
    </WorkingSetShell>
  )
}

function RestPauseCard({ step, workingWeight, onDone, isLocked, prevData }) {
  const [blocks, setBlocks]   = useState([{ reps: null }])
  const [phase, setPhase]     = useState('block') // 'block' | 'rest20'
  const [timer20, setTimer20] = useState(null)
  const ivRef = useRef(null)
  const typeInfo  = { ...SET_TYPES.REST_PAUSE, color: PHASE_COLOR_WORKING }

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
    <WorkingSetShell step={step} typeInfo={typeInfo} label="DC STYLE REST PAUSE" workingWeight={workingWeight}>
      <TargetLoadRow alvo="~8" alvoSub="reps/bloco" workingWeight={workingWeight} />

      <div className="bg-s2 border border-border1 px-3 py-2 mb-2.5 font-mono text-[10px] text-muted leading-snug">
        Carga para ~8 reps. Falha → <span className="text-orange-400">20s</span> → falha de novo.
        <br/>10-11 reps no bloco 1: progride carga.
      </div>

      <div className="flex flex-col gap-1 mb-2.5">
        {blocks.map((b, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 border px-3 py-1.5 ${
              i < currentBlock ? 'border-border2 bg-s2 opacity-60' :
              i === currentBlock ? 'border-orange-500/50 bg-orange-500/5' :
              'border-border1 opacity-30'
            }`}
          >
            <div className="font-display text-[13px] tracking-wider" style={{ color: typeInfo.color }}>
              BLOCO {i+1}
            </div>
            <div className="flex-1 font-mono text-[10px] text-muted">
              {b.reps !== null ? `${b.reps} reps` : i === currentBlock ? 'em andamento...' : '-'}
            </div>
            {b.reps !== null && <LuCheck size={14} className="text-orange-400"/>}
          </div>
        ))}
      </div>

      <PrevRecord prevData={prevData} />

      {phase === 'rest20' && timer20 !== null && (
        <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-2 mb-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] text-orange-400 tracking-wider mb-0.5">PAUSA 20s</div>
              <div className="font-display text-3xl tracking-wider text-orange-400 leading-none">{timer20}</div>
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

      {phase === 'block' && !isDone && (
        <div className="mt-auto mb-2.5">
          <label className="font-mono text-[9px] text-muted tracking-wider block mb-1">
            REPS DO BLOCO {currentBlock + 1}
          </label>
          <div className="flex items-center gap-2 mb-2.5">
            <button
              onClick={() => setLocalReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
              className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
            ><LuMinus size={16}/></button>
            <input
              type="number" inputMode="numeric"
              className="flex-1 min-w-0 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-1.5 focus:border-neon outline-none transition-colors"
              placeholder="0"
              value={localReps}
              onChange={e => setLocalReps(e.target.value)}
            />
            <button
              onClick={() => setLocalReps(r => String((parseInt(r)||0) + 1))}
              className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
            ><LuPlus size={16}/></button>
          </div>
          <button
            onClick={() => { handleBlockDone(parseInt(localReps)||0); setLocalReps('') }}
            disabled={!parseInt(localReps)}
            className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 border-0"
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
          className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
          style={{ background: typeInfo.color }}
        >
          <LuFlame size={16}/> REST PAUSE CONCLUÍDO
        </button>
      )}
    </WorkingSetShell>
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
  const typeInfo = { ...SET_TYPES.MUSCLE_ROUND, color: PHASE_COLOR_WORKING }

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
    <WorkingSetShell step={step} typeInfo={typeInfo} label="MUSCLE ROUND" workingWeight={workingWeight}>
      <TargetLoadRow alvo="4" alvoSub="reps/bloco" workingWeight={workingWeight} />

      <div className="bg-s2 border border-border1 px-3 py-2 mb-2.5 font-mono text-[10px] text-muted leading-snug">
        Blocos de <span className="text-red-400 font-bold">4 reps</span>, 10s entre blocos, até falhar uma vez.
      </div>

      <PrevRecord prevData={prevData} />

      <div className="grid grid-cols-6 gap-1 mb-2.5">
        {Array(TOTAL_BLOCKS).fill(null).map((_, i) => {
          const done   = i < completedBlocks
          const isFail = failedInfo !== null && i === failedInfo.block - 1
          const isCurr = i === completedBlocks && phase === 'ready' && failedInfo === null
          return (
            <div
              key={i}
              className={`h-7 flex items-center justify-center border font-display text-[11px] transition-all ${
                isFail ? 'border-red-500 bg-red-500/20 text-red-400' :
                done   ? 'border-red-400/60 bg-red-400/20 text-red-300' :
                isCurr ? 'border-red-500 bg-red-500/10 text-red-400' :
                         'border-border2 text-muted/30'
              }`}
            >
              {isFail ? 'x' : done ? '✓' : i+1}
            </div>
          )
        })}
      </div>

      {phase === 'rest10' && blockTimer !== null && (
        <div className="bg-red-500/10 border border-red-500/30 px-3 py-2 mb-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] text-red-400 tracking-wider mb-0.5">DESCANSO 10s</div>
              <div className="font-display text-3xl tracking-wider text-red-400 leading-none">{blockTimer}</div>
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
        <div className="bg-red-500/10 border border-red-500/30 px-3 py-2 mb-2.5 text-center">
          <div className="font-mono text-[10px] text-red-400">
            Falha no bloco {failedInfo.block}
            {failedInfo.reps > 0 && ` · ${failedInfo.reps} reps`}
            {' '}— {completedBlocks} blocos completos
          </div>
        </div>
      )}

      {phase === 'ready' && failedInfo === null && (
        <>
          <div className="mt-auto mb-2.5">
            <label className="font-mono text-[9px] text-muted tracking-wider block mb-1">
              REPS NO BLOCO {completedBlocks + 1}
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))}
                className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
              ><LuMinus size={16}/></button>
              <input
                type="number" inputMode="numeric"
                className="flex-1 min-w-0 bg-s2 border border-border2 text-center font-display text-2xl tracking-wider text-ink py-1.5 focus:border-neon outline-none transition-colors"
                placeholder="0"
                value={currentReps}
                onChange={e => setCurrentReps(e.target.value)}
              />
              <button
                onClick={() => setCurrentReps(r => String((parseInt(r)||0) + 1))}
                className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
              ><LuPlus size={16}/></button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBlockDone}
              className="flex-1 py-2.5 font-display text-sm tracking-[0.15em] text-bg"
              style={{ background: typeInfo.color }}
            >
              BLOCO {completedBlocks+1} FEITO
            </button>
            <button
              onClick={handleFail}
              className="px-3 py-2.5 border border-red-500/40 text-red-400 font-display text-xs tracking-wider hover:bg-red-500/10 transition-colors"
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
          className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
          style={{ background: typeInfo.color }}
        >
          <LuCheck size={16}/> MUSCLE ROUND CONCLUÍDO
        </button>
      )}
    </WorkingSetShell>
  )
}

function WidowmakerCard({ step, workingWeight, onDone, isLocked, prevData }) {
  const [reps, setReps]   = useState(0)
  const [phase, setPhase] = useState('working') // 'working' | 'extending'
  const typeInfo          = { ...SET_TYPES.WIDOWMAKER, color: PHASE_COLOR_WORKING }

  const handleFail = () => {
    setPhase('extending')
  }

  const handleFinish = () => {
    onDone({ kg: workingWeight, reps })
  }

  return (
    <WorkingSetShell step={step} typeInfo={typeInfo} label="DC STYLE WIDOWMAKER" workingWeight={workingWeight}>
      <TargetLoadRow alvo={phase === 'working' ? '10-12' : '15-20'} alvoSub="reps" workingWeight={workingWeight} />

      {phase === 'working' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 mb-2.5 font-mono text-[10px] text-yellow-200 leading-snug">
          <span className="text-yellow-400 font-bold">FASE 1:</span> Falha total em 10-12 reps. Não economize nada.
        </div>
      )}

      {phase === 'extending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 mb-2.5 font-mono text-[10px] text-yellow-200 leading-snug">
          <span className="text-yellow-400 font-bold">FASE 2:</span> Continue até 15-20 reps sem soltar a barra.
        </div>
      )}

      <PrevRecord prevData={prevData} />

      <div className="bg-s2 border border-border1 px-3 py-2 mb-2.5 text-center">
        <div className="font-mono text-[9px] text-muted tracking-wider mb-1">REPS TOTAIS</div>
        <div className="font-display text-4xl tracking-wider leading-none" style={{ color: typeInfo.color }}>{reps}</div>
        <div className="font-mono text-[10px] mt-1.5 min-h-[14px]">
          {phase === 'working' && reps < 8 && reps > 0 && (
            <span className="text-muted">{8 - reps} reps para a zona de falha</span>
          )}
          {phase === 'working' && reps >= 8 && reps < 10 && (
            <span className="text-yellow-400">Zona de falha se aproximando</span>
          )}
          {phase === 'working' && reps >= 10 && reps <= 12 && (
            <span className="text-yellow-400">Zona de falha</span>
          )}
          {phase === 'working' && reps > 12 && (
            <span className="text-yellow-400">Vá para fase 2</span>
          )}
          {phase === 'extending' && reps < 20 && (
            <span className="text-yellow-400">{20 - reps} reps até 20</span>
          )}
          {phase === 'extending' && reps >= 20 && (
            <span className="text-neon">WIDOWMAKER COMPLETO!</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-auto mb-2.5">
        <button
          onClick={() => setReps(r => Math.max(0, r-1))}
          className="w-10 h-10 border border-border2 flex items-center justify-center text-muted hover:text-ink hover:border-neon transition-colors"
        ><LuMinus size={18}/></button>
        <button
          onClick={() => setReps(r => r+1)}
          className="flex-1 py-2 font-display text-xl tracking-wider border border-border2 text-ink hover:border-neon transition-colors"
        >
          +1 REP
        </button>
      </div>

      {phase === 'working' && reps >= 8 && (
        <button
          onClick={handleFail}
          className="w-full py-2.5 font-display text-sm tracking-[0.15em] border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors mb-2.5"
        >
          ATINGIU FALHA → FASE 2
        </button>
      )}

      {phase === 'extending' && reps >= 15 && (
        <button
          onClick={handleFinish}
          disabled={isLocked}
          className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: typeInfo.color }}
        >
          <LuCheck size={16}/> WIDOWMAKER CONCLUÍDO
        </button>
      )}
    </WorkingSetShell>
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
  const typeInfo               = { ...SET_TYPES.PULSE, color: PHASE_COLOR_WORKING }
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
    <WorkingSetShell step={step} typeInfo={typeInfo} label="DC STYLE PULSE SET" workingWeight={workingWeight}>
      <TargetLoadRow
        alvo={isDone ? '—' : (phase === 'reps' ? cur.reps : (cur.pulses ?? 'falha'))}
        alvoSub={isDone ? null : (phase === 'reps' ? 'reps' : 'pulsos')}
        workingWeight={workingWeight}
      />

      <PrevRecord prevData={prevData} />

      <div className="flex flex-col gap-1 mb-2.5">
        {SEQUENCE.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-3 py-1.5 border text-sm transition-all ${
              i < current ? 'border-border2 opacity-40 bg-s2' :
              i === current ? 'border-pink-500/50 bg-pink-500/5' :
              'border-border1 opacity-20'
            }`}
          >
            <div className="font-display text-[12px] tracking-wider w-7" style={{ color: typeInfo.color }}>
              {i+1}.
            </div>
            <div className="flex-1 font-mono text-[10px] text-muted">
              {s.reps} reps
              {s.pulses ? ` + ${s.pulses} pulsos` : ' + pulsos até a falha'}
            </div>
            {i < current && <LuCheck size={12} className="text-pink-400"/>}
            {i === current && (
              <div className="font-mono text-[9px]" style={{ color: typeInfo.color }}>
                {phase === 'reps' ? 'reps' : phase === 'pulses' ? 'pulsos' : 'falha'}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isDone && (
        <>
          <div className="bg-pink-500/10 border border-pink-500/30 px-3 py-2.5 text-center mt-auto mb-2.5">
            <div className="font-mono text-[9px] text-muted tracking-wider mb-1">AGORA</div>
            <div className="font-display text-xl tracking-wider leading-none" style={{ color: typeInfo.color }}>
              {phase === 'reps' ? `${cur.reps} REPS COMPLETAS` :
               phase === 'pulses' ? `${cur.pulses} PULSOS PARCIAIS` :
               'PULSOS ATÉ A FALHA'}
            </div>
          </div>

          <button
            onClick={handlePhaseNext}
            className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg"
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
          className="w-full py-2.5 font-display text-sm tracking-[0.18em] text-bg disabled:opacity-40 flex items-center justify-center gap-2 mt-auto"
          style={{ background: typeInfo.color }}
        >
          <LuCheck size={16}/> PULSE SET CONCLUÍDO
        </button>
      )}
    </WorkingSetShell>
  )
}

// ─── InlineRestTimer ─────────────────────────────────────────────────────────

function InlineRestTimer({ onNext }) {
  const restTimer      = useStore(s => s.restTimer)
  const stopRestTimer  = useStore(s => s.stopRestTimer)
  const adjustRestTimer = useStore(s => s.adjustRestTimer)

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

      <div className="relative overflow-hidden flex items-center gap-4 px-4 py-3">
        {/* destaque visual — pulsa enquanto o descanso terminou e não foi reconhecido */}
        {isDone && (
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none"
            animate={{ backgroundColor: ['rgba(57,255,20,0.04)', 'rgba(57,255,20,0.22)', 'rgba(57,255,20,0.04)'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <button
          onClick={() => adjustRestTimer(-15)}
          disabled={isDone}
          className="relative z-10 flex-shrink-0 px-2 py-1.5 border border-border2 font-mono text-[10px] text-muted tracking-wider hover:text-ink hover:border-neon/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          -15
        </button>

        <div className="relative z-10">
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

        <button
          onClick={() => adjustRestTimer(15)}
          disabled={isDone}
          className="relative z-10 flex-shrink-0 px-2 py-1.5 border border-border2 font-mono text-[10px] text-muted tracking-wider hover:text-ink hover:border-neon/50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          +15
        </button>

        <div className="relative z-10 flex-1" />

        <button
          onClick={handleNext}
          className={`relative z-10 px-4 py-2 font-display text-xs tracking-[0.15em] border transition-colors ${
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
  const [pastEditSaved, setPastEditSaved] = useState(false) // flash "SÉRIE ATUALIZADA" ao editar step já concluído
  const [nowTick, setNowTick] = useState(() => Date.now()) // só pra forçar re-render do cronômetro geral

  // ── reel (trilho único, altura medida por conteúdo) ───────────────────────
  const [dragY,     setDragY]     = useState(0)     // offset ao vivo do arrasto, em px
  const [animating, setAnimating] = useState(false) // true só durante o snap (commit/bounce-back)
  const [heights,   setHeights]   = useState([])    // altura real de cada card, medida por índice

  const wrapRefs        = useRef([])
  const prevCurIdxRef   = useRef(0)
  const dragStartYRef   = useRef(null)
  const pointerDownRef  = useRef(false)
  const wheelAccumRef   = useRef(0)
  const wheelLockRef    = useRef(false)

  const REEL_EST = 210 // estimativa só pro primeiro paint, antes da 1ª medição
  const REEL_GAP = 14

  if (!activeWorkout) return null

  const { steps, currentStepIdx, exerciseWeights, weekIdx, dayIdx, setResults } = activeWorkout
  const day = userProtocol.weeks[weekIdx].days[dayIdx]

  // garante tamanho fixo (sem "buracos" esparsos) — refs de índices ainda não
  // renderizados ficam undefined, não ausentes
  if (wrapRefs.current.length < steps.length) {
    wrapRefs.current = wrapRefs.current.concat(Array(steps.length - wrapRefs.current.length).fill(undefined))
  }

  // mede a altura real de cada card (ref + ResizeObserver) — sem isso o reel não
  // sabe onde centralizar os vizinhos quando a altura varia por tipo/conteúdo
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    const measure = () => {
      setHeights(prev => {
        const next = wrapRefs.current.map((el, i) => el ? el.offsetHeight : (prev[i] ?? REEL_EST))
        return next.some((h, i) => h !== prev[i]) ? next : prev
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    wrapRefs.current.forEach(el => el && ro.observe(el))
    return () => ro.disconnect()
  }) // sem deps: re-mede a cada render (barato — só lê offsetHeight já commitado)

  // Cronômetro geral da sessão — recalcula sempre a partir de startedAt (timestamp
  // durável, sobrevive a refresh), nunca de um contador em memória. Para de tiquetaquear
  // quando o treino é concluído (completedAt fixa o fim).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (activeWorkout.completedAt) return
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeWorkout.completedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const elapsedSec = Math.max(0, Math.floor(
    ((activeWorkout.completedAt ? new Date(activeWorkout.completedAt).getTime() : nowTick)
      - new Date(activeWorkout.startedAt).getTime()) / 1000
  ))

  // prefix sum das alturas reais -> centro (em px) de cada card na fita
  const centers = []
  {
    let acc = 0
    for (let i = 0; i < steps.length; i++) {
      const h = heights[i] ?? REEL_EST
      centers[i] = acc + h / 2
      acc += h + REEL_GAP
    }
  }

  // Posição "virtual" do foco, em UNIDADES DE CARD (não px) — 1 unidade sempre
  // significa "um card de distância", não importa a altura real dele. Sem isso,
  // opacidade/escala vinham de offsetPx/REEL_DECAY (px fixos), e um card mais alto
  // (ex. WEIGHT_QUESTION com histórico) ficava opticamente mais perto ou mais longe
  // que um card baixo — daí a inconsistência (às vezes só dava pra ver 1 card, às
  // vezes 2). dragY (px) é convertido pra fração de unidade usando o gap real na
  // direção do arrasto, então o arrasto continua suave e sensível ao dedo.
  const gapToPrev = viewingStepIdx > 0
    ? centers[viewingStepIdx] - centers[viewingStepIdx - 1]
    : REEL_EST + REEL_GAP
  const gapToNext = viewingStepIdx < steps.length - 1
    ? centers[viewingStepIdx + 1] - centers[viewingStepIdx]
    : REEL_EST + REEL_GAP
  const dragUnits = dragY > 0
    ? dragY / (gapToPrev || 1)
    : dragY / (gapToNext || 1)
  const focusVirtualIdx = viewingStepIdx - dragUnits

  // Sync viewingStepIdx to follow currentStepIdx when user was on the current step —
  // via commit() (mesmo caminho do arrasto/scroll), pra ligar animating e sair com a
  // MESMA transição de ~260ms, tanto ao concluir série quanto ao pular o descanso.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (viewingStepIdx === prevCurIdxRef.current) {
      commit(currentStepIdx - prevCurIdxRef.current)
    }
    prevCurIdxRef.current = currentStepIdx
  }, [currentStepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dica discreta de navegação (só na primeira vez) — fica até o usuário realmente
  // rolar o reel (commit), não some sozinha num timer.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (stackNavHintSeen) return
    setShowStackHint(true)
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

  // Mudança 3b — corte de prep na camada de execução (steps gerados permanecem íntegros)
  // Critério: peso arredondado a MIN_PLATE_INCREMENT ≥ peso de trabalho E reps ≥ mín. da série efetiva
  // Peso disponível em exerciseWeights após WEIGHT_QUESTION; buildWorkoutSteps não tem acesso a ele
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const curStep = steps[currentStepIdx]
    if (curStep?.type !== 'PREP') return

    // Ajuste 1 — guard de pré-visualização: sem peso informado não roda corte nem cálculo
    const ww = exerciseWeights[curStep.exerciseId] || 0
    if (ww <= 0) return

    const prepKg = Math.round(ww * curStep.pct / MIN_PLATE_INCREMENT) * MIN_PLATE_INCREMENT
    if (prepKg < ww) return

    const wsStep = steps.find(s => s.type === 'WORKING_SET' && s.exerciseId === curStep.exerciseId)
    // Ajuste 2 — tipos sem repRange (REST_PAUSE, MUSCLE_ROUND, PULSE) sempre diferem por GER
    // (7 vs 9+): nunca são duplicatas → wsMinReps = Infinity, corte nunca dispara para esses tipos
    const rawMinReps = parseInt(wsStep?.setDef?.repRange?.split('-')[0])
    const wsMinReps  = isNaN(rawMinReps) ? Infinity : rawMinReps
    const prepReps   = parseInt(curStep.reps) || 0

    if (prepReps < wsMinReps) return

    // Ajuste 2 — piso inegociável: preserva sempre o prep de MENOR carga (setNum=1, mais reps)
    // Preps mais pesados (setNum > 1) podem ser cortados; o mais leve nunca
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
    if (nextStep?.type === 'PREP')             restSec = getPrepRestSeconds(day)
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
      setPastEditSaved(true)
      setTimeout(() => setPastEditSaved(false), 1800)
    }
    // future steps: button is disabled, this won't be called
  }, [isCurrentStep, isPastStep, advance, saveSetResult, viewingStepIdx])

  // ── reel: commit troca a série exibida; currentStepIdx (progresso real) nunca é tocado ──
  const DRAG_COMMIT_PX = 50

  const commit = (dir) => {
    const next = viewingStepIdx + dir
    if (next >= 0 && next <= steps.length - 1) setViewingStepIdx(next)
    setDragY(0)
    setAnimating(true)
    // usuário rolou de verdade — dica cumpriu o papel, não precisa mais aparecer
    if (showStackHint) {
      setShowStackHint(false)
      setStackNavHintSeen(true)
    }
  }

  const returnToCurrent = () => {
    setAnimating(true)
    setDragY(0)
    setViewingStepIdx(currentStepIdx)
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
    // hist.preps é o histórico unificado; se vier de uma sessão antes da unificação
    // (só hist.feeders/hist.warmups existem), cai pro que tiver.
    const pd   = s.type === 'PREP'        ? ((hist?.preps ?? hist?.feeders)?.[s.setNum - 1] ?? null)
               : s.type === 'WORKING_SET' ? (hist?.sets?.[s.setNum - 1] ?? null)
               : null

    if (!isActive) {
      const noop = () => {}
      if (s.type === 'WEIGHT_QUESTION') return <WeightQuestionCard step={s} onConfirm={noop} history={hist} isLocked />
      if (s.type === 'PREP') return <PrepSetCard step={s} workingWeight={ww} onDone={noop} isLocked prevData={pd} savedResult={sr} />
      if (s.type === 'WORKING_SET') return <WorkingSetCard step={s} workingWeight={ww} onDone={noop} isLocked prevData={pd} savedResult={sr} />
      return null
    }

    if (s.type === 'WEIGHT_QUESTION') {
      const handleWeightEdit = (w) => {
        if (isCurrentStep) { handleWeightConfirm(w); return }
        // Passado: só corrige o peso guardado (não reabre a série/avança nada) —
        // permite consertar um valor errado sem precisar refazer o treino.
        setExerciseWeight(s.exerciseId, w)
        setPastEditSaved(true)
        setTimeout(() => setPastEditSaved(false), 1800)
      }
      return (
        <WeightQuestionCard
          step={s}
          onConfirm={isFutureStep ? () => {} : handleWeightEdit}
          history={hist}
          isLocked={isFutureStep}
          initialWeight={ww}
        />
      )
    }
    if (s.type === 'PREP') {
      return (
        <PrepSetCard
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
        <div className="font-mono text-[11px] text-muted tracking-wider mb-2">
          Recupere-se. Você merece.
        </div>
        <div className="font-mono text-sm text-neon/80 tracking-wider mb-8">
          DURAÇÃO: {fmtDuration(elapsedSec)}
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

  const snapTransition = 'transform 260ms cubic-bezier(.22,.61,.36,1), opacity 260ms cubic-bezier(.22,.61,.36,1)'
  // cor de fase do header inteiro segue o que está sendo exibido (prep vs série válida),
  // com fade suave em vez de trocar seco
  const phaseColor = phaseColorForStepType(vStep?.type)

  return (
    <div className="h-full flex flex-col p-3 pb-3 overflow-hidden">
      {/* top bar */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-1">
        <button
          onClick={() => setShowAbandon(true)}
          className="font-mono text-[10px] text-muted hover:text-red-400 tracking-wider transition-colors"
        >
          CANCELAR
        </button>
        <div className="flex-1 h-[3px] bg-border1">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${steps.length > 0 ? (currentStepIdx/steps.length)*100 : 0}%`, backgroundColor: phaseColor }}
          />
        </div>
        <div className="font-mono text-[10px] tracking-wider transition-colors duration-500" style={{ color: phaseColor }}>
          {workingDone}/{workingSteps}
        </div>
      </div>
      <ElapsedClock sec={elapsedSec} color={phaseColor} />

      {/* past/future banner — toque volta pra série atual */}
      {!isCurrentStep && (
        <button
          onClick={returnToCurrent}
          className={`flex-shrink-0 mb-2 px-3 py-1.5 font-mono text-[10px] tracking-widest text-center border w-full transition-colors ${
            isPastStep
              ? 'border-amber-500/30 text-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10'
              : 'border-border2 text-muted/50 hover:bg-s2'
          }`}
        >
          {isPastStep
            ? '◂ VISUALIZANDO SÉRIE ANTERIOR — TOQUE PARA VOLTAR À ATUAL'
            : 'VISUALIZANDO PRÓXIMA SÉRIE — TOQUE PARA VOLTAR À ATUAL ▸'}
        </button>
      )}

      {/* trilho único (reel): altura de cada card medida por conteúdo, nada é cortado.
          Toasts (dica + "atualizado") ficam FORA da div com mask-image logo abaixo —
          mask-image se aplica a toda a subárvore renderizada, então um filho não
          escapa dela com z-index; precisa ser irmão pra aparecer por cima de verdade. */}
      <div className="relative flex-1 min-h-0">
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

        {/* feedback de sucesso ao editar uma série já concluída */}
        <AnimatePresence>
          {pastEditSaved && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-1 left-1/2 -translate-x-1/2 z-[200] px-3 py-1.5 bg-black/80 border font-mono text-[10px] tracking-wider text-center leading-relaxed pointer-events-none flex items-center gap-1.5"
              style={{ borderColor: `${PHASE_COLOR_PREP}4d`, color: PHASE_COLOR_PREP }}
            >
              <LuCheck size={12}/> SÉRIE ATUALIZADA
            </motion.div>
          )}
        </AnimatePresence>

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          style={{
            touchAction: 'none',
            // Fade mais suave: só a franja bem na borda (4%) some de vez — antes 12%
            // cortava tanto que o card seguinte (com altura variável por tipo/conteúdo)
            // às vezes ficava invisível de tão perto da borda, dando impressão de que
            // não havia próxima série.
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent)',
            maskImage: 'linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent)',
          }}
          className="relative h-full overflow-hidden"
        >
        {steps.map((s, i) => {
          const offsetPx = (centers[i] - centers[viewingStepIdx]) + dragY
          const ad = Math.abs(i - focusVirtualIdx) // distância em unidades de card, não em px
          if (ad > 2.2) return null // fora do alcance visível (opacidade já bateu no piso antes disso)
          const scale    = Math.max(0.84, 1 - ad * 0.12)
          const opacity  = Math.max(0.22, 1 - ad * 0.5)
          const z        = 100 - Math.round(ad * 10)
          const isActive = i === viewingStepIdx
          return (
            <div
              key={i}
              ref={el => { wrapRefs.current[i] = el }}
              className={isActive ? '' : 'pointer-events-none select-none'}
              onTransitionEnd={isActive ? () => setAnimating(false) : undefined}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 'calc(100% - 4px)',
                maxWidth: 420,
                // altura auto (mede o conteúdo real) — cada card centraliza pelo próprio
                // centro via translate(-50%,-50%), então a posição respeita a altura real
                // de todo mundo na fita, sem depender de um CARD_H fixo
                transform: `translate(-50%, calc(-50% + ${offsetPx}px)) scale(${scale})`,
                opacity,
                zIndex: z,
                transition: animating ? snapTransition : 'none',
              }}
            >
              {renderRailCard(i)}
            </div>
          )
        })}
        </div>
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
