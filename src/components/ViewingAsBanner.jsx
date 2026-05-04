import React from 'react'
import { LuEye, LuX } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'

export default function ViewingAsBanner() {
  const viewingUserId   = useStore(s => s.viewingUserId)
  const viewingUserName = useStore(s => s.viewingUserName)
  const setViewingUser  = useStore(s => s.setViewingUser)

  if (!viewingUserId) return null

  return (
    <div className="bg-orange-500/15 border-b border-orange-500/40 px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <LuEye size={12} className="text-orange-400" />
        <span className="font-mono text-[9px] text-orange-400 tracking-widest">
          VISUALIZANDO: <span className="text-orange-300 font-bold">{viewingUserName || 'ALUNO'}</span>
        </span>
      </div>
      <button
        onClick={() => setViewingUser(null)}
        className="text-orange-400 hover:text-orange-200 transition-colors"
      >
        <LuX size={14} />
      </button>
    </div>
  )
}
