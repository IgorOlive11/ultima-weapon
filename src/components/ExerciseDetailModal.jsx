import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LuX } from 'react-icons/lu'
import { exerciseSource } from '../lib/exerciseSource'
import ExerciseGif from './ExerciseGif'

export default function ExerciseDetailModal({ id, onClose }) {
  const [ex, setEx] = useState(null)
  const [loading, setLoading] = useState(true)
  const [gifFailed, setGifFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setGifFailed(false)
    exerciseSource.getExercise(id).then(data => {
      if (!cancelled) { setEx(data); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [id])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black/85 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="w-full max-w-[430px] bg-s1 border-t border-border1 max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2 sticky top-0 bg-s1 z-10 border-b border-border1">
          <span className="font-display text-lg tracking-[0.1em] text-neon truncate pr-4">
            {ex?.namePt || ex?.name || (loading ? 'CARREGANDO...' : 'EXERCÍCIO')}
          </span>
          <button onClick={onClose} className="text-muted hover:text-ink p-1 flex-shrink-0"><LuX size={20}/></button>
        </div>

        {loading && (
          <div className="p-10 text-center font-mono text-xs text-muted tracking-wider">CARREGANDO...</div>
        )}

        {!loading && !ex && (
          <div className="p-10 text-center font-mono text-xs text-muted tracking-wider">
            Exercício não encontrado.
          </div>
        )}

        {!loading && ex && (
          <div className="px-4 py-4">
            <div className="bg-s2 border border-border1 aspect-square mb-4 overflow-hidden flex items-center justify-center">
              {ex.gifUrl && !gifFailed ? (
                <ExerciseGif
                  src={ex.gifUrl}
                  alt={ex.name}
                  fit="contain"
                  onError={() => setGifFailed(true)}
                />
              ) : (
                <div className="font-mono text-[10px] text-muted/40 tracking-wider">SEM GIF DISPONÍVEL</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="flex-1 min-w-[47%] bg-s2 border border-border1 p-2.5">
                <div className="font-mono text-[9px] text-muted tracking-wider mb-1">MÚSCULO ALVO</div>
                <div className="font-body text-sm text-neon capitalize">
                  {ex.targetMuscles.length ? ex.targetMuscles.join(', ') : '—'}
                </div>
              </div>
              {ex.secondaryMuscles.length > 0 && (
                <div className="flex-1 min-w-[47%] bg-s2 border border-border1 p-2.5">
                  <div className="font-mono text-[9px] text-muted tracking-wider mb-1">SECUNDÁRIO</div>
                  <div className="font-body text-sm text-ink capitalize">{ex.secondaryMuscles.join(', ')}</div>
                </div>
              )}
              {ex.equipments.length > 0 && (
                <div className="flex-1 min-w-[47%] bg-s2 border border-border1 p-2.5">
                  <div className="font-mono text-[9px] text-muted tracking-wider mb-1">EQUIPAMENTO</div>
                  <div className="font-body text-sm text-ink capitalize">{ex.equipments.join(', ')}</div>
                </div>
              )}
              {ex.bodyParts.length > 0 && (
                <div className="flex-1 min-w-[47%] bg-s2 border border-border1 p-2.5">
                  <div className="font-mono text-[9px] text-muted tracking-wider mb-1">REGIÃO</div>
                  <div className="font-body text-sm text-ink capitalize">{ex.bodyParts.join(', ')}</div>
                </div>
              )}
            </div>

            {ex.instructions.length > 0 && (
              <div className="mb-2">
                <div className="font-mono text-[9px] text-muted tracking-wider mb-2">INSTRUÇÕES</div>
                <ol className="space-y-2">
                  {ex.instructions.map((step, i) => (
                    <li key={i} className="font-mono text-[11px] text-muted leading-relaxed flex gap-2">
                      <span className="text-neon flex-shrink-0">{i + 1}.</span>
                      <span>{step.replace(/^Step:\d+\s*/i, '')}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-6 text-center font-mono text-[9px] text-muted/40 tracking-wider">
              Dados de exercício por{' '}
              <a href="https://exercisedb.dev" target="_blank" rel="noreferrer" className="underline text-muted/60">
                ExerciseDB
              </a>{' '}
              — uso não comercial
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
