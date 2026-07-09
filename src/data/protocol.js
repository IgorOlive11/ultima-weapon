// rirRange: { min, max } — reps na reserva, numérico, derivado do texto de subtitle/rir.
// GER 11-13 descrevem estados além da falha e não têm número no texto original: min/max
// ficam null de propósito (não inventado) — a UI cai pro texto livre nesses casos.
export const GER_CONFIG = {
  7:  { label: 'GER 7',  title: 'POSSO BRINCAR PAPAIZÃO',         subtitle: '4-6 reps na reserva',         rir: '4-6 reps da falha',                 face: 'ger7',  rirRange: { min: 4, max: 6 } },
  8:  { label: 'GER 8',  title: 'NÃO QUERO ME MACHUCAR',          subtitle: '2-3 reps na reserva',         rir: '2-3 reps da falha',                 face: 'ger8',  rirRange: { min: 2, max: 3 } },
  9:  { label: 'GER 9',  title: 'EU SOU MUITO NOVO PRA MORRER',   subtitle: '1 rep na reserva',            rir: '1 rep da falha',                    face: 'ger9',  rirRange: { min: 1, max: 1 } },
  10: { label: 'GER 10', title: 'QUEBREI MINHA LINHA',            subtitle: 'falha com forma perfeita',    rir: '0 reps da falha',                   face: 'ger10', rirRange: { min: 0, max: 0 } },
  11: { label: 'GER 11', title: 'SADOMASOQUISTA',                  subtitle: 'falha após perder a forma',   rir: 'falha após perder a forma',         face: 'ger11', rirRange: { min: null, max: null } },
  12: { label: 'GER 12', title: 'VIOLÊNCIA GRATUITA',             subtitle: 'ajuda e técnicas além falha', rir: 'além da falha com ajuda/técnicas',   face: 'ger12', rirRange: { min: null, max: null } },
  13: { label: 'GER 13', title: 'EU SOU REINCARNAÇÃO DO LUCIFER', subtitle: 'widowmaker territory',        rir: 'além da falha extrema',             face: 'ger13', rirRange: { min: null, max: null } },
}

export const SET_TYPES = {
  NORMAL:       { label: 'SÉRIE NORMAL',        color: '#39FF14', ger: 9  },
  REST_PAUSE:   { label: 'DC STYLE REST PAUSE', color: '#ff6600', ger: 12 },
  MUSCLE_ROUND: { label: 'MUSCLE ROUND',        color: '#ff2222', ger: 11 },
  WIDOWMAKER:   { label: 'DC STYLE WIDOWMAKER', color: '#ffdd00', ger: 13 },
  PULSE:        { label: 'DC STYLE PULSE SET',  color: '#ff44ff', ger: 9  },
}

export const SET_TYPE_DESCRIPTIONS = {
  NORMAL:
    'Carga pra atingir o ponto de falha dentro do rep range indicado.',
  REST_PAUSE:
    'Carga pra 8 reps. Pausa 20s após falha, mais reps, pausa 20s, falha de novo. Quando chegar 10-11 reps no primeiro bloco, progredir carga.',
  MUSCLE_ROUND:
    'Blocos de 4 reps com carga pra 10-12. Descansa 10s entre blocos até falhar 1x.',
  WIDOWMAKER:
    'Carga pra falha total em 10-12 reps. Continua até 15-20 reps sem soltar a barra ou fechar a máquina.',
  PULSE:
    '5 reps completas, 5 pulsos parciais, 4 reps, 5 pulsos, 3 reps, 5 pulsos, 2 reps, 5 pulsos, 1 rep, pulsos até a falha.',
}

export const JS_DAY_TO_IDX = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }
export const DAY_NAMES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

export const MUSCLE_GROUP_LIST = [
  'COSTAS', 'PEITO', 'OMBROS', 'TRÍCEPS', 'BÍCEPS',
  'GLÚTEOS', 'POSTERIOR', 'QUADRÍCEPS', 'ISQUIOS', 'PANTURRILHA',
  'CORE', 'OUTRO',
]

// Incremento mínimo montável em kg na maioria das academias (ajuste por equipamento)
export const MIN_PLATE_INCREMENT = 5

// Ramp alvo por número de feeders: pct crescente, reps decrescentes
// Estreante:   warmups 50×8 / 65×6  → feeders 70×5 / 75×4 / 80×3  (sequência 50/65/70/75/80, reps 8/6/5/4/3)
// Acessório:   warmup  60×6         → feeders 70×5 / 78×3          (sequência 60/70/78,       reps 6/5/3)
// Já primário: (sem warmup)         → feeder  75×4                  (1 só, sem sequência)
const FEEDER_RAMPS = {
  3: [{ pct: 0.70, reps: '5' }, { pct: 0.75, reps: '4' }, { pct: 0.80, reps: '3' }],
  2: [{ pct: 0.70, reps: '5' }, { pct: 0.78, reps: '3' }],
  1: [{ pct: 0.75, reps: '4' }],
}

// Default protocol template for 8 weeks × 7 days
export function defaultUserProtocol() {
  return {
    weeks: Array(8).fill(null).map(() => ({
      days: Array(7).fill(null).map(() => ({
        isRest: false,
        restSeconds: 120,
        warmupRestSeconds: 60,
        feederRestSeconds: 60,
        exercises: [],
      })),
    })),
  }
}

// Returns the question to calibrate working weight for a given set definition
export function getWeightQuestion(setDef) {
  if (!setDef) return 'Qual será o peso de trabalho para este exercício?'
  const { type, repRange, ger } = setDef
  switch (type) {
    case 'NORMAL': {
      const reps = repRange || '8-12'
      const maxReps = reps.split('-').pop()
      if (ger <= 9)  return `Com que peso você faz ${reps} reps deixando 1 rep na reserva?`
      if (ger === 10) return `Com que peso você faz ${reps} reps indo até a falha?`
      return `Com que peso você faria ${maxReps} reps além da falha (GER ${ger})?`
    }
    case 'REST_PAUSE':
      return 'Com que peso você faria ~8 reps chegando perto da falha total (GER 12)?'
    case 'MUSCLE_ROUND':
      return 'Com que peso você normalmente falharia em 10-12 reps (GER 11)?'
    case 'WIDOWMAKER':
      return 'Com que peso você chegaria na falha TOTAL em 10-12 reps (GER 13)?'
    case 'PULSE':
      return 'Com que peso você completaria a sequência completa de pulsos até a falha?'
    default:
      return 'Qual será o peso de trabalho para este exercício?'
  }
}

// Estado do músculo no momento em que o exercício é montado — determina quantos
// warmups/feeders (hoje) ou quantas séries de rampa (depois da unificação) o
// exercício recebe. Detecção preservada exatamente como estava.
export function detectMuscleState(primaryIdx, hasBeenAccessory) {
  if (primaryIdx === 0 && !hasBeenAccessory) return 'estreante'
  if (primaryIdx === 0 && hasBeenAccessory)  return 'pre_ativado'
  return 'ja_primario'
}

// Extração pura do bloco que gerava warmups+feeders (era buildWorkoutSteps:121-157).
// NENHUMA mudança de comportamento nesta extração — mesmo shape de saída de hoje
// (listas separadas de warmup/feeder, com pct+reps, sem exerciseId/type/exerciseName,
// que o caller já adiciona). Isolado assim dá pra trocar só o CONTEÚDO da rampa depois
// sem mexer em buildWorkoutSteps de novo.
export function buildPrepRamp(state) {
  const warmups = []
  const feeders = []

  if (state === 'estreante') {
    // ramp 2 sets: 50%×8 → 65%×6 (antecede feeders 70×5 / 75×4 / 80×3)
    warmups.push({ setNum: 1, totalSets: 2, pct: 0.50, reps: '8' })
    warmups.push({ setNum: 2, totalSets: 2, pct: 0.65, reps: '6' })
  } else if (state === 'pre_ativado') {
    // 1 warmup em 60%×6 (antecede feeders 70×5 / 78×3)
    warmups.push({ setNum: 1, totalSets: 1, pct: 0.60, reps: '6' })
  }
  // 'ja_primario': sem warmup

  let feederCount = state === 'estreante' ? 3 : state === 'pre_ativado' ? 2 : 1
  feederCount = Math.max(1, feederCount) // piso inegociável — nenhum exercício sem prep
  FEEDER_RAMPS[feederCount].forEach((slot, i) => {
    feeders.push({ setNum: i + 1, totalSets: feederCount, pct: slot.pct, reps: slot.reps, gerTarget: 7 })
  })

  return { warmups, feeders }
}

// Build the ordered step list for an active workout session
export function buildWorkoutSteps(exercises) {
  if (!exercises || exercises.length === 0) return []

  const steps = []
  const primaryMuscleSeen = {}
  const accessoryMuscleSeen = new Set()

  exercises.forEach((exercise, exIdx) => {
    const muscle = exercise.muscle || 'OUTRO'
    const accessory = exercise.accessoryMuscle || null

    const primaryIdx = primaryMuscleSeen[muscle] ?? 0
    primaryMuscleSeen[muscle] = primaryIdx + 1

    const firstSet = exercise.sets?.[0] || { type: 'NORMAL', ger: 10, repRange: '8-12' }

    steps.push({
      type: 'WEIGHT_QUESTION',
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscle,
      setDef: firstSet,
    })

    // Estado do músculo usa primaryIdx (pré-incremento) e accessoryMuscleSeen antes do add(accessory)
    const state = detectMuscleState(primaryIdx, accessoryMuscleSeen.has(muscle))
    const { warmups, feeders } = buildPrepRamp(state)

    warmups.forEach(w => steps.push({ type: 'WARMUP', exerciseId: exercise.id, exerciseName: exercise.name, ...w }))
    feeders.forEach(f => steps.push({ type: 'FEEDER', exerciseId: exercise.id, exerciseName: exercise.name, ...f }))

    // Register accessory muscle for subsequent exercises
    if (accessory) accessoryMuscleSeen.add(accessory)

    ;(exercise.sets || []).forEach((setDef, setIdx) => {
      steps.push({
        type: 'WORKING_SET',
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscle,
        setDef,
        setNum: setIdx + 1,
        totalSets: exercise.sets.length,
      })
    })
  })

  return steps
}
