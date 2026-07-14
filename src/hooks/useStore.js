import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JS_DAY_TO_IDX, defaultUserProtocol, buildWorkoutSteps, emptyWeek, DEFAULT_TOTAL_WEEKS, findWeekRange, DEFAULT_WEEK_TYPE } from '../data/protocol'
import { defaultAchievements, checkNewAchievements } from '../data/achievements'
import { timerManager } from '../utils/timerManager'
import { playRestDoneAlarm, warmAlarmAudio } from '../utils/alarmSound'
import { round25 } from '../utils/loads'
import { supabase } from '../lib/supabase'
import { exerciseSource } from '../lib/exerciseSource'
import { translateQueryToEnglish } from '../lib/exercisePtDictionary'
import { logDebug, logWarn, logError } from '../utils/log'

// totalWeeks: no load inicial do módulo (linha abaixo) o protocolo persistido ainda
// não foi hidratado, então cai no default — onRehydrateStorage reclampa currentWeek
// assim que o totalWeeks real (persistido) fica disponível.
function detectWeekDay(totalWeeks = DEFAULT_TOTAL_WEEKS) {
  const saved = localStorage.getItem('uw_start_date')
  if (!saved) {
    localStorage.setItem('uw_start_date', new Date().toISOString().split('T')[0])
    return { week: 0, day: 0 }
  }
  const start = new Date(saved)
  const now   = new Date()
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const weekIdx  = Math.min(Math.floor(diffDays / 7), totalWeeks - 1)
  const dayIdx   = JS_DAY_TO_IDX[now.getDay()] ?? 0
  return { week: weekIdx, day: dayIdx }
}

const { week: initWeek, day: initDay } = detectWeekDay()

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Se weekIdx faz parte de um range compartilhado (weekRanges — Bloco 2 de "semanas
// configuráveis"), replica os `days` dessa semana pras outras do mesmo grupo. Editar
// qualquer semana do range reflete nas outras — é o que faz o grupo "apontar pro
// mesmo template" sem duplicar autoria. Muta `protocol` in-place (chamado sempre
// sobre o clone `p` já feito por quem chama, antes do `return`).
function propagateWeekRange(protocol, weekIdx) {
  const range = findWeekRange(protocol.weekRanges, weekIdx)
  if (!range) return
  const week = protocol.weeks[weekIdx]
  const template = JSON.parse(JSON.stringify(week.days))
  for (let i = range.from; i <= range.to; i++) {
    if (i === weekIdx) continue
    protocol.weeks[i].days = JSON.parse(JSON.stringify(template))
    protocol.weeks[i].weekType = week.weekType // rótulo (Bloco 3) também é parte do "template" do grupo
  }
}

function defaultUserProfile() {
  return {
    weight:        80,
    height:        183,
    age:           21,
    sex:           'M',
    workoutTime:   '16:30',
    sleepTime:     '23:00',
    caloricGoal:   'bulk',
    activityLevel: 1.55,
  }
}

// Única fonte de verdade das seções que sincronizam com o Supabase (user_data).
// scheduleSyncSection deriva capturedData daqui; partialize (persist local) usa
// essa lista + LOCAL_ONLY_PERSISTED_FIELDS abaixo. Seção nova = editar só aqui —
// antes existia um 2o mapa hardcoded em scheduleSyncSection que precisava ser
// atualizado na mão junto, e esquecer fazia a seção persistir local mas nunca
// subir pro servidor, em silêncio (3.2).
const SYNCABLE_SECTIONS = [
  'logs', 'userProtocol', 'userProfile', 'exerciseHistory', 'savedExercises',
  'mealLog', 'microLog', 'achievements', 'workoutSessions', 'pushSubscription',
]

// Persistem localmente (localStorage) mas nunca sincronizam com o Supabase —
// preferência/estado de dispositivo, não dado do usuário que precise atravessar
// dispositivos.
const LOCAL_ONLY_PERSISTED_FIELDS = [
  'activeWorkout', 'restTimer', 'tutorialSeen', 'stackNavHintSeen',
  'neonGifFilterEnabled', 'adminFeedbackButtonEnabled', 'adminFeedbackButtonPos',
  'pushNotificationsEnabled',
]

const syncTimers = {}

// Guarda de last-write-wins silencioso (3.1): último updated_at CONHECIDO por
// (userId, section) — visto num hydrate ou gravado por este mesmo processo/aba.
// Se o servidor estiver com um updated_at mais novo que o conhecido na hora de
// gravar, é sinal de que outra aba/dispositivo escreveu no meio do caminho — a
// gravação é recusada em vez de sobrescrever cego (ver scheduleSyncSection).
// Em memória de propósito (é bookkeeping de sincronização, não dado do usuário).
const lastSeenUpdatedAt = {}
function sectionKey(userId, section) { return `${userId}:${section}` }

async function syncStudentSection(targetUserId, section, capturedData) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    logError('[save-student] sem sessão ativa — save cancelado')
    return
  }

  const fnUrl = `${supabase.supabaseUrl}/functions/v1/save-student-data`
  logDebug('[save-student] chamando edge fn', fnUrl, 'studentId=', targetUserId, 'section=', section)

  let res
  try {
    res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ studentId: targetUserId, section, data: capturedData }),
    })
  } catch (err) {
    logError('[save-student] fetch falhou (rede?):', err)
    return
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '(sem body)')
    logError('[save-student] edge fn retornou', res.status, errText)
    // Fallback: escrita direta (requer RLS trainer_admin_all via profiles)
    const { error: fbErr } = await supabase.from('user_data').upsert(
      { user_id: targetUserId, section, data: capturedData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    )
    if (fbErr) logError('[save-student] fallback direto também falhou:', fbErr.message)
    else logDebug('[save-student] fallback direto OK')
  } else {
    logDebug('[save-student] edge fn OK')
  }
}

function scheduleSyncSection(section, get) {
  // Guarda explícita contra seção desconhecida (3.2) — antes, esquecer de
  // registrar uma seção nova no mapa hardcoded fazia isto abortar em silêncio
  // (capturedData undefined), sincronizando local mas nunca subindo pro servidor.
  if (!SYNCABLE_SECTIONS.includes(section)) {
    logWarn('[sync] seção desconhecida (fora de SYNCABLE_SECTIONS) — ignorando:', section)
    return
  }

  if (syncTimers[section]) clearTimeout(syncTimers[section])

  // Captura tudo AGORA — o estado pode ser sobrescrito antes do timer disparar
  const state0        = get()
  const targetUserId  = state0.viewingUserId || state0.authUser?.id
  const isStudentSave = !!state0.viewingUserId
  const capturedData  = state0[section]

  logDebug('[sync] scheduleSyncSection', section, '| viewing=', state0.viewingUserId, '| target=', targetUserId)

  syncTimers[section] = setTimeout(async () => {
    if (!targetUserId || capturedData === undefined) {
      logWarn('[sync] abortado — targetUserId=', targetUserId, 'capturedData=', capturedData === undefined ? 'undefined' : 'ok')
      return
    }

    if (isStudentSave) {
      await syncStudentSection(targetUserId, section, capturedData)
    } else {
      const key = sectionKey(targetUserId, section)
      const knownUpdatedAt = lastSeenUpdatedAt[key] ?? null

      // Só checa contra o servidor se já temos uma baseline conhecida (hydrate ou
      // gravação anterior nesta aba) — sem isso não há com o que comparar, e a 1a
      // sincronização da sessão segue gravando normal (ver comentário no hydrate).
      if (knownUpdatedAt != null) {
        const { data: existingRow, error: readErr } = await supabase
          .from('user_data')
          .select('updated_at')
          .eq('user_id', targetUserId)
          .eq('section', section)
          .maybeSingle()

        if (!readErr && existingRow?.updated_at) {
          const serverUpdatedAt = new Date(existingRow.updated_at).getTime()
          if (serverUpdatedAt > knownUpdatedAt) {
            // Outra aba/dispositivo gravou depois da última vez que vimos esta
            // seção — nosso capturedData é potencialmente mais velho. Recusa
            // sobrescrever cego (last-write-wins silencioso é perda de dado real
            // num app de treino). Atualiza a baseline pro que o servidor tem agora,
            // pra não ficar repetindo o aviso pra sempre nas próximas tentativas.
            logWarn('[sync] recusado — servidor mais novo que o conhecido pra', section,
              '| conhecido=', new Date(knownUpdatedAt).toISOString(), '| servidor=', existingRow.updated_at)
            lastSeenUpdatedAt[key] = serverUpdatedAt
            return
          }
        }
      }

      const nowIso = new Date().toISOString()
      const { error } = await supabase.from('user_data').upsert(
        { user_id: targetUserId, section, data: capturedData, updated_at: nowIso },
        { onConflict: 'user_id,section' }
      )
      if (error) logError('[sync] próprio upsert falhou:', error.message)
      else lastSeenUpdatedAt[key] = new Date(nowIso).getTime()
    }
  }, 1500)
}

// Fire-and-forget: pede pro backend agendar um push pro fim do descanso (best-effort,
// ver limitação documentada em supabase/functions/schedule-rest-push). Só dispara se o
// usuário ligou o toggle de notificações e já tem uma subscription salva. Cada chamada
// (start ou +15s/-15s) sobrescreve o agendamento anterior no servidor — o antigo se
// auto-cancela sozinho (ver activePushId na função).
async function scheduleRestPush(seconds, get) {
  const { pushNotificationsEnabled, pushSubscription } = get()
  if (!pushNotificationsEnabled || !pushSubscription?.endpoint) return

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch(`${supabase.supabaseUrl}/functions/v1/schedule-rest-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ seconds, title: 'Descanso finalizado', body: 'Hora da próxima série 💪' }),
    })
  } catch (err) {
    logError('[push] scheduleRestPush falhou:', err)
  }
}

// Cancela o push agendado (pular a série ou parar o descanso manualmente) — sem isso
// a notificação dispararia mais tarde avisando um descanso que o usuário já encerrou.
async function cancelRestPush(get) {
  const { pushNotificationsEnabled, pushSubscription } = get()
  if (!pushNotificationsEnabled || !pushSubscription?.endpoint) return

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch(`${supabase.supabaseUrl}/functions/v1/schedule-rest-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ cancel: true }),
    })
  } catch (err) {
    logError('[push] cancelRestPush falhou:', err)
  }
}

function startTimerTick(seconds, endsAt, set) {
  timerManager.start(
    seconds,
    (s) => set(state => ({ restTimer: { ...state.restTimer, running: true, seconds: s } })),
    () => {
      set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: 0 } }))
      // vibrate não funciona no Safari/iOS — o som é quem garante o feedback ali
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      playRestDoneAlarm()
    }
  )
}

export const useStore = create(
  persist(
    (set, get) => ({
      // ── navigation ──────────────────────────────────────────────────────────
      currentWeek: initWeek,
      currentDay:  initDay,
      activeTab:   'workout',
      sidebarOpen: false,
      headerVisible: true,

      setWeek:          (week) => set({ currentWeek: week, currentDay: 0 }),
      setDay:           (day)  => set({ currentDay: day }),
      setTab:           (tab)  => set({ activeTab: tab, sidebarOpen: false }),
      setSidebar:       (v)    => set({ sidebarOpen: v }),
      setHeaderVisible: (v)    => set({ headerVisible: v }),

      // ── onboarding ───────────────────────────────────────────────────────────
      tutorialSeen: false,
      setTutorialSeen: (v = true) => set({ tutorialSeen: v }),

      stackNavHintSeen: false,
      setStackNavHintSeen: (v = true) => set({ stackNavHintSeen: v }),

      // ── biblioteca de exercícios: filtro neon nos GIFs ────────────────────────
      neonGifFilterEnabled: true,
      setNeonGifFilterEnabled: (v) => set({ neonGifFilterEnabled: v }),

      // ── admin feedback button ─────────────────────────────────────────────────
      adminFeedbackButtonEnabled: true,
      adminFeedbackButtonPos: null, // { x, y } em px (canto top-left do botão); null = posição padrão
      setAdminFeedbackButtonEnabled: (v) => set({ adminFeedbackButtonEnabled: v }),
      setAdminFeedbackButtonPos: (pos) => set({ adminFeedbackButtonPos: pos }),

      // ── push notifications (fim do rest timer em background) ─────────────────
      pushNotificationsEnabled: false, // toggle do usuário — permissão só é pedida ao ligar
      pushSubscription: null,          // PushSubscription.toJSON(), sincronizada como qualquer outra seção
      setPushNotificationsEnabled: (v) => set({ pushNotificationsEnabled: v }),
      setPushSubscription: (sub) => {
        set({ pushSubscription: sub })
        scheduleSyncSection('pushSubscription', get)
      },

      // ── auth ─────────────────────────────────────────────────────────────────
      authUser:        null,
      authLoading:     true,
      viewingUserId:   null,
      viewingUserName: null,

      setAuthUser: async (user) => {
        const { authUser, viewingUserId } = get()
        set({ authUser: user, authLoading: false })
        // Não rehidrata se estiver visualizando aluno (evita sobrescrever dados do aluno)
        // Não rehidrata se for o mesmo usuário já carregado
        if (!viewingUserId && authUser?.id !== user.id) {
          await get().hydrateFromSupabase(user.id)
        }
      },

      clearAuth: () => {
        Object.values(syncTimers).forEach(t => clearTimeout(t))
        set({
          authUser:        null,
          authLoading:     false,
          viewingUserId:   null,
          viewingUserName: null,
          logs:               {},
          userProtocol:       defaultUserProtocol(),
          exerciseHistory:    {},
          savedExercises:     [],
          mealLog:            {},
          microLog:           {},
          activeWorkout:      null,
          achievements:       defaultAchievements(),
          pendingAchievements: [],
        })
      },

      signOut: async () => {
        get().clearAuth()
        supabase.auth.signOut().catch(() => {})
      },

      setViewingUser: async (userId, userName = null) => {
        const SNAP_KEY = 'uw-trainer-snapshot'

        if (!userId) {
          // Restaura do localStorage dedicado (sobrevive a page refresh)
          const raw = localStorage.getItem(SNAP_KEY)
          localStorage.removeItem(SNAP_KEY)
          if (raw) {
            try {
              const snapshot = JSON.parse(raw)
              set({ viewingUserId: null, viewingUserName: null, ...snapshot })
              return
            } catch {
              // silêncio intencional — snapshot corrompido/ilegível cai pro fallback abaixo
            }
          }
          // Fallback: busca do Supabase se snapshot perdido
          const { authUser } = get()
          set({ viewingUserId: null, viewingUserName: null })
          if (authUser) await get().hydrateFromSupabase(authUser.id)
        } else {
          // Salva snapshot num key separado antes de sobrescrever
          const s = get()
          localStorage.setItem(SNAP_KEY, JSON.stringify({
            logs:            s.logs,
            userProtocol:    s.userProtocol,
            exerciseHistory: s.exerciseHistory,
            savedExercises:  s.savedExercises,
            mealLog:         s.mealLog,
            microLog:        s.microLog,
            userProfile:     s.userProfile,
          }))
          set({
            viewingUserId:   userId,
            viewingUserName: userName,
            activeTab:       'workout',
            logs:            {},
            userProtocol:    defaultUserProtocol(),
            exerciseHistory: {},
            savedExercises:  [],
            mealLog:         {},
            microLog:        {},
            userProfile:     defaultUserProfile(),
          })
          await get().hydrateFromSupabase(userId)
        }
      },

      hydrateFromSupabase: async (userId) => {
        const { authUser } = get()
        const isOwnData = userId === authUser?.id

        let rows = []

        if (isOwnData) {
          const { data, error } = await supabase
            .from('user_data')
            .select('section, data, updated_at')
            .eq('user_id', userId)
          if (!error && data?.length) {
            rows = data
            // Semeia a guarda de last-write-wins (3.1) com o que o servidor tinha
            // agora — sem isso, a 1a sincronização desta aba pra cada seção não tem
            // baseline pra comparar (segue gravando normal até a 2a sync em diante).
            for (const row of data) {
              if (row.updated_at) lastSeenUpdatedAt[sectionKey(userId, row.section)] = new Date(row.updated_at).getTime()
            }
          }
        } else {
          // dados de aluno — usa edge function com service role (bypassa RLS)
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(
            `${supabase.supabaseUrl}/functions/v1/get-student-data`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ studentId: userId }),
            }
          )
          if (!res.ok) {
            const errText = await res.text().catch(() => '')
            logError('[hydrate] get-student-data falhou', res.status, errText)
          } else {
            const json = await res.json()
            if (json.data?.length) rows = json.data
          }
        }

        const updates = {}
        for (const row of rows) {
          if (row.section === 'userProtocol')    updates.userProtocol    = row.data
          if (row.section === 'userProfile')     updates.userProfile     = row.data
          if (row.section === 'logs')            updates.logs            = row.data
          if (row.section === 'exerciseHistory') updates.exerciseHistory = row.data
          if (row.section === 'savedExercises')  updates.savedExercises  = row.data
          if (row.section === 'mealLog')         updates.mealLog         = row.data
          if (row.section === 'microLog')        updates.microLog        = row.data
          if (row.section === 'achievements')    updates.achievements    = row.data
        }
        // Garante que userProfile nunca fica null após hydration
        if (!updates.userProfile)  updates.userProfile  = defaultUserProfile()
        if (!updates.achievements) updates.achievements = defaultAchievements()
        if (Object.keys(updates).length) set(updates)
      },

      // ── workout logs ─────────────────────────────────────────────────────────
      logs: {},

      saveLog: (weekIdx, dayIdx, exIdx, entry) => {
        const key = `w${weekIdx}_d${dayIdx}_e${exIdx}`
        const existing = get().logs[key] || {}
        set((state) => ({
          logs: {
            ...state.logs,
            [key]: {
              ...existing,
              ...entry,
              date: new Date().toISOString(),
              history: [
                ...(existing.history || []),
                { ...entry, date: new Date().toISOString() },
              ].slice(-10),
            },
          },
        }))
        scheduleSyncSection('logs', get)
      },

      getLog: (weekIdx, dayIdx, exIdx) => {
        const key = `w${weekIdx}_d${dayIdx}_e${exIdx}`
        return get().logs[key] || null
      },

      clearAllLogs: () => set({ logs: {} }),

      // ── start date ───────────────────────────────────────────────────────────
      startDate: localStorage.getItem('uw_start_date') || new Date().toISOString().split('T')[0],
      setStartDate: (date) => {
        localStorage.setItem('uw_start_date', date)
        const { week, day } = detectWeekDay(get().userProtocol.totalWeeks)
        set({ startDate: date, currentWeek: week, currentDay: day })
      },

      // ── rest timer ───────────────────────────────────────────────────────────
      restTimer: { running: false, seconds: 120, preset: 120, endsAt: 0 },

      startRestTimer: (seconds) => {
        warmAlarmAudio() // chamado dentro do gesto (tap em "concluído"), não no callback do timer
        timerManager.clear()
        const endsAt = Date.now() + seconds * 1000
        set(state => ({ restTimer: { ...state.restTimer, running: true, preset: seconds, seconds, endsAt } }))
        startTimerTick(seconds, endsAt, set)
        scheduleRestPush(seconds, get)
      },

      stopRestTimer: () => {
        timerManager.clear()
        set(state => ({ restTimer: { ...state.restTimer, running: false } }))
        cancelRestPush(get) // cobre o botão "pular" e o "X" de fechar — os dois chamam isso
      },

      resetRestTimer: (seconds) => {
        timerManager.clear()
        const s = seconds ?? get().restTimer.preset
        set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: s, preset: s, endsAt: 0 } }))
      },

      // +/-15s etc. Só mexe no timer rodando — ajusta o fim (endsAt) e reinicia o
      // tick do timerManager a partir do novo restante; preset não muda (é só a
      // duração original, usada pra % da barra de progresso).
      adjustRestTimer: (deltaSeconds) => {
        const { restTimer } = get()
        if (!restTimer.running) return
        const remaining = Math.max(0, Math.round((restTimer.endsAt - Date.now()) / 1000))
        const next = Math.max(0, remaining + deltaSeconds)
        timerManager.clear()
        if (next <= 0) {
          set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: 0, endsAt: 0 } }))
          cancelRestPush(get) // -15s zerou o descanso — não deixa o push antigo disparar depois
          return
        }
        const endsAt = Date.now() + next * 1000
        set(state => ({ restTimer: { ...state.restTimer, seconds: next, endsAt } }))
        startTimerTick(next, endsAt, set)
        scheduleRestPush(next, get)
      },

      resumeRestTimer: () => {
        const { restTimer } = get()
        if (!restTimer.running || !restTimer.endsAt) return
        const remaining = Math.max(0, Math.round((restTimer.endsAt - Date.now()) / 1000))
        if (remaining <= 0) {
          set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: 0 } }))
          return
        }
        set(state => ({ restTimer: { ...state.restTimer, seconds: remaining } }))
        startTimerTick(remaining, restTimer.endsAt, set)
      },

      // ── user profile ─────────────────────────────────────────────────────────
      userProfile: {
        weight:        80,
        height:        183,
        age:           21,
        sex:           'M',
        workoutTime:   '16:30',
        sleepTime:     '23:00',
        caloricGoal:   'bulk',
        activityLevel: 1.55,
      },
      setUserProfile: (updates) => {
        set(state => ({ userProfile: { ...state.userProfile, ...updates } }))
        scheduleSyncSection('userProfile', get)
      },

      // ── micronutrient log ────────────────────────────────────────────────────
      microLog: {},
      toggleMicro: (dateStr, microId) => {
        set(state => ({
          microLog: {
            ...state.microLog,
            [dateStr]: {
              ...(state.microLog[dateStr] || {}),
              [microId]: !(state.microLog[dateStr]?.[microId]),
            },
          },
        }))
        scheduleSyncSection('microLog', get)
      },

      // ── meal log (marked meals) ──────────────────────────────────────────────
      mealLog: {},
      toggleMeal: (dateStr, mealId) => {
        set(state => ({
          mealLog: {
            ...state.mealLog,
            [dateStr]: {
              ...(state.mealLog[dateStr] || {}),
              [mealId]: !(state.mealLog[dateStr]?.[mealId]),
            },
          },
        }))
        scheduleSyncSection('mealLog', get)
      },

      // ── saved exercise library ───────────────────────────────────────────────
      savedExercises: [],

      addSavedExercise: (exercise) => {
        set(state => {
          const exists = state.savedExercises.some(
            e => e.name.toLowerCase() === exercise.name.toLowerCase()
          )
          if (exists) return {}
          return {
            savedExercises: [
              ...state.savedExercises,
              {
                id: genId(),
                name: exercise.name,
                muscle: exercise.muscle,
                ...(exercise.accessoryMuscle ? { accessoryMuscle: exercise.accessoryMuscle } : {}),
                ...(exercise.libraryId ? { libraryId: exercise.libraryId } : {}),
              },
            ],
          }
        })
        scheduleSyncSection('savedExercises', get)
      },

      removeSavedExercise: (id) => {
        set(state => ({
          savedExercises: state.savedExercises.filter(e => e.id !== id),
        }))
        scheduleSyncSection('savedExercises', get)
      },

      // ── exercise history (cross-session, keyed by exercise name) ─────────────
      exerciseHistory: {},

      saveExerciseHistory: (name, entry) => {
        set(state => ({
          exerciseHistory: {
            ...state.exerciseHistory,
            [name.toUpperCase().trim()]: entry,
          },
        }))
        scheduleSyncSection('exerciseHistory', get)
      },

      getExerciseHistory: (name) =>
        get().exerciseHistory[name?.toUpperCase()?.trim()] || null,

      // ── user protocol (N-week custom plan, N = userProtocol.totalWeeks) ──────
      userProtocol: defaultUserProtocol(),

      setUserProtocol: (protocol) => {
        set({ userProtocol: protocol })
        scheduleSyncSection('userProtocol', get)
      },

      // Cresce/encolhe o número de semanas do protocolo. Crescer só acrescenta
      // semanas vazias no fim; encolher corta as últimas (quem chama a UI decide se
      // confirma antes, já que isso descarta dados de semana com conteúdo).
      setTotalWeeks: (n) => {
        const total = Math.max(1, Math.min(52, Math.round(n) || 1))
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const current = p.weeks.length
          if (total > current) {
            for (let i = current; i < total; i++) p.weeks.push(emptyWeek())
          } else if (total < current) {
            p.weeks = p.weeks.slice(0, total)
          }
          p.totalWeeks = total
          // Encolher pode deixar range(s) apontando pra semana que não existe mais —
          // corta o "to" pro novo limite, e descarta o range se sobrar só 1 semana
          // (from === to não significa nada — não dá pra "compartilhar" com si mesma).
          p.weekRanges = (p.weekRanges || [])
            .map(r => ({ from: r.from, to: Math.min(r.to, total - 1) }))
            .filter(r => r.from < total && r.from < r.to)
          return {
            userProtocol: p,
            currentWeek: Math.min(state.currentWeek, total - 1),
          }
        })
        scheduleSyncSection('userProtocol', get)
      },

      // Agrupa semanas [from..to] (0-based, inclusive) num único template
      // compartilhado — editar qualquer uma propaga pras outras (ver
      // propagateWeekRange). Ranges que colidirem com o novo intervalo são
      // substituídos por ele. Propaga o conteúdo de `from` imediatamente ao criar.
      setWeekRange: (from, to) => {
        const lo0 = Math.min(from, to)
        const hi0 = Math.max(from, to)
        if (lo0 === hi0) return // 1 semana não é "range" — não dá pra compartilhar com si mesma
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const lo = Math.max(0, lo0)
          const hi = Math.min(p.weeks.length - 1, hi0)
          p.weekRanges = (p.weekRanges || []).filter(r => hi < r.from || lo > r.to)
          p.weekRanges.push({ from: lo, to: hi })
          p.weekRanges.sort((a, b) => a.from - b.from)
          propagateWeekRange(p, lo)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      // Desagrupa — cada semana do range vira independente a partir de agora
      // (mantém o conteúdo atual, só para de propagar futuras edições).
      removeWeekRange: (from) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weekRanges = (p.weekRanges || []).filter(r => r.from !== from)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      // Só rótulo (PROGRESSAO | BASE | DELOAD | REVOLUME) — nenhuma lógica reage a
      // isso hoje. Propaga pro resto do range se a semana estiver agrupada.
      setWeekType: (weekIdx, weekType) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].weekType = weekType
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      setDayRest: (weekIdx, dayIdx, isRest) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].isRest = isRest
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      setDayRestSeconds: (weekIdx, dayIdx, seconds) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].restSeconds = seconds
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      // Substitui setDayWarmupRestSeconds/setDayFeederRestSeconds (warmup+feeder viraram
      // uma rampa única). Protocolos antigos com os campos separados continuam lendo
      // certo via getPrepRestSeconds (fallback em protocol.js); só a escrita muda.
      setDayPrepRestSeconds: (weekIdx, dayIdx, seconds) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].prepRestSeconds = seconds
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      addExercise: (weekIdx, dayIdx, exercise) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].exercises.push({ id: genId(), sets: [], ...exercise })
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      updateExercise: (weekIdx, dayIdx, exId, updates) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.map(e => e.id === exId ? { ...e, ...updates } : e)
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      // Vincula à biblioteca (GIFs) os exercícios do protocolo que ainda não têm
      // libraryId. Só linka quando reconhece vocabulário de academia no nome (PT
      // traduzido — ver exercisePtDictionary) E o candidato da busca contém TODOS
      // os termos traduzidos — ambíguo/sem reconhecimento fica como estava, sem
      // perguntar (usuário escolheu "só matches muito confiantes"). Retorna um
      // resumo { linked, skipped } pra UI mostrar.
      autoLinkProtocolToLibrary: async () => {
        const p = JSON.parse(JSON.stringify(get().userProtocol))
        let linked = 0
        let skipped = 0

        for (const week of p.weeks) {
          for (const day of week.days) {
            if (day.isRest) continue
            for (const ex of day.exercises) {
              if (ex.libraryId) continue
              const { query, translatedTokens } = translateQueryToEnglish(ex.name)
              if (!translatedTokens.length) { skipped++; continue }

              let items = []
              try {
                ({ items } = await exerciseSource.listExercises({ search: query, pageSize: 5 }))
              } catch {
                skipped++
                continue
              }

              const tokens = [...new Set(translatedTokens.map(t => t.toLowerCase()))]
              const match = items.find(it => {
                const n = it.name.toLowerCase()
                return tokens.every(t => n.includes(t))
              })

              if (match) {
                ex.libraryId = match.id
                linked++
              } else {
                skipped++
              }
            }
          }
        }

        set({ userProtocol: p })
        scheduleSyncSection('userProtocol', get)
        return { linked, skipped }
      },

      removeExercise: (weekIdx, dayIdx, exId) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.filter(e => e.id !== exId)
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      addSet: (weekIdx, dayIdx, exId, setDef) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.map(e =>
            e.id === exId
              ? { ...e, sets: [...e.sets, { id: genId(), ...setDef }] }
              : e
          )
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      updateSet: (weekIdx, dayIdx, exId, setId, updates) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.map(e =>
            e.id === exId
              ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, ...updates } : s) }
              : e
          )
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      removeSet: (weekIdx, dayIdx, exId, setId) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.map(e =>
            e.id === exId
              ? { ...e, sets: e.sets.filter(s => s.id !== setId) }
              : e
          )
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      reorderExercises: (weekIdx, dayIdx, exercises) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].exercises = exercises
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      reorderSets: (weekIdx, dayIdx, exId, sets) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.map(e =>
            e.id === exId ? { ...e, sets } : e
          )
          propagateWeekRange(p, weekIdx)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      // ── achievements ─────────────────────────────────────────────────────────
      achievements:        defaultAchievements(),
      pendingAchievements: [], // IDs desbloqueados no treino atual, limpos após exibição

      dismissPendingAchievement: () => {
        const { pendingAchievements } = get()
        set({ pendingAchievements: pendingAchievements.slice(1) })
      },

      // ── active workout session ────────────────────────────────────────────────
      activeWorkout: null,
      workoutSessions: [], // histórico de sessões concluídas: { weekIdx, dayIdx, startedAt, completedAt, durationSec }

      startWorkout: (weekIdx, dayIdx) => {
        const day = get().userProtocol.weeks[weekIdx].days[dayIdx]
        if (!day || day.isRest) return
        const steps = buildWorkoutSteps(day.exercises)
        set({
          activeWorkout: {
            weekIdx,
            dayIdx,
            steps,
            currentStepIdx: 0,
            exerciseWeights: {},
            setResults: {},
            startedAt: new Date().toISOString(),
            completedAt: null,
          },
        })
      },

      setExerciseWeight: (exerciseId, weight) => set(state => ({
        activeWorkout: state.activeWorkout
          ? {
              ...state.activeWorkout,
              exerciseWeights: { ...state.activeWorkout.exerciseWeights, [exerciseId]: weight },
            }
          : null,
      })),

      advanceWorkoutStep: () => {
        const { activeWorkout } = get()
        if (!activeWorkout) return
        const next = activeWorkout.currentStepIdx + 1
        if (next >= activeWorkout.steps.length) {
          set({ activeWorkout: { ...activeWorkout, completedAt: new Date().toISOString() } })
        } else {
          set({ activeWorkout: { ...activeWorkout, currentStepIdx: next } })
        }
      },

      saveSetResult: (stepKey, result) => set(state => ({
        activeWorkout: state.activeWorkout
          ? {
              ...state.activeWorkout,
              setResults: { ...state.activeWorkout.setResults, [stepKey]: result },
            }
          : null,
      })),

      completeWorkout: () => {
        const { activeWorkout, saveLog, saveExerciseHistory } = get()
        if (!activeWorkout) return
        const { weekIdx, dayIdx, steps, exerciseWeights, setResults, startedAt } = activeWorkout
        // completedAt pode já estar setado (fluxo normal, via advanceWorkoutStep) ou não
        // (usuário tocou "concluir treino" direto) — nesse caso fixa agora, na hora real do fechamento
        const completedAt = activeWorkout.completedAt || new Date().toISOString()
        const durationSec = Math.max(0, Math.round((new Date(completedAt) - new Date(startedAt)) / 1000))

        const exerciseMap = {}
        steps.forEach((step, idx) => {
          const key = step.exerciseId
          if (!exerciseMap[key]) {
            exerciseMap[key] = {
              name: step.exerciseName,
              kg: exerciseWeights[key] || 0,
              warmups: [],
              feeders: [],
              sets: [],
            }
          }
          const result = setResults[String(idx)]
          // PREP unifica os antigos WARMUP/FEEDER numa rampa só — history/log continuam
          // guardando em `feeders` (não renomeado pra não quebrar leitura de dados antigos
          // já persistidos); `warmups` fica só de compat, sempre vazio a partir daqui.
          if (step.type === 'PREP') {
            exerciseMap[key].feeders.push({
              reps: result?.reps || 0,
              kg: round25((exerciseWeights[key] || 0) * step.pct),
            })
          } else if (step.type === 'WORKING_SET') {
            exerciseMap[key].sets.push({
              setType: step.setDef?.type || 'NORMAL',
              repRange: step.setDef?.repRange || '',
              ...(result || { kg: exerciseWeights[key] || 0 }),
            })
          }
        })

        const day = get().userProtocol.weeks[weekIdx].days[dayIdx]
        ;(day.exercises || []).forEach((ex, exIdx) => {
          const data = exerciseMap[ex.id]
          if (!data) return
          saveLog(weekIdx, dayIdx, exIdx, { name: data.name, sets: data.sets, kg: data.kg, warmups: data.warmups, feeders: data.feeders })
          saveExerciseHistory(data.name, {
            date: new Date().toISOString(),
            kg: data.kg,
            warmups: data.warmups,
            feeders: data.feeders,
            sets: data.sets,
          })
        })

        // ── conquistas ──────────────────────────────────────────────────────
        const prev = get().achievements
        const today = new Date().toISOString().split('T')[0]
        const lastDate = prev.lastWorkoutDate

        // streak: +1 se ontem treinou, 1 se dia diferente sem ser ontem, mantém se for hoje
        let streak = prev.streak
        if (lastDate === today) {
          // mesmo dia, não altera streak
        } else {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
          streak = lastDate === yesterday ? streak + 1 : 1
        }

        // verifica se todos os exercícios com repRange ficaram acima
        const allExercises = Object.values(exerciseMap)
        const withRange = allExercises.filter(ex =>
          ex.sets.some(s => s.setType === 'NORMAL' && s.repRange)
        )
        const lastWorkoutAllAbove = withRange.length > 0 && withRange.every(ex =>
          ex.sets
            .filter(s => s.setType === 'NORMAL' && s.repRange && s.reps != null)
            .every(s => {
              const parts = s.repRange.split('-').map(Number)
              const hi = parts.length > 1 ? parts[1] : parts[0]
              return !isNaN(hi) && s.reps > hi
            })
        )

        const newCount = prev.workoutCount + 1
        const updatedAchievements = {
          ...prev,
          workoutCount:    newCount,
          streak,
          lastWorkoutDate: today,
        }
        const newIds = checkNewAchievements(prev, {
          workoutCount: newCount,
          streak,
          lastWorkoutAllAbove,
        })
        if (newIds.length > 0) {
          updatedAchievements.unlockedIds = [...prev.unlockedIds, ...newIds]
        }

        // histórico de sessões — registra a duração final do treino concluído
        const workoutSessions = [
          ...get().workoutSessions,
          { weekIdx, dayIdx, startedAt, completedAt, durationSec },
        ].slice(-50)

        set({ activeWorkout: null, achievements: updatedAchievements, pendingAchievements: newIds, workoutSessions })
        scheduleSyncSection('achievements', get)
        scheduleSyncSection('workoutSessions', get)
      },

      abandonWorkout: () => set({ activeWorkout: null }),
    }),
    {
      name: 'uw-store-v3',
      // Deriva de SYNCABLE_SECTIONS + LOCAL_ONLY_PERSISTED_FIELDS (3.2) — mesma
      // lista que scheduleSyncSection usa pro que sobe pro servidor, mais os
      // campos que só persistem local. Seção nova: editar só as listas lá em cima.
      partialize: (state) => {
        const out = {}
        for (const key of [...SYNCABLE_SECTIONS, ...LOCAL_ONLY_PERSISTED_FIELDS]) out[key] = state[key]
        return out
        // _viewerSnapshot e pendingAchievements nunca persistem — só existem em memória
      },
      onRehydrateStorage: () => (state) => {
        if (state && !state.userProfile)  state.userProfile  = defaultUserProfile()
        if (state && !state.achievements) state.achievements = defaultAchievements()
        // Migração: protocolo salvo antes do total de semanas virar configurável não
        // tem totalWeeks — assume o tamanho real do array já persistido (8, no caso
        // de quem já usava o app antes desta feature).
        if (state?.userProtocol && state.userProtocol.totalWeeks == null) {
          state.userProtocol.totalWeeks = state.userProtocol.weeks?.length || DEFAULT_TOTAL_WEEKS
        }
        // Migração: protocolo salvo antes da repetição de semana por range não tem
        // weekRanges — "modo sem ranges" (cada semana é ela mesma), zero mudança de
        // comportamento pra quem já tinha protocolo.
        if (state?.userProtocol && state.userProtocol.weekRanges == null) {
          state.userProtocol.weekRanges = []
        }
        // Migração: semana salva antes do tipo (Bloco 3) virar campo assume o
        // default — é só rótulo, então isso não muda nenhum número/comportamento.
        if (state?.userProtocol?.weeks) {
          for (const w of state.userProtocol.weeks) {
            if (!w.weekType) w.weekType = DEFAULT_WEEK_TYPE
          }
        }
        if (state?.userProtocol && state.currentWeek >= state.userProtocol.totalWeeks) {
          state.currentWeek = Math.max(0, state.userProtocol.totalWeeks - 1)
        }
      },
    }
  )
)
