import React, { useEffect, useState } from 'react'
import { LuUser, LuEye, LuSearch, LuRefreshCw } from 'react-icons/lu'
import { supabase } from '../lib/supabase'
import { useStore } from '../hooks/useStore'

export default function TrainerPage() {
  const authUser       = useStore(s => s.authUser)
  const setViewingUser = useStore(s => s.setViewingUser)
  const viewingUserId  = useStore(s => s.viewingUserId)

  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [switching, setSwitching] = useState(null)

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    setLoading(true)
    let query = supabase.from('profiles').select('id, name, role, trainer_id').neq('id', authUser?.id)
    if (authUser?.role === 'trainer') query = query.eq('trainer_id', authUser.id)
    const { data } = await query.order('name')
    setStudents(data || [])
    setLoading(false)
  }

  async function handleView(student) {
    setSwitching(student.id)
    if (viewingUserId === student.id) {
      await setViewingUser(null)
    } else {
      await setViewingUser(student.id, student.name)
    }
    setSwitching(null)
  }

  const filtered = students.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-3 pb-10 space-y-3">
      <div className="bg-s1 border border-border1 p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border1">
          <div className="font-display text-sm text-neon tracking-[0.2em]">
            {authUser?.role === 'admin' ? 'TODOS OS USUÁRIOS' : 'MEUS ALUNOS'}
          </div>
          <button onClick={loadStudents} className="text-muted hover:text-neon transition-colors">
            <LuRefreshCw size={14} />
          </button>
        </div>

        <div className="relative mb-3">
          <LuSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-s2 border border-border2 text-ink pl-9 pr-3 py-2 font-mono text-xs tracking-wider outline-none focus:border-neon transition-colors"
          />
        </div>

        {loading ? (
          <div className="font-mono text-[10px] text-muted tracking-wider py-6 text-center animate-pulse">
            CARREGANDO...
          </div>
        ) : filtered.length === 0 ? (
          <div className="font-mono text-[10px] text-muted tracking-wider py-6 text-center">
            {authUser?.role === 'trainer' ? 'NENHUM ALUNO ATRIBUÍDO' : 'NENHUM USUÁRIO ENCONTRADO'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(student => {
              const active = viewingUserId === student.id
              const busy   = switching === student.id
              return (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 py-3 px-3 border transition-all ${
                    active ? 'border-orange-500/60 bg-orange-500/10' : 'border-border2 bg-s2'
                  }`}
                >
                  <LuUser size={15} className={active ? 'text-orange-400' : 'text-muted'} />
                  <div className="flex-1 min-w-0">
                    <div className="font-body font-semibold text-sm tracking-wider text-ink truncate">
                      {student.name || '—'}
                    </div>
                    <div className="font-mono text-[9px] text-muted tracking-widest mt-0.5">
                      {student.role?.toUpperCase()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleView(student)}
                    disabled={busy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] tracking-widest border transition-all ${
                      active
                        ? 'border-orange-500 bg-orange-500 text-black'
                        : 'border-neon/40 text-neon hover:bg-neon/10'
                    } disabled:opacity-50`}
                  >
                    <LuEye size={11} />
                    {busy ? '...' : active ? 'SAIR' : 'VER'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {authUser?.role === 'trainer' && students.length === 0 && !loading && (
        <div className="bg-s1 border border-border1 p-4">
          <div className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
            Nenhum aluno está atribuído a você ainda. Peça ao administrador para associar alunos à sua conta.
          </div>
        </div>
      )}
    </div>
  )
}
