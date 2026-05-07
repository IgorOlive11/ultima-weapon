import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JS_DAY_TO_IDX, defaultUserProtocol, buildWorkoutSteps } from '../data/protocol'
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

const syncTimers = {}
function scheduleSyncSection(section, get) {
  if (syncTimers[section]) clearTimeout(syncTimers[section])
  syncTimers[section] = setTimeout(async () => {
    const state = get()
    const userId = state.viewingUserId || state.authUser?.id
    if (!userId) return
    const data = {
      logs:            state.logs,
      userProtocol:    state.userProtocol,
      userProfile:     state.userProfile,
      exerciseHistory: state.exerciseHistory,
      savedExercises:  state.savedExercises,
      mealLog:         state.mealLog,
      microLog:        state.microLog,
    }[section]
    if (data === undefined) return
    await supabase.from('user_data').upsert(
      { user_id: userId, section, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    )
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

      // ── auth ─────────────────────────────────────────────────────────────────
      authUser:        null,
      authLoading:     true,
      viewingUserId:   null,
      viewingUserName: null,

      setAuthUser: async (user) => {
        set({ authUser: user, authLoading: false })
        await get().hydrateFromSupabase(user.id)
      },

      clearAuth: () => {
        Object.values(syncTimers).forEach(t => clearTimeout(t))
        set({
          authUser:        null,
          authLoading:     false,
          viewingUserId:   null,
          viewingUserName: null,
          logs:            {},
          userProtocol:    defaultUserProtocol(),
          exerciseHistory: {},
          savedExercises:  [],
          mealLog:         {},
          microLog:        {},
          activeWorkout:   null,
        })
      },

      signOut: async () => {
        await supabase.auth.signOut()
        // clearAuth is called automatically via onAuthStateChange(SIGNED_OUT)
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
            userProfile:     null,
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
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-student-data`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ studentId: userId }),
            }
          )
          const json = await res.json()
          if (res.ok && json.data?.length) rows = json.data
        }

        if (!rows.length) return

        const updates = {}
        for (const row of rows) {
          if (row.section === 'userProtocol')    updates.userProtocol    = row.data
          if (row.section === 'userProfile')     updates.userProfile     = row.data
          if (row.section === 'logs')            updates.logs            = row.data
          if (row.section === 'exerciseHistory') updates.exerciseHistory = row.data
          if (row.section === 'savedExercises')  updates.savedExercises  = row.data
          if (row.section === 'mealLog')         updates.mealLog         = row.data
          if (row.section === 'microLog')        updates.microLog        = row.data
        }
        set(updates)
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
              { id: genId(), name: exercise.name, muscle: exercise.muscle },
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

      setDayWarmupRestSeconds: (weekIdx, dayIdx, seconds) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].warmupRestSeconds = seconds
          return { userProtocol: p }
        })
        scheduleSyncSection('userProtocol', get)
      },

      setDayFeederRestSeconds: (weekIdx, dayIdx, seconds) => {
        set(state => {
          const p = JSON.parse(JSON.stringify(state.userProtocol))
          p.weeks[weekIdx].days[dayIdx].feederRestSeconds = seconds
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

      // ── active workout session ────────────────────────────────────────────────
      activeWorkout: null,

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
        const { weekIdx, dayIdx, steps, exerciseWeights, setResults } = activeWorkout

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
          if (step.type === 'WARMUP') {
            exerciseMap[key].warmups.push({
              reps: result?.reps || 0,
              kg: round25((exerciseWeights[key] || 0) * step.pct),
            })
          } else if (step.type === 'FEEDER') {
            exerciseMap[key].feeders.push({
              reps: result?.reps || 0,
              kg: round25((exerciseWeights[key] || 0) * step.pct),
            })
          } else if (step.type === 'WORKING_SET') {
            exerciseMap[key].sets.push({
              setType: step.setDef?.type || 'NORMAL',
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
        set({ activeWorkout: null })
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
        restTimer:       state.restTimer,
        exerciseHistory: state.exerciseHistory,
        savedExercises:  state.savedExercises,
        // _viewerSnapshot nunca persiste — só existe em memória
      }),
    }
  )
)
