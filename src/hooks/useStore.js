import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JS_DAY_TO_IDX, defaultUserProtocol, buildWorkoutSteps } from '../data/protocol'
import { defaultAchievements, checkNewAchievements } from '../data/achievements'
import { timerManager } from '../utils/timerManager'
import { round25 } from '../utils/loads'
import { supabase } from '../lib/supabase'

function detectWeekDay() {
  const saved = localStorage.getItem('uw_start_date')
  if (!saved) {
    localStorage.setItem('uw_start_date', new Date().toISOString().split('T')[0])
    return { week: 0, day: 0 }
  }
  const start = new Date(saved)
  const now   = new Date()
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const weekIdx  = Math.min(Math.floor(diffDays / 7), 7)
  const dayIdx   = JS_DAY_TO_IDX[now.getDay()] ?? 0
  return { week: weekIdx, day: dayIdx }
}

const { week: initWeek, day: initDay } = detectWeekDay()

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
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

const syncTimers = {}
async function syncStudentSection(targetUserId, section, capturedData) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    console.error('[save-student] sem sessão ativa — save cancelado')
    return
  }

  const fnUrl = `${supabase.supabaseUrl}/functions/v1/save-student-data`
  console.log('[save-student] chamando edge fn', fnUrl, 'studentId=', targetUserId, 'section=', section)

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
    console.error('[save-student] fetch falhou (rede?):', err)
    return
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '(sem body)')
    console.error('[save-student] edge fn retornou', res.status, errText)
    // Fallback: escrita direta (requer RLS trainer_admin_all via profiles)
    const { error: fbErr } = await supabase.from('user_data').upsert(
      { user_id: targetUserId, section, data: capturedData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    )
    if (fbErr) console.error('[save-student] fallback direto também falhou:', fbErr.message)
    else console.log('[save-student] fallback direto OK')
  } else {
    console.log('[save-student] edge fn OK')
  }
}

function scheduleSyncSection(section, get) {
  if (syncTimers[section]) clearTimeout(syncTimers[section])

  // Captura tudo AGORA — o estado pode ser sobrescrito antes do timer disparar
  const state0        = get()
  const targetUserId  = state0.viewingUserId || state0.authUser?.id
  const isStudentSave = !!state0.viewingUserId
  const capturedData  = {
    logs:            state0.logs,
    userProtocol:    state0.userProtocol,
    userProfile:     state0.userProfile,
    exerciseHistory: state0.exerciseHistory,
    savedExercises:  state0.savedExercises,
    mealLog:         state0.mealLog,
    microLog:        state0.microLog,
    achievements:    state0.achievements,
  }[section]

  console.log('[sync] scheduleSyncSection', section, '| viewing=', state0.viewingUserId, '| target=', targetUserId)

  syncTimers[section] = setTimeout(async () => {
    if (!targetUserId || capturedData === undefined) {
      console.warn('[sync] abortado — targetUserId=', targetUserId, 'capturedData=', capturedData === undefined ? 'undefined' : 'ok')
      return
    }

    if (isStudentSave) {
      await syncStudentSection(targetUserId, section, capturedData)
    } else {
      const { error } = await supabase.from('user_data').upsert(
        { user_id: targetUserId, section, data: capturedData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,section' }
      )
      if (error) console.error('[sync] próprio upsert falhou:', error.message)
    }
  }, 1500)
}

function startTimerTick(seconds, endsAt, set) {
  timerManager.start(
    seconds,
    (s) => set(state => ({ restTimer: { ...state.restTimer, running: true, seconds: s } })),
    () => {
      set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: 0 } }))
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
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

      // ── admin feedback button ─────────────────────────────────────────────────
      adminFeedbackButtonEnabled: true,
      adminFeedbackButtonPos: null, // { x, y } em px (canto top-left do botão); null = posição padrão
      setAdminFeedbackButtonEnabled: (v) => set({ adminFeedbackButtonEnabled: v }),
      setAdminFeedbackButtonPos: (pos) => set({ adminFeedbackButtonPos: pos }),

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
            } catch {}
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
            .select('section, data')
            .eq('user_id', userId)
          if (!error && data?.length) rows = data
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
            console.error('[hydrate] get-student-data falhou', res.status, errText)
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
        const { week, day } = detectWeekDay()
        set({ startDate: date, currentWeek: week, currentDay: day })
      },

      // ── rest timer ───────────────────────────────────────────────────────────
      restTimer: { running: false, seconds: 120, preset: 120, endsAt: 0 },

      startRestTimer: (seconds) => {
        timerManager.clear()
        const endsAt = Date.now() + seconds * 1000
        set(state => ({ restTimer: { ...state.restTimer, running: true, preset: seconds, seconds, endsAt } }))
        startTimerTick(seconds, endsAt, set)
      },

      stopRestTimer: () => {
        timerManager.clear()
        set(state => ({ restTimer: { ...state.restTimer, running: false } }))
      },

      resetRestTimer: (seconds) => {
        timerManager.clear()
        const s = seconds ?? get().restTimer.preset
        set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: s, preset: s, endsAt: 0 } }))
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
              { id: genId(), name: exercise.name, muscle: exercise.muscle, ...(exercise.accessoryMuscle ? { accessoryMuscle: exercise.accessoryMuscle } : {}) },
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

      // ── user protocol (8-week custom plan) ───────────────────────────────────
      userProtocol: defaultUserProtocol(),

      setUserProtocol: (protocol) => {
        set({ userProtocol: protocol })
        scheduleSyncSection('userProtocol', get)
      },

      setDayRest: (weekIdx, dayIdx, isRest) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].isRest = isRest
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      setDayRestSeconds: (weekIdx, dayIdx, seconds) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].restSeconds = seconds
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
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      addExercise: (weekIdx, dayIdx, exercise) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].exercises.push({ id: genId(), sets: [], ...exercise })
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      updateExercise: (weekIdx, dayIdx, exId, updates) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.map(e => e.id === exId ? { ...e, ...updates } : e)
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      removeExercise: (weekIdx, dayIdx, exId) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          const day = p.weeks[weekIdx].days[dayIdx]
          day.exercises = day.exercises.filter(e => e.id !== exId)
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
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      reorderExercises: (weekIdx, dayIdx, exercises) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].exercises = exercises
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
      partialize: (state) => ({
        logs:            state.logs,
        userProfile:     state.userProfile,
        microLog:        state.microLog,
        mealLog:         state.mealLog,
        userProtocol:    state.userProtocol,
        activeWorkout:   state.activeWorkout,
        workoutSessions: state.workoutSessions,
        restTimer:       state.restTimer,
        exerciseHistory: state.exerciseHistory,
        savedExercises:  state.savedExercises,
        achievements:    state.achievements,
        tutorialSeen:    state.tutorialSeen,
        stackNavHintSeen: state.stackNavHintSeen,
        adminFeedbackButtonEnabled: state.adminFeedbackButtonEnabled,
        adminFeedbackButtonPos:     state.adminFeedbackButtonPos,
        // _viewerSnapshot e pendingAchievements nunca persistem — só existem em memória
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.userProfile)  state.userProfile  = defaultUserProfile()
        if (state && !state.achievements) state.achievements = defaultAchievements()
      },
    }
  )
)
