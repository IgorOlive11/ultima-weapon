import { describe, it, expect } from 'vitest'
import {
  GER_CONFIG, detectMuscleState, buildPrepRamp, buildWorkoutSteps,
} from './protocol'

// Testes de caracterização — descrevem o comportamento ATUAL, não o "correto".
// Se algum caso aqui parecer um bug, não conserta junto: anota e decide à parte.

describe('GER_CONFIG', () => {
  it('cobre GER 7 a 13', () => {
    expect(Object.keys(GER_CONFIG).map(Number).sort((a, b) => a - b)).toEqual([7, 8, 9, 10, 11, 12, 13])
  })

  it('GER 10 (falha limpa) tem rirRange {0,0}', () => {
    expect(GER_CONFIG[10].rirRange).toEqual({ min: 0, max: 0 })
  })

  it('GER 11-13 (além da falha) não têm número na fonte — rirRange null/null', () => {
    expect(GER_CONFIG[11].rirRange).toEqual({ min: null, max: null })
    expect(GER_CONFIG[12].rirRange).toEqual({ min: null, max: null })
    expect(GER_CONFIG[13].rirRange).toEqual({ min: null, max: null })
  })
})

describe('detectMuscleState', () => {
  it('primeira vez como primário, sem ter sido acessório antes -> estreante', () => {
    expect(detectMuscleState(0, false)).toBe('estreante')
  })

  it('primeira vez como primário, mas já foi acessório de outro exercício -> pre_ativado', () => {
    expect(detectMuscleState(0, true)).toBe('pre_ativado')
  })

  it('já é primário de novo (2a+ ocorrência) -> ja_primario, independente de accessory', () => {
    expect(detectMuscleState(1, false)).toBe('ja_primario')
    expect(detectMuscleState(1, true)).toBe('ja_primario')
    expect(detectMuscleState(2, false)).toBe('ja_primario')
  })
})

describe('buildPrepRamp', () => {
  it('estreante (automático) -> 3 séries de rampa', () => {
    const { preps } = buildPrepRamp('estreante')
    expect(preps).toHaveLength(3)
    expect(preps.every(p => p.countsForVolume === false)).toBe(true)
    expect(preps.every(p => p.gerTarget === 7)).toBe(true)
    expect(preps.map(p => p.setNum)).toEqual([1, 2, 3])
    expect(preps.every(p => p.totalSets === 3)).toBe(true)
  })

  it('pre_ativado (automático) -> 2 séries de rampa', () => {
    expect(buildPrepRamp('pre_ativado').preps).toHaveLength(2)
  })

  it('ja_primario (automático) -> 1 série de rampa (piso de 1)', () => {
    expect(buildPrepRamp('ja_primario').preps).toHaveLength(1)
  })

  it('override explícito 0 zera a rampa mesmo pra estreante (bypassa o piso de 1)', () => {
    expect(buildPrepRamp('estreante', 0).preps).toHaveLength(0)
  })

  it('override é clampado em [0,3]', () => {
    expect(buildPrepRamp('estreante', 10).preps).toHaveLength(3)  // clamp pra cima
    expect(buildPrepRamp('ja_primario', -5).preps).toHaveLength(0) // clamp pra baixo
  })
})

describe('buildWorkoutSteps', () => {
  it('lista vazia ou nula -> nenhum step', () => {
    expect(buildWorkoutSteps([])).toEqual([])
    expect(buildWorkoutSteps(null)).toEqual([])
  })

  it('monta WEIGHT_QUESTION + rampa de preparo + WORKING_SET por exercício, com o estado do músculo certo', () => {
    const exercises = [
      {
        id: 'e1', name: 'Supino', muscle: 'PEITO', accessoryMuscle: 'TRÍCEPS',
        sets: [
          { type: 'NORMAL', ger: 10, repRange: '8-12' },
          { type: 'NORMAL', ger: 10, repRange: '8-12' },
        ],
      },
      {
        id: 'e2', name: 'Tríceps Testa', muscle: 'TRÍCEPS',
        sets: [{ type: 'NORMAL', ger: 9, repRange: '10-15' }],
      },
      {
        id: 'e3', name: 'Supino Inclinado', muscle: 'PEITO',
        sets: [{ type: 'NORMAL', ger: 11, repRange: '' }],
      },
    ]

    const steps = buildWorkoutSteps(exercises)

    // e1: PEITO, 1a vez, nunca foi acessório -> estreante -> 3 preps + 1 WQ + 2 WORKING_SET = 6
    // e2: TRÍCEPS, 1a vez como primário, mas já foi acessório do e1 -> pre_ativado -> 2 preps + 1 WQ + 1 WORKING_SET = 4
    // e3: PEITO, 2a vez -> ja_primario -> 1 prep + 1 WQ + 1 WORKING_SET = 3
    expect(steps).toHaveLength(6 + 4 + 3)

    const e1Steps = steps.filter(s => s.exerciseId === 'e1')
    expect(e1Steps.filter(s => s.type === 'WEIGHT_QUESTION')).toHaveLength(1)
    expect(e1Steps.filter(s => s.type === 'PREP')).toHaveLength(3)
    expect(e1Steps.filter(s => s.type === 'WORKING_SET')).toHaveLength(2)

    const e2Steps = steps.filter(s => s.exerciseId === 'e2')
    expect(e2Steps.filter(s => s.type === 'PREP')).toHaveLength(2) // pre_ativado

    const e3Steps = steps.filter(s => s.exerciseId === 'e3')
    expect(e3Steps.filter(s => s.type === 'PREP')).toHaveLength(1) // ja_primario

    // ordem: WEIGHT_QUESTION sempre antes das PREP, que vêm antes das WORKING_SET, por exercício
    const e1Types = e1Steps.map(s => s.type)
    expect(e1Types).toEqual(['WEIGHT_QUESTION', 'PREP', 'PREP', 'PREP', 'WORKING_SET', 'WORKING_SET'])

    // WORKING_SET carrega setNum/totalSets corretos
    const e1Working = e1Steps.filter(s => s.type === 'WORKING_SET')
    expect(e1Working.map(s => s.setNum)).toEqual([1, 2])
    expect(e1Working.every(s => s.totalSets === 2)).toBe(true)

    // muscle e nome/namePt/libraryId propagam pro step
    expect(steps[0].muscle).toBe('PEITO')
    expect(steps[0].exerciseName).toBe('Supino')
    expect(steps[0].exerciseNamePt).toBeNull()
    expect(steps[0].exerciseLibraryId).toBeNull()
  })

  it('prepSetsOverride no exercício trava a rampa independente do estado detectado', () => {
    const exercises = [
      { id: 'e1', name: 'Supino', muscle: 'PEITO', prepSetsOverride: 0, sets: [{ type: 'NORMAL', ger: 10, repRange: '8-12' }] },
    ]
    const steps = buildWorkoutSteps(exercises)
    expect(steps.filter(s => s.type === 'PREP')).toHaveLength(0) // estreante normalmente daria 3, override 0 zera
  })

  it('exercício sem sets ainda gera WEIGHT_QUESTION com setDef default (NORMAL/GER10/8-12)', () => {
    const steps = buildWorkoutSteps([{ id: 'e1', name: 'Supino', muscle: 'PEITO', sets: [] }])
    const wq = steps.find(s => s.type === 'WEIGHT_QUESTION')
    expect(wq.setDef).toEqual({ type: 'NORMAL', ger: 10, repRange: '8-12' })
  })
})
