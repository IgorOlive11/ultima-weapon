import { useState } from 'react'
import { motion } from 'framer-motion'
import { LuX, LuUpload, LuTrash2, LuTriangleAlert } from 'react-icons/lu'
import { exerciseSource, uploadExerciseGif, slugId } from '../lib/exerciseSource'
import { MUSCLE_GROUP_LIST } from '../data/protocol'
import ExerciseGif from './ExerciseGif'

function chipCls(active) {
  return `px-2.5 py-1 font-mono text-[10px] border transition-all ${
    active ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
  }`
}

// Form de admin pra cadastrar/editar exercício da biblioteca própria: nome, apelido
// PT, grupo muscular (mesma taxonomia MUSCLE_GROUP_LIST do protocolo — não a
// biomecânica de 50 valores da ExerciseDB), equipamento livre, instruções e upload
// do GIF cru (o filtro neon roda em runtime na exibição, nunca é aplicado aqui).
export default function AdminExerciseFormModal({ exercise, onClose, onSaved }) {
  const isEdit = !!exercise

  const [name, setName]             = useState(exercise?.name || '')
  const [namePt, setNamePt]         = useState(exercise?.namePt || '')
  const [targetMuscle, setTargetMuscle] = useState(exercise?.targetMuscles?.[0] || MUSCLE_GROUP_LIST[0])
  const [secondaryMuscles, setSecondaryMuscles] = useState(exercise?.secondaryMuscles || [])
  const [equipment, setEquipment]   = useState(exercise?.equipments?.[0] || '')
  const [instructionsText, setInstructionsText] = useState((exercise?.instructions || []).join('\n'))

  const [gifFile, setGifFile]         = useState(null)
  const [gifPreview, setGifPreview]   = useState(exercise?.gifUrl || null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]       = useState(false)

  const toggleSecondary = (m) => {
    setSecondaryMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/gif') { setError('O arquivo precisa ser um GIF.'); return }
    setError('')
    setGifFile(file)
    setGifPreview(URL.createObjectURL(file))
  }

  const canSubmit = name.trim().length > 0 && !!gifPreview && !saving

  const submit = async () => {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (!gifFile && !exercise?.gifUrl) { setError('GIF é obrigatório.'); return }

    setSaving(true)
    setError('')
    try {
      // Gera o id ANTES do upload — o caminho do arquivo no bucket e o id da linha
      // precisam ser o mesmo, senão deleteExercise() não acha o arquivo pra apagar.
      const id = exercise?.id || slugId(name)
      let gifUrl = exercise?.gifUrl || null

      if (gifFile) {
        gifUrl = await uploadExerciseGif(id, gifFile)
      }

      const payload = {
        id,
        name: name.trim(),
        namePt: namePt.trim() || null,
        gifUrl,
        targetMuscles: [targetMuscle],
        secondaryMuscles,
        equipments: equipment.trim() ? [equipment.trim()] : [],
        instructions: instructionsText.split('\n').map(s => s.trim()).filter(Boolean),
      }

      if (isEdit) {
        await exerciseSource.updateLibraryExercise(exercise.id, payload)
      } else {
        await exerciseSource.createExercise(payload)
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Falha ao salvar. Tenta de novo.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await exerciseSource.deleteExercise(exercise.id)
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Falha ao excluir. Tenta de novo.')
      setDeleting(false)
    }
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
          <span className="font-display text-lg tracking-[0.15em] text-neon">
            {isEdit ? 'EDITAR EXERCÍCIO' : 'NOVO EXERCÍCIO (BIBLIOTECA)'}
          </span>
          <button onClick={onClose} className="text-muted hover:text-ink p-1"><LuX size={18}/></button>
        </div>

        <div className="px-5 pb-8">
          {/* GIF upload */}
          <div className="mb-4">
            <label className="section-label block mb-1">GIF</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 flex-shrink-0 border border-border1 bg-s2 overflow-hidden flex items-center justify-center">
                {gifPreview ? (
                  <ExerciseGif src={gifPreview} alt={name} fit="contain" />
                ) : (
                  <span className="font-mono text-[9px] text-muted/40">SEM GIF</span>
                )}
              </div>
              <label className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-dashed border-border2 text-muted font-mono text-[11px] tracking-wider cursor-pointer hover:border-neon/50 hover:text-ink transition-colors">
                <LuUpload size={14}/> {gifFile ? 'TROCAR ARQUIVO' : 'ESCOLHER .GIF'}
                <input type="file" accept="image/gif" className="hidden" onChange={handleFile} />
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="section-label block mb-1">NOME</label>
            <input
              className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors"
              placeholder="Ex: Remada cavalinho"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="section-label block mb-1">APELIDO EM PORTUGUÊS <span className="text-muted/50">(opcional)</span></label>
            <input
              className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors"
              placeholder={name}
              value={namePt}
              onChange={e => setNamePt(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="section-label block mb-1">MÚSCULO ALVO</label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUP_LIST.map(m => (
                <button key={m} onClick={() => setTargetMuscle(m)} className={chipCls(targetMuscle === m)}>{m}</button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="section-label block mb-1">MÚSCULOS SECUNDÁRIOS <span className="text-muted/50">(opcional)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUP_LIST.filter(m => m !== targetMuscle).map(m => (
                <button key={m} onClick={() => toggleSecondary(m)} className={chipCls(secondaryMuscles.includes(m))}>{m}</button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="section-label block mb-1">EQUIPAMENTO <span className="text-muted/50">(opcional)</span></label>
            <input
              className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors"
              placeholder="Ex: Barra, Halteres, Peso do corpo..."
              value={equipment}
              onChange={e => setEquipment(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <label className="section-label block mb-1">INSTRUÇÕES <span className="text-muted/50">(opcional, uma por linha)</span></label>
            <textarea
              rows={4}
              className="w-full bg-s2 border border-border2 px-3 py-2.5 font-body text-sm text-ink focus:border-neon outline-none transition-colors resize-none"
              placeholder={'Passo 1...\nPasso 2...'}
              value={instructionsText}
              onChange={e => setInstructionsText(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 border border-red-500/40 bg-red-500/5 font-mono text-[11px] text-red-400">
              <LuTriangleAlert size={14} className="flex-shrink-0"/> {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-3 font-display text-sm tracking-[0.2em] bg-neon text-bg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? 'SALVANDO...' : 'SALVAR'}
          </button>

          {isEdit && (
            <div className="mt-4 pt-4 border-t border-border1 text-center">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border2 text-muted font-display text-sm tracking-widest hover:border-red-400 hover:text-red-400 transition-colors"
                >
                  <LuTrash2 size={14}/> EXCLUIR EXERCÍCIO
                </button>
              ) : (
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <LuTriangleAlert size={16} className="text-red-400"/>
                  <span className="font-mono text-[11px] text-red-400 tracking-widest">TEM CERTEZA?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-red-500 text-white font-display text-sm tracking-wider disabled:opacity-50"
                  >
                    {deleting ? 'EXCLUINDO...' : 'EXCLUIR'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 border border-border2 text-muted font-display text-sm tracking-wider"
                  >
                    CANCELAR
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
