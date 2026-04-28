// Round to nearest 2.5kg
export function round25(v) {
  return Math.round(v / 2.5) * 2.5
}

// Format kg value
export function fmtKg(v) {
  if (!v || v <= 0) return '—'
  const r = round25(v)
  return r % 1 === 0 ? `${r}KG` : `${r}KG`
}

// Given a top set weight, compute all derived loads
export function calcLoads(topKg) {
  if (!topKg || topKg <= 0) return null
  return {
    warmup:  round25(topKg * 0.45),  // 45% — aquecimento 15-20 reps
    feeder1: round25(topKg * 0.70),  // 70%
    feeder2: round25(topKg * 0.75),  // 75%
    feeder3: round25(topKg * 0.80),  // 80%
    backoff: round25(topKg * 0.75),  // 75% (mid of 70-80%) — backoff to failure
    top:     round25(topKg),
  }
}

// How many feeder sets before this exercise?
// Rule: 2-3 feeders before 1st and 2nd exercise of each muscle group
//       1 feeder before subsequent exercises
export function numFeeders(exIndexInMuscleGroup) {
  if (exIndexInMuscleGroup === 0) return 3
  if (exIndexInMuscleGroup === 1) return 2
  return 1
}
