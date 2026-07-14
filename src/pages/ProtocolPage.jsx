import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LuPlus, LuTrash2, LuChevronDown, LuChevronUp, LuBed,
  LuDumbbell, LuClock, LuCheck, LuGripVertical, LuX, LuBookmark, LuSearch,
  LuDownload, LuUpload, LuPencil, LuImage,
} from 'react-icons/lu'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCenter, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../hooks/useStore'
import {
  DAY_NAMES, MUSCLE_GROUP_LIST, SET_TYPES, SET_TYPE_DESCRIPTIONS, GER_CONFIG, getPrepRestSeconds,
} from '../data/protocol'
import { downloadTemplateCsv, parseProtocolCsv, downloadProtocolCsv } from '../utils/protocolCsv'
import { exerciseSource } from '../lib/exerciseSource'
import DoomFace from '../components/DoomFace'
import ExerciseGif from '../components/ExerciseGif'
import ExerciseDetailModal from '../components/ExerciseDetailModal'

// ─── constants ────────────────────────────────────────────────────────────────

const weekLabel = (i) => `S${String(i + 1).padStart(2, '0')}`

const SET_TYPE_GER_DEFAULTS = {
  NORMAL:       { ger: 10, repRange: '8-12' },
  REST_PAUSE:   { ger: 12, repRange: '' },
  MUSCLE_ROUND: { ger: 11, repRange: '' },
  WIDOWMAKER:   { ger: 13, repRange: '10-12' },
  PULSE:        { ger: 9,  repRange: '' },
}

// Thumbnail compacto pra cards de exercício do protocolo já linkados à biblioteca.
// O protocolo guarda só o libraryId (nunca duplica gifUrl) — busca sob demanda e
// fica pequeno (28px) de propósito pra não estourar a altura da linha do card.
function LibraryThumb({ libraryId, size = 28 }) {
  const [gifUrl, setGifUrl] = useState(null)
  useEffect(() => {
    let cancelled = false
    exerciseSource.getExercise(libraryId).then(ex => { if (!cancelled) setGifUrl(ex?.gifUrl ?? null) })
    return () => { cancelled = true }
  }, [libraryId])
  return (
    <div
      className="flex-shrink-0 border border-border1 overflow-hidden bg-s1 rounded-sm"
      style={{ width: size, height: size }}
    >
      {gifUrl ? <ExerciseGif src={gifUrl} alt="" lite /> : <div className="w-full h-full bg-s2" />}
    </div>
  )
}

// ─── AddExerciseModal ─────────────────────────────────────────────────────────

function AddExerciseModal({ onAdd, onClose }) {
  const [name, setName]             = useState('')
  const [muscle, setMuscle]         = useState(MUSCLE_GROUP_LIST[0])
  const [accessoryMuscle, setAccessoryMuscle] = useState('')
  const [saveEx, setSaveEx]         = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)
  const [search, setSearch]         = useState('')

  // ── busca automática na biblioteca de exercícios (GIFs, ExerciseDB) ────────
  // Dispara sozinha enquanto o usuário digita o nome — sem tela separada. Aceita
  // termos em português (ver exercisePtDictionary) além do nome original em inglês.
  const [suggestions, setSuggestions]   = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [libraryId, setLibraryId]   = useState(null)
  const [libraryGif, setLibraryGif] = useState(null)
  const [libraryNamePt, setLibraryNamePt] = useState(null)
  const [showLibDetail, setShowLibDetail] = useState(false)
  // Buscar e linkar é o caminho padrão agora — os seletores manuais só aparecem se
  // o usuário pedir explicitamente (exercício de verdade novo, sem match na lib).
  const [manualMuscleMode, setManualMuscleMode] = useState(false)

  useEffect(() => {
    if (libraryId) { setSuggestions([]); return } // já linkado — não sugere mais
    const q = name.trim()
    if (q.length < 3) { setSuggestions([]); setSuggestLoading(false); return }
    let cancelled = false
    setSuggestLoading(true)
    const t = setTimeout(() => {
      exerciseSource.listExercises({ search: q, pageSize: 6 })
        .then(({ items }) => { if (!cancelled) setSuggestions(items) })
        .catch(() => { if (!cancelled) setSuggestions([]) })
        .finally(() => { if (!cancelled) setSuggestLoading(false) })
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [name, libraryId])

  const savedExercises    = useStore(s => s.savedExercises)
  const addSavedExercise  = useStore(s => s.addSavedExercise)

  const filtered = savedExercises.filter(e => {
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)
  })

  const pickSaved = (ex) => {
    onAdd({
      name: ex.name,
      muscle: ex.muscle,
      ...(ex.accessoryMuscle ? { accessoryMuscle: ex.accessoryMuscle } : {}),
      ...(ex.libraryId ? { libraryId: ex.libraryId } : {}),
    })
    onClose()
  }

  const pickFromLibrary = (ex) => {
    setName(ex.name)
    setLibraryId(ex.id)
    setLibraryGif(ex.gifUrl)
    setLibraryNamePt(ex.namePt || null)
    setSuggestions([])
    setShowSuggestions(false)
    // Exercício próprio já cadastra músculo alvo/secundário (MUSCLE_GROUP_LIST) —
    // reaproveita direto e some com os seletores manuais. Exercício antigo (ExerciseDB,
    // taxonomia em inglês) não bate com MUSCLE_GROUP_LIST — cai pro seletor manual.
    setMuscle(MUSCLE_GROUP_LIST.includes(ex.targetMuscles?.[0]) ? ex.targetMuscles[0] : MUSCLE_GROUP_LIST[0])
    setAccessoryMuscle(MUSCLE_GROUP_LIST.includes(ex.secondaryMuscles?.[0]) ? ex.secondaryMuscles[0] : '')
  }

  // Só esconde os seletores manuais quando o vínculo já resolveu um músculo alvo
  // válido — exercício antigo sem taxonomia compatível continua pedindo manual.
  const libraryMuscleKnown = !!libraryId && MUSCLE_GROUP_LIST.includes(muscle)
  const needsMuscleInput   = !libraryMuscleKnown && !manualMuscleMode

  const submit = () => {
    if (!name.trim() || needsMuscleInput) return
    const ex = {
      name: name.trim(),
      muscle,
      ...(accessoryMuscle ? { accessoryMuscle } : {}),
      ...(libraryId ? { libraryId } : {}),
      // Apelido PT já vem cadastrado na própria biblioteca — nada pra digitar de novo aqui.
      ...(libraryId && libraryNamePt ? { namePt: libraryNamePt } : {}),
    }
    if (saveEx) addSavedExercise(ex)
    onAdd(ex)
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
            <div className="mb-3 relative">
              <label className="section-label block mb-1">NOME DO EXERCÍCIO</label>
              <input
                className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors"
                placeholder="Ex: Agachamento livre (busca a biblioteca automaticamente)"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => e.key === 'Enter' && submit()}
              />

              {showSuggestions && !libraryId && name.trim().length >= 3 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-s2 border border-border2 max-h-64 overflow-y-auto shadow-lg">
                  {suggestLoading && (
                    <div className="text-center py-3 font-mono text-[10px] text-muted/50">BUSCANDO NA BIBLIOTECA...</div>
                  )}
                  {!suggestLoading && suggestions.length === 0 && (
                    <div className="text-center py-3 font-mono text-[10px] text-muted/50">
                      Sem GIF na biblioteca — pode continuar com nome livre.
                    </div>
                  )}
                  {suggestions.map(ex => (
                    <button
                      key={ex.id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => pickFromLibrary(ex)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 border-b border-border1 last:border-0 text-left hover:bg-s1 transition-colors"
                    >
                      <div className="w-8 h-8 flex-shrink-0 border border-border1 overflow-hidden bg-s1">
                        <ExerciseGif src={ex.gifUrl} alt={ex.name} lite />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body text-xs text-ink truncate">{ex.name}</div>
                        {ex.targetMuscles[0] && (
                          <div className="font-mono text-[9px] text-neon/70 uppercase truncate">{ex.targetMuscles[0]}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {libraryId && (
              <div className="flex items-center gap-2.5 bg-s2 border border-neon/30 px-2.5 py-2 mb-4">
                <div className="w-9 h-9 flex-shrink-0 border border-border1 overflow-hidden bg-s1">
                  <ExerciseGif src={libraryGif} alt={name} lite />
                </div>
                <div className="flex-1 min-w-0 font-mono text-[10px] text-neon tracking-wider">
                  VINCULADO À BIBLIOTECA
                </div>
                <button
                  onClick={() => setShowLibDetail(true)}
                  className="text-muted hover:text-neon p-1 flex-shrink-0"
                  title="Ver exercício"
                >
                  <LuImage size={14}/>
                </button>
                <button
                  onClick={() => { setLibraryId(null); setLibraryGif(null); setManualMuscleMode(false) }}
                  className="text-muted hover:text-red-400 p-1 flex-shrink-0"
                  title="Remover vínculo"
                >
                  <LuX size={14}/>
                </button>
              </div>
            )}

            {libraryMuscleKnown ? (
              <div className="mb-4 font-mono text-[10px] text-muted tracking-wider bg-s2 border border-border2 px-3 py-2.5 space-y-0.5">
                <div>MÚSCULO (DA BIBLIOTECA): <span className="text-neon">{muscle}</span>
                  {accessoryMuscle && <> · ACESSÓRIO: <span className="text-amber-400">{accessoryMuscle}</span></>}
                </div>
                {libraryNamePt && <div>APELIDO: <span className="text-ink">{libraryNamePt}</span></div>}
              </div>
            ) : !manualMuscleMode ? (
              <div className="mb-4 font-mono text-[10px] text-muted/60 tracking-wider text-center border border-dashed border-border2 px-3 py-3 leading-relaxed">
                Busque o nome acima pra vincular à biblioteca (traz músculo e apelido sozinho).
                <button
                  onClick={() => setManualMuscleMode(true)}
                  className="block mx-auto mt-2 text-neon hover:underline"
                >
                  Não achei — cadastrar exercício manualmente
                </button>
              </div>
            ) : (
              <>
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

                <div className="mb-4">
                  <label className="section-label block mb-1">MÚSCULO ACESSÓRIO <span className="text-muted/50">(opcional)</span></label>
                  <div className="font-mono text-[9px] text-muted/60 mb-2 leading-relaxed">
                    Músculo recrutado neste exercício que é principal de outro exercício posterior.<br/>
                    Reduz aquecimentos desse músculo.
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setAccessoryMuscle('')}
                      className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                        accessoryMuscle === '' ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
                      }`}
                    >
                      NENHUM
                    </button>
                    {MUSCLE_GROUP_LIST.map(m => (
                      <button
                        key={m}
                        onClick={() => setAccessoryMuscle(accessoryMuscle === m ? '' : m)}
                        className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                          accessoryMuscle === m ? 'bg-amber-500/20 text-amber-400 border-amber-500/60' : 'bg-s2 border-border2 text-muted hover:text-ink'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

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
              disabled={!name.trim() || needsMuscleInput}
              className="w-full py-3 font-display text-sm tracking-[0.2em] bg-neon text-bg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              ADICIONAR EXERCÍCIO
            </button>
          </div>
        )}
      </motion.div>
      {showLibDetail && <ExerciseDetailModal id={libraryId} onClose={() => setShowLibDetail(false)} />}
    </motion.div>
  )
}

// ─── EditExerciseModal ────────────────────────────────────────────────────────

function EditExerciseModal({ exercise, onSave, onClose }) {
  const [name, setName]             = useState(exercise.name)
  const [muscle, setMuscle]         = useState(exercise.muscle)
  const [accessoryMuscle, setAccessoryMuscle] = useState(exercise.accessoryMuscle || '')
  const [namePt, setNamePt]         = useState(exercise.namePt || '')
  const [showLibDetail, setShowLibDetail] = useState(false)
  // null = automático (segue o estado do músculo); 0-3 = trava manual
  const [prepOverride, setPrepOverride] = useState(
    exercise.prepSetsOverride != null ? exercise.prepSetsOverride : null
  )

  // ── vínculo com a biblioteca (GIFs) — editável aqui também, não só ao criar ──
  const [libraryId, setLibraryId]   = useState(exercise.libraryId ?? null)
  const [libraryGif, setLibraryGif] = useState(null)
  const [suggestions, setSuggestions]     = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  // Exercício que já existia sem vínculo (de antes desta feature) mantém os
  // seletores manuais visíveis de cara — só um exercício novo (Add) força
  // buscar-e-linkar primeiro.
  const [manualMuscleMode, setManualMuscleMode] = useState(!exercise.libraryId)

  useEffect(() => {
    if (!exercise.libraryId) return
    let cancelled = false
    exerciseSource.getExercise(exercise.libraryId).then(ex => {
      if (cancelled || !ex) return
      setLibraryGif(ex.gifUrl ?? null)
      // Já linkado desde antes de abrir — músculo alvo/secundário e apelido PT vêm
      // do cadastro da biblioteca (mesma regra do pick feito na hora). Não tem mais
      // seletor manual nem campo de apelido pra digitar de novo aqui.
      if (MUSCLE_GROUP_LIST.includes(ex.targetMuscles?.[0])) setMuscle(ex.targetMuscles[0])
      if (MUSCLE_GROUP_LIST.includes(ex.secondaryMuscles?.[0])) setAccessoryMuscle(ex.secondaryMuscles[0])
      setNamePt(ex.namePt || '')
    })
    return () => { cancelled = true }
  }, [exercise.libraryId])

  useEffect(() => {
    if (libraryId) { setSuggestions([]); return }
    const q = name.trim()
    if (q.length < 3) { setSuggestions([]); setSuggestLoading(false); return }
    let cancelled = false
    setSuggestLoading(true)
    const t = setTimeout(() => {
      exerciseSource.listExercises({ search: q, pageSize: 6 })
        .then(({ items }) => { if (!cancelled) setSuggestions(items) })
        .catch(() => { if (!cancelled) setSuggestions([]) })
        .finally(() => { if (!cancelled) setSuggestLoading(false) })
    }, 400)
    return () => { cancelled = true; clearTimeout(t) }
  }, [name, libraryId])

  const pickFromLibrary = (ex) => {
    setName(ex.name)
    setLibraryId(ex.id)
    setLibraryGif(ex.gifUrl)
    setSuggestions([])
    setShowSuggestions(false)
    setMuscle(MUSCLE_GROUP_LIST.includes(ex.targetMuscles?.[0]) ? ex.targetMuscles[0] : MUSCLE_GROUP_LIST[0])
    setAccessoryMuscle(MUSCLE_GROUP_LIST.includes(ex.secondaryMuscles?.[0]) ? ex.secondaryMuscles[0] : '')
    setNamePt(ex.namePt || '')
  }

  // Só esconde os seletores manuais quando o vínculo já resolveu um músculo alvo
  // válido — exercício antigo sem taxonomia compatível continua pedindo manual.
  const libraryMuscleKnown = !!libraryId && MUSCLE_GROUP_LIST.includes(muscle)
  const needsMuscleInput   = !libraryMuscleKnown && !manualMuscleMode

  const submit = () => {
    if (!name.trim() || needsMuscleInput) return
    onSave({
      name: name.trim(),
      muscle,
      ...(accessoryMuscle ? { accessoryMuscle } : { accessoryMuscle: undefined }),
      prepSetsOverride: prepOverride,
      libraryId: libraryId || null,
      // Apelido PT já vem cadastrado na própria biblioteca quando linkado.
      ...(libraryId ? { namePt: namePt.trim() || null } : {}),
    })
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
        className="w-full max-w-[430px] bg-s1 border-t border-border1 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <span className="font-display text-lg tracking-[0.15em] text-neon">EDITAR EXERCÍCIO</span>
          <button onClick={onClose} className="text-muted hover:text-ink p-1"><LuX size={18}/></button>
        </div>

        <div className="px-5 pb-8">
          <div className="mb-3 relative">
            <label className="section-label block mb-1">NOME DO EXERCÍCIO</label>
            <input
              className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />

            {showSuggestions && !libraryId && name.trim().length >= 3 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-s2 border border-border2 max-h-64 overflow-y-auto shadow-lg">
                {suggestLoading && (
                  <div className="text-center py-3 font-mono text-[10px] text-muted/50">BUSCANDO NA BIBLIOTECA...</div>
                )}
                {!suggestLoading && suggestions.length === 0 && (
                  <div className="text-center py-3 font-mono text-[10px] text-muted/50">
                    Sem GIF na biblioteca — pode continuar com nome livre.
                  </div>
                )}
                {suggestions.map(ex => (
                  <button
                    key={ex.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pickFromLibrary(ex)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 border-b border-border1 last:border-0 text-left hover:bg-s1 transition-colors"
                  >
                    <div className="w-8 h-8 flex-shrink-0 border border-border1 overflow-hidden bg-s1">
                      <ExerciseGif src={ex.gifUrl} alt={ex.name} lite />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-xs text-ink truncate">{ex.name}</div>
                      {ex.targetMuscles[0] && (
                        <div className="font-mono text-[9px] text-neon/70 uppercase truncate">{ex.targetMuscles[0]}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {libraryId && (
            <div className="flex items-center gap-2.5 bg-s2 border border-neon/30 px-2.5 py-2 mb-4">
              <div className="w-9 h-9 flex-shrink-0 border border-border1 overflow-hidden bg-s1">
                <ExerciseGif src={libraryGif} alt={name} lite />
              </div>
              <div className="flex-1 min-w-0 font-mono text-[10px] text-neon tracking-wider">
                VINCULADO À BIBLIOTECA
              </div>
              <button
                onClick={() => setShowLibDetail(true)}
                className="text-muted hover:text-neon p-1 flex-shrink-0"
                title="Ver exercício"
              >
                <LuImage size={14}/>
              </button>
              <button
                onClick={() => { setLibraryId(null); setLibraryGif(null); setManualMuscleMode(false) }}
                className="text-muted hover:text-red-400 p-1 flex-shrink-0"
                title="Remover vínculo"
              >
                <LuX size={14}/>
              </button>
            </div>
          )}

          {libraryMuscleKnown ? (
            <div className="mb-5 font-mono text-[10px] text-muted tracking-wider bg-s2 border border-border2 px-3 py-2.5 space-y-0.5">
              <div>MÚSCULO (DA BIBLIOTECA): <span className="text-neon">{muscle}</span>
                {accessoryMuscle && <> · ACESSÓRIO: <span className="text-amber-400">{accessoryMuscle}</span></>}
              </div>
              {namePt && <div>APELIDO: <span className="text-ink">{namePt}</span></div>}
            </div>
          ) : !manualMuscleMode ? (
            <div className="mb-5 font-mono text-[10px] text-muted/60 tracking-wider text-center border border-dashed border-border2 px-3 py-3 leading-relaxed">
              Busque o nome acima pra vincular à biblioteca (traz músculo e apelido sozinho).
              <button
                onClick={() => setManualMuscleMode(true)}
                className="block mx-auto mt-2 text-neon hover:underline"
              >
                Não achei — cadastrar músculo manualmente
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="section-label block mb-2">GRUPAMENTO MUSCULAR</label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUP_LIST.map(m => (
                    <button
                      key={m}
                      onClick={() => setMuscle(m)}
                      className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                        muscle === m ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="section-label block mb-1">MÚSCULO ACESSÓRIO <span className="text-muted/50">(opcional)</span></label>
                <div className="font-mono text-[9px] text-muted/60 mb-2">Músculo recrutado que é principal em outro exercício posterior.</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setAccessoryMuscle('')}
                    className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                      accessoryMuscle === '' ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
                    }`}
                  >
                    NENHUM
                  </button>
                  {MUSCLE_GROUP_LIST.map(m => (
                    <button
                      key={m}
                      onClick={() => setAccessoryMuscle(accessoryMuscle === m ? '' : m)}
                      className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                        accessoryMuscle === m ? 'bg-amber-500/20 text-amber-400 border-amber-500/60' : 'bg-s2 border-border2 text-muted hover:text-ink'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="mb-5">
            <label className="section-label block mb-1">SÉRIES DE PREPARO</label>
            <div className="font-mono text-[9px] text-muted/60 mb-2">
              AUTO segue o estado do músculo (estreante/pré-ativado/já-primário). Um número trava manualmente, inclusive 0.
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPrepOverride(null)}
                className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                  prepOverride === null ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
                }`}
              >
                AUTO
              </button>
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setPrepOverride(n)}
                  className={`px-2.5 py-1 font-mono text-[10px] border transition-all ${
                    prepOverride === n ? 'bg-amber-500/20 text-amber-400 border-amber-500/60' : 'bg-s2 border-border2 text-muted hover:text-ink'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={needsMuscleInput}
            className="w-full py-3 bg-neon text-bg font-display text-sm tracking-[0.2em] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            SALVAR
          </button>
        </div>
      </motion.div>
      {showLibDetail && libraryId && <ExerciseDetailModal id={libraryId} onClose={() => setShowLibDetail(false)} />}
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

// ─── EditSetModal ─────────────────────────────────────────────────────────────

function EditSetModal({ set, onSave, onClose }) {
  const [type, setType]         = useState(set.type)
  const [ger, setGer]           = useState(set.ger)
  const [repRange, setRepRange] = useState(set.repRange ?? '')

  const handleTypeChange = (t) => {
    setType(t)
    setGer(SET_TYPE_GER_DEFAULTS[t].ger)
    setRepRange(SET_TYPE_GER_DEFAULTS[t].repRange)
  }

  const submit = () => {
    onSave({ type, ger, repRange })
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
          <span className="font-display text-lg tracking-[0.15em] text-neon">EDITAR SÉRIE</span>
          <button onClick={onClose} className="text-muted hover:text-ink p-1"><LuX size={18}/></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8">
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
            SALVAR
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── SortableSet ─────────────────────────────────────────────────────────────

function SortableSet({ s, weekIdx, dayIdx, exId, removeSet, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  const typeInfo = SET_TYPES[s.type] || {}
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-s1 border border-border1 px-2.5 py-2"
    >
      <button
        className="touch-none p-1 -ml-1 text-muted/40 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <LuGripVertical size={13}/>
      </button>
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
        onClick={() => onEdit(s.id)}
        className="p-1 text-muted/50 hover:text-ink transition-colors"
      >
        <LuPencil size={12}/>
      </button>
      <button
        onClick={() => removeSet(weekIdx, dayIdx, exId, s.id)}
        className="p-1 text-muted/50 hover:text-red-400 transition-colors"
      >
        <LuX size={13}/>
      </button>
    </div>
  )
}

// ─── ExerciseEditor ───────────────────────────────────────────────────────────

function ExerciseEditor({ exercise, weekIdx, dayIdx, isDragging: isExDragging }) {
  const [open, setOpen]             = useState(false)
  const [showAddSet, setShowAddSet] = useState(false)
  const [showEditEx, setShowEditEx] = useState(false)
  const [showLibDetail, setShowLibDetail] = useState(false)
  const [editingSetId, setEditingSetId] = useState(null)
  const addSet         = useStore(s => s.addSet)
  const removeSet      = useStore(s => s.removeSet)
  const removeExercise = useStore(s => s.removeExercise)
  const reorderSets    = useStore(s => s.reorderSets)
  const updateExercise = useStore(s => s.updateExercise)
  const updateSet      = useStore(s => s.updateSet)

  const editingSet = editingSetId ? exercise.sets.find(s => s.id === editingSetId) : null

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const setsSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleSetsDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = exercise.sets.findIndex(s => s.id === active.id)
    const newIdx = exercise.sets.findIndex(s => s.id === over.id)
    reorderSets(weekIdx, dayIdx, exercise.id, arrayMove(exercise.sets, oldIdx, newIdx))
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="bg-s2 border border-border2 mb-2">
        {/* header */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 select-none"
          onClick={() => !isDragging && setOpen(o => !o)}
        >
          <button
            className="touch-none p-0.5 -ml-1 text-muted/40 cursor-grab active:cursor-grabbing flex-shrink-0"
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
          >
            <LuGripVertical size={14}/>
          </button>
          {exercise.libraryId && (
            <button
              className="flex-shrink-0"
              onClick={e => { e.stopPropagation(); setShowLibDetail(true) }}
              title="Ver exercício"
            >
              <LibraryThumb libraryId={exercise.libraryId} size={30} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm tracking-wider text-ink truncate">
              {exercise.namePt || exercise.name}
            </div>
            <div className="font-mono text-[10px] text-muted tracking-wider">
              {exercise.muscle}
              {exercise.accessoryMuscle && (
                <span className="text-amber-400/70 ml-1.5">+{exercise.accessoryMuscle}</span>
              )}
              {exercise.prepSetsOverride != null && (
                <span className="text-amber-400/70 ml-1.5">· PREP {exercise.prepSetsOverride}</span>
              )}
            </div>
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
            className="p-1 text-muted/50 hover:text-ink transition-colors ml-1"
            onClick={e => { e.stopPropagation(); setShowEditEx(true) }}
          >
            <LuPencil size={13}/>
          </button>
          <button
            className="text-muted hover:text-ink transition-colors"
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
                    <DndContext
                      sensors={setsSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSetsDragEnd}
                    >
                      <SortableContext
                        items={exercise.sets.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {exercise.sets.map(s => (
                          <SortableSet
                            key={s.id}
                            s={s}
                            weekIdx={weekIdx}
                            dayIdx={dayIdx}
                            exId={exercise.id}
                            removeSet={removeSet}
                            onEdit={setEditingSetId}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
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
        {showEditEx && (
          <EditExerciseModal
            exercise={exercise}
            onSave={(updates) => updateExercise(weekIdx, dayIdx, exercise.id, updates)}
            onClose={() => setShowEditEx(false)}
          />
        )}
        {showLibDetail && (
          <ExerciseDetailModal id={exercise.libraryId} onClose={() => setShowLibDetail(false)} />
        )}
        {editingSet && (
          <EditSetModal
            set={editingSet}
            onSave={(updates) => updateSet(weekIdx, dayIdx, exercise.id, editingSet.id, updates)}
            onClose={() => setEditingSetId(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── DayEditor ────────────────────────────────────────────────────────────────

function DayEditor({ weekIdx, dayIdx }) {
  const [showAddExercise, setShowAddExercise] = useState(false)
  const userProtocol            = useStore(s => s.userProtocol)
  const setDayRest              = useStore(s => s.setDayRest)
  const setDayRestSeconds       = useStore(s => s.setDayRestSeconds)
  const setDayPrepRestSeconds   = useStore(s => s.setDayPrepRestSeconds)
  const addExercise             = useStore(s => s.addExercise)
  const reorderExercises        = useStore(s => s.reorderExercises)

  const day = userProtocol.weeks[weekIdx].days[dayIdx]

  const exSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleExDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = day.exercises.findIndex(e => e.id === active.id)
    const newIdx = day.exercises.findIndex(e => e.id === over.id)
    reorderExercises(weekIdx, dayIdx, arrayMove(day.exercises, oldIdx, newIdx))
  }

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
              label: 'SÉRIE DE PREPARO',
              sub: 'Descanso entre as séries da rampa de preparo',
              field: 'prepRestSeconds',
              set: (v) => setDayPrepRestSeconds(weekIdx, dayIdx, v),
              opts: [30, 40, 60, 90],
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
                  // prepRestSeconds cai pros campos antigos (warmup/feeder) se o protocolo
                  // ainda não foi salvo desde a unificação
                  const current = field === 'prepRestSeconds' ? getPrepRestSeconds(day) : (day[field] ?? opts[Math.floor(opts.length / 2)])
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
              <DndContext
                sensors={exSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleExDragEnd}
              >
                <SortableContext
                  items={day.exercises.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {day.exercises.map((ex) => (
                    <ExerciseEditor
                      key={ex.id}
                      exercise={ex}
                      weekIdx={weekIdx}
                      dayIdx={dayIdx}
                    />
                  ))}
                </SortableContext>
              </DndContext>
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
  const userProtocol      = useStore(s => s.userProtocol)
  const setUserProtocol   = useStore(s => s.setUserProtocol)
  const addSavedExercise  = useStore(s => s.addSavedExercise)

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
        protocol.weeks.forEach(week =>
          week.days.forEach(day =>
            day.exercises.forEach(ex =>
              addSavedExercise({ name: ex.name, muscle: ex.muscle, accessoryMuscle: ex.accessoryMuscle })
            )
          )
        )
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
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            onClick={downloadTemplateCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-s2 border border-border2 text-muted hover:text-ink hover:border-neon/40 transition-all font-mono text-[10px] tracking-widest"
          >
            <LuDownload size={12}/> TEMPLATE
          </button>
          <button
            onClick={() => downloadProtocolCsv(userProtocol)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-s2 border border-border2 text-muted hover:text-ink hover:border-neon/40 transition-all font-mono text-[10px] tracking-widest"
          >
            <LuDownload size={12}/> EXPORTAR CSV
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
          {userProtocol.weeks.map((w, i) => {
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
                {weekLabel(i)}
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
