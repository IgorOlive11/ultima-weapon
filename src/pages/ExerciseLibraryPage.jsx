import React, { useState, useEffect } from 'react'
import { LuSearch } from 'react-icons/lu'
import { exerciseSource } from '../lib/exerciseSource'
import { bodyPartLabel } from '../lib/exercisePtDictionary'
import DoomFace from '../components/DoomFace'
import ExerciseGif from '../components/ExerciseGif'
import ExerciseDetailModal from '../components/ExerciseDetailModal'

const PAGE_SIZE = 30

function ExerciseThumb({ gifUrl, name }) {
  const [failed, setFailed] = useState(false)
  if (!gifUrl || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted/30 font-mono text-[9px] tracking-wider">
        SEM GIF
      </div>
    )
  }
  return <ExerciseGif src={gifUrl} alt={name} lite onError={() => setFailed(true)} />
}

export default function ExerciseLibraryPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [bodyPart, setBodyPart] = useState(null)
  const [bodyParts, setBodyParts] = useState([])
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(0) }, [debouncedSearch, bodyPart])

  useEffect(() => {
    exerciseSource.listBodyParts().then(setBodyParts).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    exerciseSource
      .listExercises({ search: debouncedSearch, bodyPart, page, pageSize: PAGE_SIZE })
      .then(({ items: newItems, total: t, hasMore: hm }) => {
        if (cancelled) return
        setItems((prev) => (page === 0 ? newItems : [...prev, ...newItems]))
        setTotal(t)
        setHasMore(hm)
      })
      .catch(() => { if (!cancelled) setError('Não deu pra carregar a biblioteca. Tenta de novo.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, bodyPart, page])

  return (
    <div className="p-3 pb-10">
      <div className="relative mb-3">
        <LuSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar exercício (PT ou EN)..."
          className="w-full bg-s2 border border-border2 pl-9 pr-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-neon transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setBodyPart(null)}
          className={chipCls(bodyPart === null)}
        >
          TODOS
        </button>
        {bodyParts.map((bp) => (
          <button
            key={bp}
            onClick={() => setBodyPart(bodyPart === bp ? null : bp)}
            className={chipCls(bodyPart === bp)}
          >
            {bodyPartLabel(bp).toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="font-mono text-xs text-neon mb-3">{error}</div>
      )}

      {loading && page === 0 ? (
        <div className="text-center py-10 font-mono text-xs text-muted tracking-wider">
          CARREGANDO...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <DoomFace ger={7} size={56} className="opacity-30 mb-4" />
          <div className="font-display text-xl text-muted tracking-[0.2em]">NADA ENCONTRADO</div>
          <div className="font-mono text-[11px] text-muted/60 mt-2 tracking-wider">
            Tenta outro termo ou filtro.
          </div>
        </div>
      ) : (
        <>
          <div className="font-mono text-[10px] text-muted/60 mb-2 tracking-wider">
            {total} exercício{total === 1 ? '' : 's'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {items.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedId(ex.id)}
                className="bg-s1 border border-border1 overflow-hidden text-left hover:border-neon/40 transition-colors"
              >
                <div className="aspect-square bg-s2 overflow-hidden">
                  <ExerciseThumb gifUrl={ex.gifUrl} name={ex.name} />
                </div>
                <div className="p-2">
                  <div className="font-body text-xs font-semibold text-ink leading-tight line-clamp-2">
                    {ex.namePt || ex.name}
                  </div>
                  {ex.targetMuscles[0] && (
                    <div className="font-mono text-[9px] text-neon/70 mt-1 uppercase truncate">
                      {ex.targetMuscles[0]}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="w-full mt-4 py-2.5 border border-border2 font-mono text-xs text-muted tracking-wider hover:text-ink hover:border-neon/40 transition-colors disabled:opacity-50"
            >
              {loading ? 'CARREGANDO...' : 'CARREGAR MAIS'}
            </button>
          )}
        </>
      )}

      <div className="mt-6 text-center font-mono text-[9px] text-muted/40 tracking-wider">
        Dados de exercício por{' '}
        <a href="https://exercisedb.dev" target="_blank" rel="noreferrer" className="underline text-muted/60">
          ExerciseDB
        </a>{' '}
        — uso não comercial
      </div>

      {selectedId && (
        <ExerciseDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function chipCls(active) {
  return `px-2.5 py-1 font-mono text-[10px] tracking-wider border transition-colors ${
    active ? 'bg-neon text-bg border-neon' : 'bg-s2 border-border2 text-muted hover:text-ink'
  }`
}
