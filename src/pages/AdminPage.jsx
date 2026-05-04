import React, { useEffect, useState } from 'react'
import { LuUser, LuEye, LuSearch, LuShield, LuRefreshCw } from 'react-icons/lu'
import { supabase } from '../lib/supabase'
import { useStore } from '../hooks/useStore'

const ROLE_COLORS = { student: '#666', trainer: '#39FF14', admin: '#ff4444' }
const ROLE_LABELS = { student: 'ALUNO', trainer: 'TREINADOR', admin: 'ADMIN' }

export default function AdminPage() {
  const authUser       = useStore(s => s.authUser)
  const setViewingUser = useStore(s => s.setViewingUser)
  const viewingUserId  = useStore(s => s.viewingUserId)

  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(null)
  const [switching, setSwitching] = useState(null)

  const trainers = users.filter(u => u.role === 'trainer' || u.role === 'admin')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, trainer_id')
      .order('role')
      .order('name')
    setUsers(data || [])
    setLoading(false)
  }

  async function updateRole(userId, role) {
    setSaving(userId + '_role')
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setSaving(null)
  }

  async function assignTrainer(studentId, trainerId) {
    setSaving(studentId + '_trainer')
    await supabase.from('profiles').update({ trainer_id: trainerId || null }).eq('id', studentId)
    setUsers(prev => prev.map(u => u.id === studentId ? { ...u, trainer_id: trainerId || null } : u))
    setSaving(null)
  }

  async function handleView(user) {
    setSwitching(user.id)
    if (viewingUserId === user.id) await setViewingUser(null)
    else await setViewingUser(user.id, user.name)
    setSwitching(null)
  }

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-3 pb-10 space-y-3">
      <div className="bg-s1 border border-border1 p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border1">
          <div className="font-display text-sm text-neon tracking-[0.2em] flex items-center gap-2">
            <LuShield size={14} /> GERENCIAR USUÁRIOS
          </div>
          <button onClick={loadUsers} className="text-muted hover:text-neon transition-colors">
            <LuRefreshCw size={14} />
          </button>
        </div>

        <div className="relative mb-3">
          <LuSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-s2 border border-border2 text-ink pl-9 pr-3 py-2 font-mono text-xs tracking-wider outline-none focus:border-neon transition-colors"
          />
        </div>

        {loading ? (
          <div className="font-mono text-[10px] text-muted tracking-wider py-6 text-center animate-pulse">CARREGANDO...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => {
              const isSelf    = user.id === authUser?.id
              const roleColor = ROLE_COLORS[user.role] || '#666'
              return (
                <div key={user.id} className="border border-border2 bg-s2 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <LuUser size={14} className="text-muted flex-shrink-0" />
                    <span className="flex-1 font-body font-semibold text-sm tracking-wider text-ink truncate">
                      {user.name || '—'}
                    </span>
                    <span
                      className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border flex-shrink-0"
                      style={{ color: roleColor, borderColor: roleColor + '40' }}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {!isSelf && (
                      <button
                        onClick={() => handleView(user)}
                        disabled={switching === user.id}
                        className={`flex items-center gap-1 px-2 py-1 font-mono text-[9px] tracking-widest border transition-all flex-shrink-0 ${
                          viewingUserId === user.id
                            ? 'border-orange-500 bg-orange-500 text-black'
                            : 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10'
                        } disabled:opacity-50`}
                      >
                        <LuEye size={10} />
                        {switching === user.id ? '...' : viewingUserId === user.id ? 'SAIR' : 'VER'}
                      </button>
                    )}
                  </div>

                  {!isSelf && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border1">
                      <div>
                        <div className="font-mono text-[8px] text-muted tracking-widest mb-1">FUNÇÃO</div>
                        <select
                          value={user.role}
                          onChange={e => updateRole(user.id, e.target.value)}
                          disabled={saving === user.id + '_role'}
                          className="w-full bg-s1 border border-border2 text-ink px-2 py-1.5 font-mono text-[10px] tracking-wider outline-none focus:border-neon"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="student">ALUNO</option>
                          <option value="trainer">TREINADOR</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </div>

                      {user.role === 'student' && (
                        <div>
                          <div className="font-mono text-[8px] text-muted tracking-widest mb-1">TREINADOR</div>
                          <select
                            value={user.trainer_id || ''}
                            onChange={e => assignTrainer(user.id, e.target.value)}
                            disabled={saving === user.id + '_trainer'}
                            className="w-full bg-s1 border border-border2 text-ink px-2 py-1.5 font-mono text-[10px] tracking-wider outline-none focus:border-neon"
                            style={{ colorScheme: 'dark' }}
                          >
                            <option value="">— nenhum —</option>
                            {trainers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-2 pb-2 border-b border-border1">PRIMEIRO ADMIN</div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
          Para promover a primeira conta a admin, acesse o painel do Supabase → Table Editor → profiles → edite o campo <span className="text-ink">role</span> para <span className="text-neon">admin</span>.
        </p>
      </div>
    </div>
  )
}
