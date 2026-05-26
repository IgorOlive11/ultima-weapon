export const GER_CONFIG = {
  7:  { label: 'GER 7',  title: 'POSSO BRINCAR PAPAIZÃO',         subtitle: '4-6 reps na reserva',         face: 'ger7'  },
  8:  { label: 'GER 8',  title: 'NÃO QUERO ME MACHUCAR',          subtitle: '2-3 reps na reserva',         face: 'ger8'  },
  9:  { label: 'GER 9',  title: 'EU SOU MUITO NOVO PRA MORRER',   subtitle: '1 rep na reserva',            face: 'ger9'  },
  10: { label: 'GER 10', title: 'QUEBREI MINHA LINHA',            subtitle: 'falha com forma perfeita',    face: 'ger10' },
  11: { label: 'GER 11', title: 'SADOMASOQUISTA',                  subtitle: 'falha após perder a forma',   face: 'ger11' },
  12: { label: 'GER 12', title: 'VIOLÊNCIA GRATUITA',             subtitle: 'ajuda e técnicas além falha', face: 'ger12' },
  13: { label: 'GER 13', title: 'EU SOU REINCARNAÇÃO DO LUCIFER', subtitle: 'widowmaker territory',        face: 'ger13' },
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
// Continua o ramp iniciado pelos warmups (50→65→70→75→80→trabalho)
const FEEDER_RAMPS = {
  3: [{ pct: 0.70, reps: '5' }, { pct: 0.75, reps: '4' }, { pct: 0.80, reps: '3' }],
  2: [{ pct: 0.72, reps: '4' }, { pct: 0.78, reps: '3' }],
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

    // Warmup only for first occurrence of each primary muscle
    // Usa primaryIdx (pré-incremento) e accessoryMuscleSeen antes do add(accessory)
    if (primaryIdx === 0) {
      if (accessoryMuscleSeen.has(muscle)) {
        // Pré-ativado como acessório → 1 warmup em 75%×4 (músculo já quente)
        steps.push({ type: 'WARMUP', exerciseId: exercise.id, exerciseName: exercise.name, setNum: 1, totalSets: 1, pct: 0.75, reps: '4' })
      } else {
        // Estreante → ramp 2 sets: 50%×8 → 65%×4 (carga crescente, reps decrescentes)
        steps.push({ type: 'WARMUP', exerciseId: exercise.id, exerciseName: exercise.name, setNum: 1, totalSets: 2, pct: 0.50, reps: '8' })
        steps.push({ type: 'WARMUP', exerciseId: exercise.id, exerciseName: exercise.name, setNum: 2, totalSets: 2, pct: 0.65, reps: '4' })
      }
    }

    // Feeders — ramp progressivo (pct crescente, reps decrescentes) por estado do músculo
    // Usa primaryIdx (pré-incremento) e accessoryMuscleSeen antes do add(accessory)
    let feederCount
    if (primaryIdx === 0 && !accessoryMuscleSeen.has(muscle)) {
      feederCount = 3  // estreante
    } else if (primaryIdx === 0 && accessoryMuscleSeen.has(muscle)) {
      feederCount = 2  // pré-ativado como acessório
    } else {
      feederCount = 1  // já trabalhou como primário
    }
    feederCount = Math.max(1, feederCount)  // piso inegociável — nenhum exercício sem prep
    FEEDER_RAMPS[feederCount].forEach((slot, i) => {
      steps.push({
        type: 'FEEDER',
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setNum: i + 1,
        totalSets: feederCount,
        pct: slot.pct,
        reps: slot.reps,
        gerTarget: 7,
      })
    })

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
