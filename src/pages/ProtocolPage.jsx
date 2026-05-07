import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LuPlus, LuTrash2, LuChevronDown, LuChevronUp, LuBed,
  LuDumbbell, LuClock, LuCheck, LuGripVertical, LuX, LuBookmark, LuSearch,
  LuDownload, LuUpload,
} from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import {
  DAY_NAMES, MUSCLE_GROUP_LIST, SET_TYPES, SET_TYPE_DESCRIPTIONS, GER_CONFIG,
} from '../data/protocol'
import { downloadTemplateCsv, parseProtocolCsv } from '../utils/protocolCsv'
import DoomFace from '../components/DoomFace'

// ─── constants ────────────────────────────────────────────────────────────────

const WEEK_LABELS = ['S01','S02','S03','S04','S05','S06','S07','S08']

const SET_TYPE_GER_DEFAULTS = {
  NORMAL:       { ger: 10, repRange: '8-12' },
  REST_PAUSE:   { ger: 12, repRange: '' },
  MUSCLE_ROUND: { ger: 11, repRange: '' },
  WIDOWMAKER:   { ger: 13, repRange: '10-12' },
  PULSE:        { ger: 9,  repRange: '' },
}

// ─── AddExerciseModal ─────────────────────────────────────────────────────────

function AddExerciseModal({ onAdd, onClose }) {
  const [name, setName]       = useState('')
  const [muscle, setMuscle]   = useState(MUSCLE_GROUP_LIST[0])
  const [saveEx, setSaveEx]   = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)
  const [search, setSearch]   = useState('')

  const savedExercises    = useStore(s => s.savedExercises)
  const addSavedExercise  = useStore(s => s.addSavedExercise)

  const filtered = savedExercises.filter(e => {
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)
  })

  const pickSaved = (ex) => {
    onAdd({ name: ex.name, muscle: ex.muscle })
    onClose()
  }

  const submit = () => {
    if (!name.trim()) return
    if (saveEx) addSavedExercise({ name: name.trim(), muscle })
    onAdd({ name: name.trim(), muscle })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/80 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="w-full max-w-[430px] bg-s1 border-t border-border1 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
          <span className="font-display text-lg tracking-[0.15em] text-neon">
            {showLibrary ? 'EXERCÍCIOS SALVOS' : 'NOVO EXERCÍCIO'}
          </span>
          <div className="flex items-center gap-2">
            {!showLibrary && savedExercises.length > 0 && (
              <button
                onClick={() => setShowLibrary(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-neon/40 text-neon font-mono text-[10px] tracking-wider hover:bg-neon/5 transition-colors"
              >
                <LuBookmark size={12}/> SALVOS ({savedExercises.length})
              </button>
            )}
            <button onClick={onClose} className="text-muted hover:text-ink p-1"><LuX size={18}/></button>
          </div>
        </div>

        {showLibrary ? (
          <div className="flex flex-col flex-1 overflow-hidden px-5 pb-6">
            {/* search */}
            <div className="relative mb-3">
              <LuSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50"/>
              <input
                autoFocus
                className="w-full bg-s2 border border-border2 pl-8 pr-3 py-2 font-mono text-sm text-ink focus:border-neon outline-none transition-colors"
                placeholder="Nome ou grupamento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* muscle filter pills */}
            <div className="flex gap-1 flex-wrap mb-3">
              {['', ...MUSCLE_GROUP_LIST].map(m => (
                <button
                  key={m || 'all'}
                  onClick={() => setSearch(m)}
                  className={`px-2 py-0.5 font-mono text-[10px] border transition-all ${
                    search === m ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
                  }`}
                >
                  {m || 'TODOS'}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 && (
                <div className="text-center py-8 font-mono text-[11px] text-muted/40">
                  {savedExercises.length === 0 ? 'Nenhum exercício salvo ainda.' : 'Nenhum resultado.'}
                </div>
              )}
              {filtered.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => pickSaved(ex)}
                  className="w-full flex items-center gap-3 bg-s2 border border-border2 px-3 py-2.5 mb-1.5 text-left hover:border-neon/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm tracking-wider text-ink truncate">{ex.name}</div>
                    <div className="font-mono text-[10px] text-muted">{ex.muscle}</div>
                  </div>
                  <LuPlus size={14} className="text-neon flex-shrink-0"/>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowLibrary(false)}
              className="mt-3 w-full py-2.5 font-display text-sm tracking-[0.15em] border border-border2 text-muted hover:text-ink transition-colors"
            >
              ← VOLTAR
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-5 pb-8">
            <div className="mb-3">
              <label className="section-label block mb-1">NOME DO EXERCÍCIO</label>
              <input
                autoFocus
                className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors"
                placeholder="Ex: Agachamento livre"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>

            <div className="mb-4">
              <label className="section-label block mb-1">GRUPO MUSCULAR</label>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUP_LIST.map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscle(m)}
                    className={`px-2.5 py-1 font-mono text-[11px] tracking-wider border transition-all ${
                      muscle === m
                        ? 'bg-neon text-bg border-neon'
                        : 'bg-s2 border-border2 text-muted hover:text-ink'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* save toggle */}
            <div className="flex items-center justify-between bg-s2 border border-border2 px-3 py-2.5 mb-5">
              <div>
                <div className="font-display text-sm tracking-wider text-ink">SALVAR NA BIBLIOTECA</div>
                <div className="font-mono text-[10px] text-muted">Reutilizar em outros treinos</div>
              </div>
              <button
                onClick={() => setSaveEx(v => !v)}
                className={`w-10 h-5 rounded-full border-2 relative transition-all ${saveEx ? 'bg-neon/20 border-neon' : 'bg-s1 border-border2'}`}
              >
                <motion.div
                  animate={{ x: saveEx ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className={`absolute top-0.5 w-3 h-3 rounded-full ${saveEx ? 'bg-neon' : 'bg-muted'}`}
                />
              </button>
            </div>

            <button
              onClick={submit}
              disabled={!name.trim()}
              className="w-full py-3 font-display text-sm tracking-[0.2em] bg-neon text-bg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              ADICIONAR EXERCÍCIO
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── AddSetModal ──────────────────────────────────────────────────────────────

function AddSetModal({ onAdd, onClose }) {
  const [type, setType]       = useState('NORMAL')
  const [ger, setGer]         = useState(SET_TYPE_GER_DEFAULTS.NORMAL.ger)
  const [repRange, setRepRange] = useState(SET_TYPE_GER_DEFAULTS.NORMAL.repRange)

  const handleTypeChange = (t) => {
    setType(t)
    setGer(SET_TYPE_GER_DEFAULTS[t].ger)
    setRepRange(SET_TYPE_GER_DEFAULTS[t].repRange)
  }

  const submit = () => {
    onAdd({ type, ger, repRange })
    onClose()
  }

  const cfg = SET_TYPES[type]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/80 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="w-full max-w-[430px] bg-s1 border-t border-border1 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
          <span className="font-display text-lg tracking-[0.15em] text-neon">TIPO DE SÉRIE</span>
          <button onClick={onClose} className="text-muted hover:text-ink p-1"><LuX size={18}/></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">

        {/* Type selector */}
        <div className="flex flex-col gap-1.5 mb-4">
          {Object.entries(SET_TYPES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => handleTypeChange(key)}
              className={`flex items-center gap-3 px-3 py-2.5 border text-left transition-all ${
                type === key ? 'border-opacity-100' : 'bg-s2 border-border2 opacity-60 hover:opacity-80'
              }`}
              style={type === key ? { borderColor: val.color, background: val.color + '15' } : {}}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: val.color }} />
              <div className="flex-1">
                <div className="font-display text-[13px] tracking-wider" style={{ color: type === key ? val.color : '' }}>
                  {val.label}
                </div>
                <div className="font-mono text-[10px] text-muted mt-0.5 leading-relaxed">{SET_TYPE_DESCRIPTIONS[key]}</div>
              </div>
            </button>
          ))}
        </div>

        {/* GER selector (only for NORMAL, user can adjust) */}
        {type === 'NORMAL' && (
          <div className="mb-4">
            <label className="section-label block mb-2">NÍVEL DE ESFORÇO (GER)</label>
            <div className="flex gap-1.5 flex-wrap">
              {[7,8,9,10,11,12,13].map(g => (
                <button
                  key={g}
                  onClick={() => setGer(g)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border font-mono text-[11px] tracking-wider transition-all ${
                    ger === g ? 'border-neon text-neon bg-neon/10' : 'bg-s2 border-border2 text-muted hover:text-ink'
                  }`}
                >
                  <DoomFace face={GER_CONFIG[g].face} size={18}/>
                  GER {g}
                </button>
              ))}
            </div>
            {ger && (
              <div className="mt-2 font-mono text-[10px] text-muted">
                {GER_CONFIG[ger].title} — {GER_CONFIG[ger].subtitle}
              </div>
            )}
          </div>
        )}

        {/* Rep range (NORMAL) */}
        {type === 'NORMAL' && (
          <div className="mb-5">
            <label className="section-label block mb-1">REP RANGE</label>
            <div className="flex gap-1.5 flex-wrap">
              {['5-9','6-10','8-12','10-15','12-20'].map(r => (
                <button
                  key={r}
                  onClick={() => setRepRange(r)}
                  className={`px-3 py-1.5 border font-mono text-[11px] tracking-wider transition-all ${
                    repRange === r ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
              <input
                className="w-20 bg-s2 border border-border2 px-2 py-1.5 font-mono text-[11px] text-ink focus:border-neon outline-none"
                placeholder="custom"
                value={['5-9','6-10','8-12','10-15','12-20'].includes(repRange) ? '' : repRange}
                onChange={e => setRepRange(e.target.value)}
              />
            </div>
          </div>
        )}

        {type !== 'NORMAL' && (
          <div className="mb-5 bg-s2 border border-border2 px-3 py-2.5">
            <div className="font-mono text-[10px] text-muted tracking-wider">GER PADRÃO</div>
            <div className="flex items-center gap-2 mt-1">
              <DoomFace face={GER_CONFIG[cfg.ger].face} size={24}/>
              <div>
                <div className="font-display text-sm tracking-wider" style={{ color: cfg.color }}>
                  GER {cfg.ger}
                </div>
                <div className="font-mono text-[10px] text-muted">{GER_CONFIG[cfg.ger].title}</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={submit}
          className="w-full py-3 font-display text-sm tracking-[0.2em] text-bg transition-opacity"
          style={{ background: cfg.color }}
        >
          ADICIONAR SÉRIE
        </button>

        </div>{/* end scrollable area */}
      </motion.div>
    </motion.div>
  )
}

// ─── ExerciseEditor ───────────────────────────────────────────────────────────

function ExerciseEditor({ exercise, weekIdx, dayIdx, index, total }) {
  const [open, setOpen]       = useState(false)
  const [showAddSet, setShowAddSet] = useState(false)
  const addSet      = useStore(s => s.addSet)
  const removeSet   = useStore(s => s.removeSet)
  const removeExercise = useStore(s => s.removeExercise)

  return (
    <>
      <div className="bg-s2 border border-border2 mb-2">
        {/* header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
          onClick={() => setOpen(o => !o)}
        >
          <LuGripVertical size={14} className="text-muted/40 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm tracking-wider text-ink truncate">{exercise.name}</div>
            <div className="font-mono text-[10px] text-muted tracking-wider">{exercise.muscle}</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {exercise.sets.map(s => (
              <div
                key={s.id}
                className="w-2 h-2 rounded-full"
                style={{ background: SET_TYPES[s.type]?.color || '#555' }}
                title={SET_TYPES[s.type]?.label}
              />
            ))}
            {exercise.sets.length === 0 && (
              <span className="font-mono text-[10px] text-muted/50">sem séries</span>
            )}
          </div>
          <button
            className={`text-muted hover:text-ink transition-colors ml-1`}
            onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          >
            {open ? <LuChevronUp size={16}/> : <LuChevronDown size={16}/>}
          </button>
        </div>

        {/* body */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 border-t border-border1">
                {/* sets list */}
                {exercise.sets.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {exercise.sets.map((s, si) => {
                      const typeInfo = SET_TYPES[s.type] || {}
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 bg-s1 border border-border1 px-2.5 py-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: typeInfo.color }}/>
                          <div className="flex-1 min-w-0">
                            <span className="font-display text-[12px] tracking-wider" style={{ color: typeInfo.color }}>
                              {typeInfo.label}
                            </span>
                            {s.repRange && (
                              <span className="font-mono text-[10px] text-muted ml-2">{s.repRange} reps</span>
                            )}
                            <span className="font-mono text-[10px] text-muted ml-2">GER {s.ger}</span>
                          </div>
                          <button
                            onClick={() => removeSet(weekIdx, dayIdx, exercise.id, s.id)}
                            className="p-1 text-muted/50 hover:text-red-400 transition-colors"
                          >
                            <LuX size={13}/>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {exercise.sets.length === 0 && (
                  <div className="mt-2 font-mono text-[10px] text-muted/50 text-center py-3 border border-dashed border-border2">
                    Nenhuma série. Adicione pelo menos uma.
                  </div>
                )}

                {/* actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowAddSet(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-dashed border-neon/50 text-neon font-mono text-[11px] tracking-wider hover:bg-neon/5 transition-colors"
                  >
                    <LuPlus size={13}/> ADICIONAR SÉRIE
                  </button>
                  <button
                    onClick={() => removeExercise(weekIdx, dayIdx, exercise.id)}
                    className="px-3 py-2 border border-dashed border-red-500/30 text-red-400 font-mono text-[11px] hover:bg-red-500/10 transition-colors"
                  >
                    <LuTrash2 size={13}/>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddSet && (
          <AddSetModal
            onAdd={(setDef) => addSet(weekIdx, dayIdx, exercise.id, setDef)}
            onClose={() => setShowAddSet(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── DayEditor ────────────────────────────────────────────────────────────────

function DayEditor({ weekIdx, dayIdx }) {
  const [showAddExercise, setShowAddExercise] = useState(false)
  const userProtocol          = useStore(s => s.userProtocol)
  const setDayRest            = useStore(s => s.setDayRest)
  const setDayRestSeconds     = useStore(s => s.setDayRestSeconds)
  const setDayWarmupRestSeconds = useStore(s => s.setDayWarmupRestSeconds)
  const setDayFeederRestSeconds = useStore(s => s.setDayFeederRestSeconds)
  const addExercise           = useStore(s => s.addExercise)

  const day = userProtocol.weeks[weekIdx].days[dayIdx]

  return (
    <div className="p-3 pb-6">
      {/* Rest day toggle */}
      <div className="flex items-center justify-between bg-s2 border border-border2 px-3 py-3 mb-3">
        <div>
          <div className="font-display text-sm tracking-wider text-ink">DIA DE DESCANSO</div>
          <div className="font-mono text-[10px] text-muted mt-0.5">Sem exercícios neste dia</div>
        </div>
        <button
          onClick={() => setDayRest(weekIdx, dayIdx, !day.isRest)}
          className={`w-12 h-6 rounded-full border-2 relative transition-all duration-200 ${
            day.isRest ? 'bg-neon/20 border-neon' : 'bg-s1 border-border2'
          }`}
        >
          <motion.div
            animate={{ x: day.isRest ? 24 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`absolute top-0.5 w-4 h-4 rounded-full ${day.isRest ? 'bg-neon' : 'bg-muted'}`}
          />
        </button>
      </div>

      {!day.isRest && (
        <>
          {/* Rest durations */}
          {[
            {
              label: 'SÉRIES DE TRABALHO',
              sub: 'Descanso após working sets',
              field: 'restSeconds',
              set: (v) => setDayRestSeconds(weekIdx, dayIdx, v),
              opts: [60, 90, 120, 150, 180],
            },
            {
              label: 'AQUECIMENTO',
              sub: 'Descanso entre warmup sets',
              field: 'warmupRestSeconds',
              set: (v) => setDayWarmupRestSeconds(weekIdx, dayIdx, v),
              opts: [30, 45, 60, 90],
            },
            {
              label: 'FEEDER SETS',
              sub: 'Descanso entre feeders',
              field: 'feederRestSeconds',
              set: (v) => setDayFeederRestSeconds(weekIdx, dayIdx, v),
              opts: [45, 60, 90, 120],
            },
          ].map(({ label, sub, field, set: setter, opts }) => (
            <div key={field} className="bg-s2 border border-border2 px-3 py-2.5 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <LuClock size={13} className="text-muted flex-shrink-0"/>
                <div>
                  <div className="font-display text-[12px] tracking-wider text-ink leading-tight">{label}</div>
                  <div className="font-mono text-[9px] text-muted mt-0.5">{sub}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {opts.map(s => {
                  const m = Math.floor(s / 60), sec = s % 60
                  const lbl = m === 0 ? `${s}s` : sec ? `${m}'${String(sec).padStart(2,'0')}` : `${m}'`
                  const current = day[field] ?? opts[Math.floor(opts.length / 2)]
                  return (
                    <button
                      key={s}
                      onClick={() => setter(s)}
                      className={`px-3 py-1.5 font-mono text-[11px] border transition-all ${
                        current === s
                          ? 'bg-neon text-bg border-neon'
                          : 'bg-s1 border-border1 text-muted hover:text-ink'
                      }`}
                    >
                      {lbl}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Exercises */}
          {day.exercises.length > 0 && (
            <div className="mb-3">
              {day.exercises.map((ex, i) => (
                <ExerciseEditor
                  key={ex.id}
                  exercise={ex}
                  weekIdx={weekIdx}
                  dayIdx={dayIdx}
                  index={i}
                  total={day.exercises.length}
                />
              ))}
            </div>
          )}

          {day.exercises.length === 0 && (
            <div className="text-center py-8 border border-dashed border-border2 mb-3">
              <LuDumbbell size={28} className="text-muted/30 mx-auto mb-2"/>
              <div className="font-mono text-[11px] text-muted/50 tracking-wider">
                Nenhum exercício neste dia
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAddExercise(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-neon/60 text-neon font-display text-sm tracking-[0.2em] hover:bg-neon/5 transition-colors"
          >
            <LuPlus size={16}/> ADICIONAR EXERCÍCIO
          </button>
        </>
      )}

      {day.isRest && (
        <div className="text-center py-10">
          <LuBed size={36} className="text-muted/30 mx-auto mb-3"/>
          <div className="font-display text-2xl tracking-[0.3em] text-muted/40">DESCANSO</div>
          <div className="font-mono text-[10px] text-muted/30 mt-2">Recupere-se. Cresça.</div>
        </div>
      )}

      <AnimatePresence>
        {showAddExercise && (
          <AddExerciseModal
            onAdd={(ex) => addExercise(weekIdx, dayIdx, ex)}
            onClose={() => setShowAddExercise(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ProtocolPage ─────────────────────────────────────────────────────────────

export default function ProtocolPage() {
  const [weekIdx, setWeekIdx]     = useState(0)
  const [dayIdx, setDayIdx]       = useState(0)
  const [csvError, setCsvError]   = useState(null)
  const [csvSuccess, setCsvSuccess] = useState(false)
  const fileInputRef              = useRef(null)
  const userProtocol   = useStore(s => s.userProtocol)
  const setUserProtocol = useStore(s => s.setUserProtocol)

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const protocol = parseProtocolCsv(ev.target.result)
        setUserProtocol(protocol)
        setCsvError(null)
        setCsvSuccess(true)
        setTimeout(() => setCsvSuccess(false), 3000)
      } catch (err) {
        setCsvError(err.message)
        setTimeout(() => setCsvError(null), 5000)
      }
    }
    reader.readAsText(file)
  }

  const day = userProtocol.weeks[weekIdx].days[dayIdx]

  // Count non-rest days with exercises in the selected week
  const weekStats = userProtocol.weeks[weekIdx].days.reduce(
    (acc, d) => {
      if (!d.isRest && d.exercises.length > 0) acc.activeDays++
      acc.totalExercises += d.exercises.length
      return acc
    },
    { activeDays: 0, totalExercises: 0 }
  )

  return (
    <div className="pb-8">
      {/* Week selector */}
      <div className="sticky top-0 z-10 bg-bg border-b border-border1 px-3 pt-3 pb-2">
        {/* CSV import/export */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={downloadTemplateCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-s2 border border-border2 text-muted hover:text-ink hover:border-neon/40 transition-all font-mono text-[10px] tracking-widest"
          >
            <LuDownload size={12}/> TEMPLATE
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all font-mono text-[10px] tracking-widest ${
              csvSuccess
                ? 'bg-neon/20 border-neon text-neon'
                : 'bg-s2 border-border2 text-muted hover:text-ink hover:border-neon/40'
            }`}
          >
            <LuUpload size={12}/> {csvSuccess ? 'IMPORTADO!' : 'IMPORTAR CSV'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload}/>
          {csvError && (
            <span className="flex-1 font-mono text-[9px] text-neon leading-tight self-center">{csvError}</span>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2">
          {WEEK_LABELS.map((label, i) => {
            const w = userProtocol.weeks[i]
            const hasContent = w.days.some(d => !d.isRest && d.exercises.length > 0)
            return (
              <button
                key={i}
                onClick={() => { setWeekIdx(i); setDayIdx(0) }}
                className={`flex-shrink-0 px-3 py-1.5 font-display text-[13px] tracking-wider border transition-all relative ${
                  i === weekIdx
                    ? 'bg-neon text-bg border-neon'
                    : 'bg-s2 border-border2 text-muted hover:text-ink'
                }`}
              >
                {label}
                {hasContent && i !== weekIdx && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon/60 rounded-full"/>
                )}
              </button>
            )
          })}
        </div>

        {/* Day selector */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {DAY_NAMES.map((name, i) => {
            const d = userProtocol.weeks[weekIdx].days[i]
            const isActive = i === dayIdx
            return (
              <button
                key={i}
                onClick={() => setDayIdx(i)}
                className={`flex-shrink-0 px-3 py-1.5 font-body font-bold text-xs tracking-wider border transition-all ${
                  isActive
                    ? 'bg-neon text-bg border-neon'
                    : d.isRest
                    ? 'bg-s2 border-border2 border-dashed text-muted/40'
                    : d.exercises.length > 0
                    ? 'bg-s2 border-border2 text-ink'
                    : 'bg-s2 border-border2 text-muted hover:text-ink'
                }`}
              >
                {name}
                {!d.isRest && d.exercises.length > 0 && (
                  <span className={`ml-1 font-mono text-[9px] ${isActive ? 'text-bg/70' : 'text-neon'}`}>
                    {d.exercises.length}
                  </span>
                )}
                {d.isRest && <span className="ml-1 font-mono text-[9px]">Z</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Week summary bar */}
      <div className="px-3 py-2 border-b border-border1 flex gap-4 bg-s1">
        <div>
          <div className="font-mono text-[9px] text-muted tracking-widest">SEMANA {weekIdx+1}</div>
          <div className="font-display text-sm tracking-wider text-ink">{weekStats.activeDays} DIAS ATIVOS</div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-muted tracking-widest">EXERCÍCIOS</div>
          <div className="font-display text-sm tracking-wider text-ink">{weekStats.totalExercises} TOTAL</div>
        </div>
        <div className="ml-auto flex items-center">
          <span className={`font-mono text-[10px] px-2 py-0.5 ${
            day.isRest ? 'bg-muted/20 text-muted' : 'bg-neon/20 text-neon'
          }`}>
            {DAY_NAMES[dayIdx]} {day.isRest ? '— DESCANSO' : day.exercises.length === 0 ? '— VAZIO' : `— ${day.exercises.length} EX.`}
          </span>
        </div>
      </div>

      <DayEditor key={`${weekIdx}-${dayIdx}`} weekIdx={weekIdx} dayIdx={dayIdx} />
    </div>
  )
}
