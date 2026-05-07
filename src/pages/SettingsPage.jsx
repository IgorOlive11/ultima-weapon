import React, { useState, useEffect } from 'react'
import { LuSave, LuCircleCheck } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { DAY_NAMES } from '../data/protocol'

function SaveBtn({ saved, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`btn-primary flex items-center justify-center gap-2 ${saved ? 'saved' : ''}`}
    >
      {saved ? <><LuCircleCheck size={16} />SALVO!</> : <><LuSave size={16} />SALVAR</>}
    </button>
  )
}

function inputCls() {
  return 'w-full min-w-0 bg-s2 border border-border2 text-ink px-3 py-3 font-mono text-sm tracking-wider outline-none focus:border-neon transition-colors'
}

export default function SettingsPage() {
  const startDate      = useStore((s) => s.startDate)
  const setStartDate   = useStore((s) => s.setStartDate)
  const currentWeek    = useStore((s) => s.currentWeek)
  const userProfile    = useStore((s) => s.userProfile)
  const setUserProfile = useStore((s) => s.setUserProfile)

  const [dateInput, setDateInput]   = useState(startDate)
  const [dateSaved, setDateSaved]   = useState(false)

  const [profile, setProfile] = useState({ ...userProfile })
  const [profileSaved, setProfileSaved] = useState(false)

  const [times, setTimes]       = useState({ workoutTime: userProfile.workoutTime, sleepTime: userProfile.sleepTime })
  const [timesSaved, setTimesSaved] = useState(false)

  // Sincroniza quando userProfile muda (ex: hydration do Supabase termina)
  useEffect(() => {
    if (userProfile) {
      setProfile({ ...userProfile })
      setTimes({ workoutTime: userProfile.workoutTime, sleepTime: userProfile.sleepTime })
    }
  }, [userProfile])

  const userProtocol = useStore((s) => s.userProtocol)
  const currentDay   = useStore((s) => s.currentDay)

  const weekData = userProtocol.weeks[currentWeek]
  const day = weekData?.days[currentDay]
  const filledWeeks = userProtocol.weeks.filter(w => w.days.some(d => !d.isRest && d.exercises.length > 0)).length

  const saveDate = () => {
    setStartDate(dateInput)
    setDateSaved(true)
    setTimeout(() => setDateSaved(false), 2000)
  }

  const saveProfile = () => {
    setUserProfile({
      weight: Number(profile.weight),
      height: Number(profile.height),
      age:    Number(profile.age),
      sex:    profile.sex,
      caloricGoal: profile.caloricGoal,
    })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const saveTimes = () => {
    setUserProfile({ workoutTime: times.workoutTime, sleepTime: times.sleepTime })
    setTimesSaved(true)
    setTimeout(() => setTimesSaved(false), 2000)
  }

  const numInput = (field, label, unit) => (
    <div>
      <div className="font-mono text-[9px] text-muted tracking-widest mb-1">{label}{unit ? ` (${unit})` : ''}</div>
      <input
        className={inputCls()}
        type="number" inputMode="decimal" min="0"
        value={profile[field]}
        onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
        style={{ colorScheme: 'dark' }}
      />
    </div>
  )

  const toggleBtn = (field, value, label, color = '#39FF14') => {
    const active = profile[field] === value
    return (
      <button
        key={value}
        onClick={() => setProfile(p => ({ ...p, [field]: value }))}
        className="flex-1 py-2.5 font-display text-[12px] tracking-widest border transition-all"
        style={active
          ? { background: color, color: '#080808', borderColor: color }
          : { borderColor: '#333', color: '#555' }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="p-3 pb-10 space-y-3">

      {/* Status */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          STATUS DO PROTOCOLO
        </div>
        <div className="space-y-2">
          {[
            ['Semana atual', `S${String(currentWeek + 1).padStart(2, '0')} · ${DAY_NAMES[currentDay]}`],
            ['Semanas configuradas', `${filledWeeks} de 8`],
            ['Data de início', new Date(startDate + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-border1 last:border-0">
              <span className="font-mono text-[10px] text-muted tracking-widest">{label.toUpperCase()}</span>
              <span className="font-display text-sm text-ink tracking-wider">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Date input */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-1 pb-2 border-b border-border1">
          DATA DE INÍCIO
        </div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed mt-3 mb-3">
          Define quando você começou o protocolo.<br />
          A semana atual é calculada automaticamente.
        </p>
        <div className="overflow-hidden mb-3">
          <input
            type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
            className={inputCls()} style={{ colorScheme: 'dark', maxWidth: '100%' }}
          />
        </div>
        <SaveBtn saved={dateSaved} onClick={saveDate} />
      </div>

      {/* PERFIL */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          PERFIL
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {numInput('weight', 'PESO', 'kg')}
            {numInput('height', 'ALTURA', 'cm')}
            {numInput('age', 'IDADE', null)}
          </div>

          <div>
            <div className="font-mono text-[9px] text-muted tracking-widest mb-1">SEXO</div>
            <div className="flex gap-2">
              {toggleBtn('sex', 'M', 'MASC')}
              {toggleBtn('sex', 'F', 'FEM', '#ff44aa')}
            </div>
          </div>

          <div>
            <div className="font-mono text-[9px] text-muted tracking-widest mb-1">OBJETIVO</div>
            <div className="flex gap-2">
              {toggleBtn('caloricGoal', 'bulk',     'BULKING',  '#ffaa00')}
              {toggleBtn('caloricGoal', 'maintain', 'MANTER',   '#39FF14')}
              {toggleBtn('caloricGoal', 'cut',      'CUTTING',  '#ff2d2d')}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <SaveBtn saved={profileSaved} onClick={saveProfile} />
        </div>
      </div>

      {/* HORÁRIOS */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          HORÁRIOS
        </div>
        <div className="space-y-3">
          <div>
            <div className="font-mono text-[9px] text-muted tracking-widest mb-1">HORÁRIO DO TREINO</div>
            <div className="overflow-hidden">
              <input
                type="time" value={times.workoutTime}
                onChange={e => setTimes(t => ({ ...t, workoutTime: e.target.value }))}
                className={inputCls()} style={{ colorScheme: 'dark', maxWidth: '100%' }}
              />
            </div>
          </div>
          <div>
            <div className="font-mono text-[9px] text-muted tracking-widest mb-1">HORÁRIO DE DORMIR</div>
            <div className="overflow-hidden">
              <input
                type="time" value={times.sleepTime}
                onChange={e => setTimes(t => ({ ...t, sleepTime: e.target.value }))}
                className={inputCls()} style={{ colorScheme: 'dark', maxWidth: '100%' }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <SaveBtn saved={timesSaved} onClick={saveTimes} />
        </div>
      </div>

      {/* Protocol overview */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          VISÃO GERAL DO PROTOCOLO
        </div>
        <div className="space-y-1">
          {userProtocol.weeks.map((w, i) => {
            const active   = i === currentWeek
            const training = w.days.filter(d => !d.isRest && d.exercises.length > 0).length
            const hasData  = training > 0
            return (
              <div
                key={i}
                className={`flex items-center gap-3 py-2 border-b border-border1 last:border-0 ${!hasData && !active ? 'opacity-40' : ''}`}
              >
                <span
                  className="font-display text-base tracking-wider w-9 flex-shrink-0"
                  style={{ color: active ? '#39FF14' : '#555' }}
                >
                  S{String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-body font-semibold text-sm tracking-wider" style={{ color: active ? '#e8e8e8' : '#555' }}>
                  {hasData ? `${training} dia${training !== 1 ? 's' : ''} de treino` : 'sem dados'}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {w.days.reduce((a, d) => a + d.exercises.length, 0)} ex.
                </span>
                {active && (
                  <span className="font-mono text-[9px] px-2 py-0.5 font-bold tracking-widest bg-neon/20 text-neon border border-neon/30">
                    ATUAL
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* About */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1">
          SOBRE
        </div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
          Overload — Seu app de treino<br />
          por Igor Oliveira<br /><br />
          <span className="text-muted/60">
            iOS: Safari → Compartilhar → Adicionar à Tela de Início
          </span>
        </p>
      </div>
    </div>
  )
}
