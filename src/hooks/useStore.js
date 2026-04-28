import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JS_DAY_TO_IDX } from '../data/protocol'
import { timerManager } from '../utils/timerManager'

function detectWeekDay() {
  const saved = localStorage.getItem('uw_start_date')
  if (!saved) {
    localStorage.setItem('uw_start_date', new Date().toISOString().split('T')[0])
    return { week: 0, day: 0 }
  }
  const start = new Date(saved)
  const now = new Date()
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  const weekIdx = Math.min(Math.floor(diffDays / 7), 7)
  const dayIdx = JS_DAY_TO_IDX[now.getDay()] ?? 0
  return { week: weekIdx, day: dayIdx }
}

const { week: initWeek, day: initDay } = detectWeekDay()

export const useStore = create(
  persist(
    (set, get) => ({
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

      startDate: localStorage.getItem('uw_start_date') || new Date().toISOString().split('T')[0],
      setStartDate: (date) => {
        localStorage.setItem('uw_start_date', date)
        const { week, day } = detectWeekDay()
        set({ startDate: date, currentWeek: week, currentDay: day })
      },

      // --- rest timer ---
      restTimer: { running: false, seconds: 120, preset: 120 },

      startRestTimer: (seconds) => {
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

      // --- user profile ---
      userProfile: {
        weight: 80,
        height: 183,
        age: 21,
        sex: 'M',
        workoutTime: '16:30',
        sleepTime: '23:00',
        caloricGoal: 'bulk',
        activityLevel: 1.55,
      },
      setUserProfile: (updates) => set(state => ({
        userProfile: { ...state.userProfile, ...updates }
      })),

      // --- food log ---
      foodLog: {},
      microLog: {},

      addFoodEntry: (dateStr, entry) => set(state => ({
        foodLog: {
          ...state.foodLog,
          [dateStr]: [
            ...(state.foodLog[dateStr] || []),
            { ...entry, id: Date.now(), addedAt: new Date().toISOString() },
          ],
        },
      })),

      removeFoodEntry: (dateStr, id) => set(state => ({
        foodLog: {
          ...state.foodLog,
          [dateStr]: (state.foodLog[dateStr] || []).filter(e => e.id !== id),
        },
      })),

      toggleMicro: (dateStr, microId) => set(state => ({
        microLog: {
          ...state.microLog,
          [dateStr]: {
            ...(state.microLog[dateStr] || {}),
            [microId]: !(state.microLog[dateStr]?.[microId]),
          },
        },
      })),
    }),
    {
      name: 'uw-store-v2',
      partialize: (state) => ({
        logs:        state.logs,
        userProfile: state.userProfile,
        foodLog:     state.foodLog,
        microLog:    state.microLog,
      }),
    }
  )
)
