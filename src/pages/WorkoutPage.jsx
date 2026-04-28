import React, { useMemo } from 'react'
import { useStore } from '../hooks/useStore'
import { PROTOCOL, MUSCLE_GROUPS } from '../data/protocol'
import ExerciseCard from '../components/ExerciseCard'
import MuscleRoundCard from '../components/MuscleRoundCard'

const PHASE_COLORS = {
  REVOLUME: '#39FF14', BASE: '#ffaa00', PEAK: '#ff2d2d',
  DEVOLUME: '#00aaff', DELOAD: '#888',
}

// Assign muscle group index per exercise for feeder set count logic
function tagExercises(exercises) {
  const groupMap = {}
  return exercises.map((ex) => {
    const group = MUSCLE_GROUPS[ex.name] || ex.name
    if (groupMap[group] === undefined) groupMap[group] = 0
    const idx = groupMap[group]
    groupMap[group]++
    return { ...ex, muscleGroup: group, muscleGroupIdx: idx }
  })
}

// Group tagged exercises by muscle group preserving order
function groupByMuscle(taggedExercises) {
  const groups = []
  const seen = new Set()
  taggedExercises.forEach((ex) => {
    if (!seen.has(ex.muscleGroup)) {
      seen.add(ex.muscleGroup)
      groups.push({ label: ex.muscleGroup, exercises: [] })
    }
    groups[groups.length - 1].exercises.push(ex)
  })
  return groups
}

export default function WorkoutPage() {
  const currentWeek = useStore((s) => s.currentWeek)
  const currentDay  = useStore((s) => s.currentDay)
  const setWeek     = useStore((s) => s.setWeek)
  const setDay      = useStore((s) => s.setDay)
  const saveLog     = useStore((s) => s.saveLog)
  const getLog      = useStore((s) => s.getLog)

  const week = PROTOCOL[currentWeek]
  const day  = week?.days[currentDay]
  const phaseColor = PHASE_COLORS[week?.phase] || '#39FF14'

  const tagged = useMemo(
    () => (day?.exercises ? tagExercises(day.exercises) : []),
    [day]
  )
  const groups = useMemo(() => groupByMuscle(tagged), [tagged])

  const loggedCount = tagged.filter((_, i) => !!getLog(currentWeek, currentDay, i)?.kg).length
  const total = tagged.length

  // find the original index in the day.exercises array for each tagged exercise
  const exIndexMap = useMemo(() => {
    const map = {}
    tagged.forEach((ex, i) => { map[`${ex.muscleGroup}-${ex.muscleGroupIdx}`] = i })
    return map
  }, [tagged])

  return (
    <div className="p-3 pb-8">
      {/* Week selector */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
        {PROTOCOL.map((w, i) => (
          <button
            key={i}
            onClick={() => setWeek(i)}
            className={`flex-shrink-0 px-2.5 py-1 font-display text-[13px] tracking-wider border transition-all
              ${i === currentWeek
                ? 'text-bg border-transparent'
                : 'bg-s2 border-border2 text-muted hover:text-ink'
              }`}
            style={i === currentWeek ? { background: phaseColor } : {}}
          >
            S{String(w.num).padStart(2, '0')}
          </button>
        ))}
      </div>

      {/* Day selector */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-none">
        {week.days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDay(i)}
            className={`flex-shrink-0 px-3 py-1.5 font-body font-bold text-xs tracking-wider border transition-all
              ${i === currentDay
                ? 'text-bg border-transparent'
                : d.rest
                ? 'bg-s2 border-border2 border-dashed text-muted/40'
                : 'bg-s2 border-border2 text-muted hover:text-ink'
              }`}
            style={i === currentDay ? { background: phaseColor } : {}}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Phase banner */}
      <div
        className="flex items-center gap-3 bg-s2 border border-border1 px-3 py-2 mb-4"
        style={{ borderLeftWidth: 3, borderLeftColor: phaseColor }}
      >
        <div className="font-display text-[13px] tracking-[0.15em]" style={{ color: phaseColor }}>
          SEMANA {week.num} — {week.phase}
        </div>
        {!day?.rest && total > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted">{loggedCount}/{total}</span>
            <div className="w-16 h-[2px] bg-border1">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(loggedCount / total) * 100}%`, background: phaseColor }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Rest day */}
      {day?.rest && (
        <div className="text-center py-16">
          <div className="font-display text-6xl neon-glow tracking-[0.3em] leading-none" style={{ color: phaseColor }}>
            DESCANSO
          </div>
          <div className="font-mono text-[11px] text-muted tracking-[0.25em] mt-4 uppercase">
            Recupere-se. Cresça.
          </div>
        </div>
      )}

      {/* Exercise groups */}
      {!day?.rest && groups.map((group) => (
        <div key={group.label} className="mb-2">
          {/* Muscle group label */}
          <div className="section-label mb-2" style={{ color: '#555' }}>
            {group.label}
          </div>

          {group.exercises.map((ex) => {
            const exIdx = exIndexMap[`${ex.muscleGroup}-${ex.muscleGroupIdx}`]
            const log   = getLog(currentWeek, currentDay, exIdx)

            if (ex.type === 'MUSCLE_ROUND') {
              return (
                <MuscleRoundCard
                  key={exIdx}
                  exercise={ex}
                  weekIdx={currentWeek}
                  dayIdx={currentDay}
                  exIdx={exIdx}
                  savedLog={log}
                  isFirst={ex.muscleGroupIdx === 0}
                  onSave={(entry) => saveLog(currentWeek, currentDay, exIdx, entry)}
                />
              )
            }

            return (
              <ExerciseCard
                key={exIdx}
                exercise={ex}
                weekIdx={currentWeek}
                dayIdx={currentDay}
                exIdx={exIdx}
                savedLog={log}
                muscleGroupIdx={ex.muscleGroupIdx}
                onSave={(entry) => saveLog(currentWeek, currentDay, exIdx, entry)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
