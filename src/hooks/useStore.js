import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JS_DAY_TO_IDX, defaultUserProtocol, buildWorkoutSteps } from '../data/protocol'
import { timerManager } from '../utils/timerManager'

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
      restTimer: { running: false, seconds: 120, preset: 120 },

      startRestTimer: (seconds) => {
        timerManager.clear()
        set(state => ({ restTimer: { ...state.restTimer, running: true, preset: seconds, seconds } }))
        timerManager.start(
          seconds,
          (s) => set(state => ({ restTimer: { ...state.restTimer, running: true, seconds: s } })),
          () => {
            set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: 0 } }))
            if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          }
        )
      },

      stopRestTimer: () => {
        timerManager.clear()
        set(state => ({ restTimer: { ...state.restTimer, running: false } }))
      },

      resetRestTimer: (seconds) => {
        timerManager.clear()
        const s = seconds ?? get().restTimer.preset
        set(state => ({ restTimer: { ...state.restTimer, running: false, seconds: s, preset: s } }))
      },

      // ── user profile ─────────────────────────────────────────────────────────
      userProfile: {
        weight:       80,
        height:       183,
        age:          21,
        sex:          'M',
        workoutTime:  '16:30',
        sleepTime:    '23:00',
        caloricGoal:  'bulk',
        activityLevel: 1.55,
      },
      setUserProfile: (updates) => set(state => ({
        userProfile: { ...state.userProfile, ...updates }
      })),

      // ── micronutrient log ────────────────────────────────────────────────────
      microLog: {},
      toggleMicro: (dateStr, microId) => set(state => ({
        microLog: {
          ...state.microLog,
          [dateStr]: {
            ...(state.microLog[dateStr] || {}),
            [microId]: !(state.microLog[dateStr]?.[microId]),
          },
        },
      })),

      // ── meal log (marked meals) ──────────────────────────────────────────────
      mealLog: {},
      toggleMeal: (dateStr, mealId) => set(state => ({
        mealLog: {
          ...state.mealLog,
          [dateStr]: {
            ...(state.mealLog[dateStr] || {}),
            [mealId]: !(state.mealLog[dateStr]?.[mealId]),
          },
        },
      })),

      // ── user protocol (8-week custom plan) ───────────────────────────────────
      userProtocol: defaultUserProtocol(),

      setDayRest: (weekIdx, dayIdx, isRest) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        p.weeks[weekIdx].days[dayIdx].isRest = isRest
        return { userProtocol: p }
      }),

      setDayRestSeconds: (weekIdx, dayIdx, seconds) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        p.weeks[weekIdx].days[dayIdx].restSeconds = seconds
        return { userProtocol: p }
      }),

      addExercise: (weekIdx, dayIdx, exercise) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        p.weeks[weekIdx].days[dayIdx].exercises.push({ id: genId(), sets: [], ...exercise })
        return { userProtocol: p }
      }),

      updateExercise: (weekIdx, dayIdx, exId, updates) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        const day = p.weeks[weekIdx].days[dayIdx]
        day.exercises = day.exercises.map(e => e.id === exId ? { ...e, ...updates } : e)
        return { userProtocol: p }
      }),

      removeExercise: (weekIdx, dayIdx, exId) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        const day = p.weeks[weekIdx].days[dayIdx]
        day.exercises = day.exercises.filter(e => e.id !== exId)
        return { userProtocol: p }
      }),

      addSet: (weekIdx, dayIdx, exId, setDef) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        const day = p.weeks[weekIdx].days[dayIdx]
        day.exercises = day.exercises.map(e =>
          e.id === exId
            ? { ...e, sets: [...e.sets, { id: genId(), ...setDef }] }
            : e
        )
        return { userProtocol: p }
      }),

      removeSet: (weekIdx, dayIdx, exId, setId) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        const day = p.weeks[weekIdx].days[dayIdx]
        day.exercises = day.exercises.map(e =>
          e.id === exId
            ? { ...e, sets: e.sets.filter(s => s.id !== setId) }
            : e
        )
        return { userProtocol: p }
      }),

      reorderExercises: (weekIdx, dayIdx, exercises) => set(state => {
        const p = JSON.parse(JSON.stringify(state.userProtocol))
        p.weeks[weekIdx].days[dayIdx].exercises = exercises
        return { userProtocol: p }
      }),

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
        const { activeWorkout, saveLog } = get()
        if (!activeWorkout) return
        const { weekIdx, dayIdx, steps, exerciseWeights, setResults } = activeWorkout
        // Build a per-exercise log entry
        const exerciseMap = {}
        steps.forEach((step, idx) => {
          if (step.type !== 'WORKING_SET') return
          const key = step.exerciseId
          if (!exerciseMap[key]) exerciseMap[key] = { name: step.exerciseName, sets: [], kg: exerciseWeights[key] || 0 }
          exerciseMap[key].sets.push(setResults[`${idx}`] || { kg: exerciseWeights[key] || 0 })
        })
        const day = get().userProtocol.weeks[weekIdx].days[dayIdx]
        ;(day.exercises || []).forEach((ex, exIdx) => {
          if (exerciseMap[ex.id]) {
            saveLog(weekIdx, dayIdx, exIdx, exerciseMap[ex.id])
          }
        })
        set({ activeWorkout: null })
      },

      abandonWorkout: () => set({ activeWorkout: null }),
    }),
    {
      name: 'uw-store-v3',
      partialize: (state) => ({
        logs:          state.logs,
        userProfile:   state.userProfile,
        microLog:      state.microLog,
        mealLog:       state.mealLog,
        userProtocol:  state.userProtocol,
        activeWorkout: state.activeWorkout,
      }),
    }
  )
)
