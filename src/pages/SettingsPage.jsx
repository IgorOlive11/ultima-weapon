import React, { useState } from 'react'
import { LuSave, LuCircleCheck, LuLock, LuBug, LuBellRing, LuSparkles, LuLink, LuTriangleAlert } from 'react-icons/lu'
import { useStore } from '../hooks/useStore'
import { DAY_NAMES } from '../data/protocol'
import { ACHIEVEMENTS } from '../data/achievements'
import DoomFace from '../components/DoomFace'
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications'

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
  const achievements      = useStore((s) => s.achievements)
  const setTutorialSeen   = useStore((s) => s.setTutorialSeen)

  const [dateInput, setDateInput]   = useState(startDate)
  const [dateSaved, setDateSaved]   = useState(false)

  const userProtocol = useStore((s) => s.userProtocol)
  const currentDay   = useStore((s) => s.currentDay)
  const setTotalWeeks = useStore((s) => s.setTotalWeeks)

  const [totalWeeksInput, setTotalWeeksInput] = useState(String(userProtocol.totalWeeks ?? userProtocol.weeks.length))
  const [totalWeeksSaved, setTotalWeeksSaved] = useState(false)
  const [confirmShrink, setConfirmShrink]     = useState(false)

  const shrinkLosesData = (n) => {
    if (n >= userProtocol.weeks.length) return false
    return userProtocol.weeks.slice(n).some(w => w.days.some(d => !d.isRest && d.exercises.length > 0))
  }

  const saveTotalWeeks = () => {
    const n = Math.max(1, Math.min(52, parseInt(totalWeeksInput) || 1))
    if (shrinkLosesData(n) && !confirmShrink) {
      setConfirmShrink(true)
      return
    }
    setTotalWeeks(n)
    setTotalWeeksInput(String(n))
    setConfirmShrink(false)
    setTotalWeeksSaved(true)
    setTimeout(() => setTotalWeeksSaved(false), 2000)
  }

  const authUser                      = useStore((s) => s.authUser)
  const adminFeedbackButtonEnabled    = useStore((s) => s.adminFeedbackButtonEnabled)
  const setAdminFeedbackButtonEnabled = useStore((s) => s.setAdminFeedbackButtonEnabled)

  const neonGifFilterEnabled    = useStore((s) => s.neonGifFilterEnabled)
  const setNeonGifFilterEnabled = useStore((s) => s.setNeonGifFilterEnabled)

  const autoLinkProtocolToLibrary = useStore((s) => s.autoLinkProtocolToLibrary)
  const [autoLinkBusy, setAutoLinkBusy]     = useState(false)
  const [autoLinkResult, setAutoLinkResult] = useState(null)

  const runAutoLink = async () => {
    setAutoLinkBusy(true)
    setAutoLinkResult(null)
    const result = await autoLinkProtocolToLibrary()
    setAutoLinkResult(result)
    setAutoLinkBusy(false)
  }

  const pushNotificationsEnabled    = useStore((s) => s.pushNotificationsEnabled)
  const setPushNotificationsEnabled = useStore((s) => s.setPushNotificationsEnabled)
  const setPushSubscription         = useStore((s) => s.setPushSubscription)
  const [pushBusy, setPushBusy]     = useState(false)
  const [pushError, setPushError]   = useState('')

  const togglePush = async () => {
    setPushError('')
    if (pushNotificationsEnabled) {
      setPushBusy(true)
      await unsubscribeFromPush()
      setPushSubscription(null)
      setPushNotificationsEnabled(false)
      setPushBusy(false)
      return
    }
    if (!isPushSupported()) {
      setPushError('Notificações push não são suportadas neste navegador.')
      return
    }
    setPushBusy(true)
    const sub = await subscribeToPush() // permissão só é pedida aqui, dentro do toque no toggle
    setPushBusy(false)
    if (!sub) {
      setPushError('Permissão negada ou indisponível.')
      return
    }
    setPushSubscription(sub)
    setPushNotificationsEnabled(true)
  }

  const weekData = userProtocol.weeks[currentWeek]
  const day = weekData?.days[currentDay]
  const filledWeeks = userProtocol.weeks.filter(w => w.days.some(d => !d.isRest && d.exercises.length > 0)).length

  const saveDate = () => {
    setStartDate(dateInput)
    setDateSaved(true)
    setTimeout(() => setDateSaved(false), 2000)
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
            ['Semanas configuradas', `${filledWeeks} de ${userProtocol.weeks.length}`],
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

      {/* Total weeks */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-1 pb-2 border-b border-border1">
          TOTAL DE SEMANAS
        </div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed mt-3 mb-3">
          Quantas semanas o protocolo tem, no total. Aumentar acrescenta semanas vazias
          no fim; diminuir remove as últimas.
        </p>
        <div className="mb-3">
          <input
            type="number" inputMode="numeric" min={1} max={52}
            value={totalWeeksInput}
            onChange={e => { setTotalWeeksInput(e.target.value); setConfirmShrink(false) }}
            className={inputCls()}
          />
        </div>
        {confirmShrink && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 border border-red-500/40 bg-red-500/5 font-mono text-[10px] text-red-400 leading-relaxed">
            <LuTriangleAlert size={14} className="flex-shrink-0"/>
            Semana {totalWeeksInput} pra frente tem treino cadastrado — diminuir apaga esses dados. Confirma?
          </div>
        )}
        <button
          onClick={saveTotalWeeks}
          className={`btn-primary flex items-center justify-center gap-2 ${totalWeeksSaved ? 'saved' : ''}`}
        >
          {totalWeeksSaved
            ? <><LuCircleCheck size={16} />SALVO!</>
            : confirmShrink
              ? <><LuTriangleAlert size={16} />CONFIRMAR E APAGAR</>
              : <><LuSave size={16} />SALVAR</>}
        </button>
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

      {/* Conquistas */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1 flex items-baseline justify-between">
          <span>CONQUISTAS</span>
          <span className="font-mono text-[9px] text-muted tracking-widest">
            {achievements.unlockedIds.length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map(a => {
            const unlocked = achievements.unlockedIds.includes(a.id)
            return (
              <div
                key={a.id}
                className={`border p-3 flex flex-col items-center text-center gap-1.5 transition-all ${
                  unlocked ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-border1 opacity-40'
                }`}
              >
                <div className="relative">
                  <DoomFace face={a.face} size={44} />
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <LuLock size={14} className="text-muted" />
                    </div>
                  )}
                </div>
                <div className={`font-display text-[10px] tracking-[0.15em] leading-tight ${unlocked ? 'text-yellow-400' : 'text-muted'}`}>
                  {a.title}
                </div>
                <div className="font-mono text-[8px] text-muted leading-tight">
                  {a.desc}
                </div>
              </div>
            )
          })}
        </div>
        {achievements.streak > 0 && (
          <div className="mt-3 pt-3 border-t border-border1 font-mono text-[10px] text-muted tracking-wider text-center">
            STREAK ATUAL: <span className="text-neon">{achievements.streak} DIA{achievements.streak !== 1 ? 'S' : ''}</span>
            {' · '}TREINOS: <span className="text-neon">{achievements.workoutCount}</span>
          </div>
        )}
      </div>

      {/* Notificações push (fim do descanso, com app em background) */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1 flex items-center gap-2">
          <LuBellRing size={14} /> NOTIFICAÇÕES
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
            Em primeiro plano, o fim do descanso sempre toca um som e pisca na tela.
            Ligando aqui, com o app instalado, tenta avisar também se o app estiver em
            segundo plano — o disparo exato não é garantido pelo sistema.
          </p>
          <button
            onClick={togglePush}
            disabled={pushBusy}
            className={`flex-shrink-0 w-12 h-7 rounded-full relative transition-colors disabled:opacity-50 ${
              pushNotificationsEnabled ? 'bg-neon/80' : 'bg-border2'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-s1 transition-transform ${
                pushNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {pushError && (
          <div className="mt-2 font-mono text-[10px] text-red-400 tracking-wider">{pushError}</div>
        )}
      </div>

      {/* Filtro neon nos GIFs de exercício */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1 flex items-center gap-2">
          <LuSparkles size={14} /> FILTRO NEON NOS GIFS
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
            Aplica um filtro duotone verde/vermelho nos GIFs de exercício da biblioteca,
            de acordo com o GER do treino. Desligado, mostra o GIF original.
          </p>
          <button
            onClick={() => setNeonGifFilterEnabled(!neonGifFilterEnabled)}
            className={`flex-shrink-0 w-12 h-7 rounded-full relative transition-colors ${
              neonGifFilterEnabled ? 'bg-neon/80' : 'bg-border2'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-s1 transition-transform ${
                neonGifFilterEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Vincular exercícios existentes à biblioteca (GIFs) */}
      <div className="bg-s1 border border-border1 p-4">
        <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1 flex items-center gap-2">
          <LuLink size={14} /> VINCULAR À BIBLIOTECA
        </div>
        <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed mb-3">
          Procura um GIF na biblioteca pra cada exercício do seu protocolo que ainda
          não tem um vinculado. Só vincula quando acha um match bem confiante — o
          resto fica como está, sem chute.
        </p>
        <button
          onClick={runAutoLink}
          disabled={autoLinkBusy}
          className="w-full py-2.5 font-display text-sm tracking-[0.15em] border border-neon/50 text-neon hover:bg-neon/5 transition-colors disabled:opacity-50"
        >
          {autoLinkBusy ? 'BUSCANDO...' : 'VINCULAR AUTOMATICAMENTE'}
        </button>
        {autoLinkResult && (
          <div className="mt-2.5 font-mono text-[10px] text-muted tracking-wider text-center">
            <span className="text-neon">{autoLinkResult.linked} vinculado{autoLinkResult.linked !== 1 ? 's' : ''}</span>
            {' · '}
            {autoLinkResult.skipped} sem match confiante
          </div>
        )}
      </div>

      {/* Admin: feedback button */}
      {authUser?.role === 'admin' && (
        <div className="bg-s1 border border-border1 p-4">
          <div className="font-display text-sm text-neon tracking-[0.2em] mb-3 pb-2 border-b border-border1 flex items-center gap-2">
            <LuBug size={14} /> REPORTAR BUG/MELHORIA
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] text-muted tracking-wider leading-relaxed">
              Exibe um botão flutuante discreto (visível só para admin) para enviar bugs e ideias de melhoria com contexto e screenshot direto para o e-mail.
            </p>
            <button
              onClick={() => setAdminFeedbackButtonEnabled(!adminFeedbackButtonEnabled)}
              className={`flex-shrink-0 w-12 h-7 rounded-full relative transition-colors ${
                adminFeedbackButtonEnabled ? 'bg-neon/80' : 'bg-border2'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-s1 transition-transform ${
                  adminFeedbackButtonEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

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
        <button
          onClick={() => setTutorialSeen(false)}
          className="mt-3 w-full font-mono text-[10px] text-muted tracking-widest border border-border2 py-2 hover:text-ink hover:border-neon/40 transition-colors"
        >
          REVER TUTORIAL
        </button>
      </div>
    </div>
  )
}
