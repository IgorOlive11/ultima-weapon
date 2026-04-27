import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JS_DAY_TO_IDX } from '../data/protocol'

// Detect current week based on start date saved in localStorage
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
      // Navigation
      currentWeek: initWeek,
      currentDay: initDay,
      activeTab: 'workout',

      setWeek: (week) => set({ currentWeek: week, currentDay: 0 }),
      setDay: (day) => set({ currentDay: day }),
      setTab: (tab) => set({ activeTab: tab }),

      // Log: { [key]: { kg, reps, obs, date, sets: [{kg, reps}] } }
      logs: {},

      getLogKey: (weekIdx, dayIdx, exIdx) =>
        `w${weekIdx}_d${dayIdx}_e${exIdx}`,

      saveLog: (weekIdx, dayIdx, exIdx, entry) => {
        const key = `w${weekIdx}_d${dayIdx}_e${exIdx}`
        const existing = get().logs[key] || {}
        const newEntry = {
          ...existing,
          ...entry,
          date: new Date().toISOString(),
          history: [
            ...(existing.history || []),
            { ...entry, date: new Date().toISOString() },
          ].slice(-10), // keep last 10
        }
        set((state) => ({ logs: { ...state.logs, [key]: newEntry } }))
      },

      getLog: (weekIdx, dayIdx, exIdx) => {
        const key = `w${weekIdx}_d${dayIdx}_e${exIdx}`
        return get().logs[key] || null
      },

      clearAllLogs: () => set({ logs: {} }),

      // Start date management
      startDate: localStorage.getItem('uw_start_date') || new Date().toISOString().split('T')[0],
      setStartDate: (date) => {
        localStorage.setItem('uw_start_date', date)
        const { week, day } = detectWeekDay()
        set({ startDate: date, currentWeek: week, currentDay: day })
      },
    }),
    {
      name: 'ultima-weapon-store',
      partialize: (state) => ({ logs: state.logs }),
    }
  )
)
