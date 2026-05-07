export function round25(v) {
  return Math.round(v / 2.5) * 2.5
}

export function round5(v) {
  return Math.round(v / 5) * 5
}

export function fmtKg(v) {
  if (!v || v <= 0) return '—'
  return `${round25(v)}KG`
}

export function calcLoads(topKg) {
  if (!topKg || topKg <= 0) return null
  return {
    warmup:  round25(topKg * 0.45),
    feeder1: round25(topKg * 0.70),
    feeder2: round25(topKg * 0.75),
    feeder3: round25(topKg * 0.80),
    top:     round25(topKg),
  }
}

export function getTopGer(exercise) {
  return exercise.sets[exercise.sets.length - 1].ger
}
