import { describe, it, expect } from 'vitest'
import { parseProtocolCsv } from './protocolCsv'

// Testes de caracterização — descrevem o comportamento ATUAL, não o "correto".
// Se algum caso aqui parecer um bug, não conserta junto: anota e decide à parte.

const HEADER_ROW = 'semana,dia,descanso_seg,prep_seg,dia_descanso,exercicio,musculo,tipo_serie,ger,rep_range,musculo_acessorio,prep_override,biblioteca_id,apelido_pt'

describe('parseProtocolCsv — CSV válido', () => {
  it('monta exercício com múltiplas séries (mesma linha de exercício repetida) e dia de descanso', () => {
    const csv = [
      HEADER_ROW,
      '1,1,120,40,N,Supino Reto,PEITO,NORMAL,10,8-12,,,,',
      '1,1,120,40,N,Supino Reto,PEITO,NORMAL,10,8-12,,,,',
      '1,2,,,S,,,,,,,,,',
    ].join('\n')

    const protocol = parseProtocolCsv(csv)

    expect(protocol.totalWeeks).toBe(1) // maior "semana" usada no CSV
    expect(protocol.weeks).toHaveLength(1)

    const day1 = protocol.weeks[0].days[0]
    expect(day1.isRest).toBe(false)
    expect(day1.restSeconds).toBe(120)
    expect(day1.prepRestSeconds).toBe(40)
    expect(day1.exercises).toHaveLength(1)
    expect(day1.exercises[0].name).toBe('Supino Reto')
    expect(day1.exercises[0].muscle).toBe('PEITO')
    expect(day1.exercises[0].sets).toHaveLength(2) // 2 linhas = 2 séries do mesmo exercício

    const day2 = protocol.weeks[0].days[1]
    expect(day2.isRest).toBe(true)
  })

  it('total de semanas cresce pra caber a maior "semana" usada, não fica travado em 8', () => {
    const csv = [HEADER_ROW, '12,1,120,40,N,Agachamento,QUADRÍCEPS,NORMAL,10,8-12,,,,'].join('\n')
    const protocol = parseProtocolCsv(csv)
    expect(protocol.totalWeeks).toBe(12)
    expect(protocol.weeks).toHaveLength(12)
  })

  it('musculo_acessorio, biblioteca_id e apelido_pt só entram no exercício quando preenchidos', () => {
    const withExtras = parseProtocolCsv([
      HEADER_ROW,
      '1,1,120,40,N,Supino Reto,PEITO,NORMAL,10,8-12,TRÍCEPS,2,abc123,Supino',
    ].join('\n'))
    const ex = withExtras.weeks[0].days[0].exercises[0]
    expect(ex.accessoryMuscle).toBe('TRÍCEPS')
    expect(ex.prepSetsOverride).toBe(2)
    expect(ex.libraryId).toBe('abc123')
    expect(ex.namePt).toBe('Supino')

    const withoutExtras = parseProtocolCsv([
      HEADER_ROW,
      '1,1,120,40,N,Supino Reto,PEITO,NORMAL,10,8-12,,,,',
    ].join('\n'))
    const ex2 = withoutExtras.weeks[0].days[0].exercises[0]
    expect(ex2.accessoryMuscle).toBeUndefined()
    expect(ex2.prepSetsOverride).toBeUndefined()
    expect(ex2.libraryId).toBeUndefined()
    expect(ex2.namePt).toBeUndefined()
  })

  it('musculo/tipo_serie/ger caem pro default quando a célula vem vazia', () => {
    const csv = [HEADER_ROW, '1,1,120,40,N,Exercicio Livre,,,,,,,,'].join('\n')
    const ex = parseProtocolCsv(csv).weeks[0].days[0].exercises[0]
    expect(ex.muscle).toBe('OUTRO')
    expect(ex.sets[0].type).toBe('NORMAL')
    expect(ex.sets[0].ger).toBe(10)
  })
})

describe('parseProtocolCsv — CSV inválido', () => {
  it('lança erro se faltar coluna obrigatória (semana/dia/exercicio)', () => {
    const csvSemExercicio = 'semana,dia,musculo\n1,1,PEITO'
    expect(() => parseProtocolCsv(csvSemExercicio)).toThrow(/obrigatórias ausentes/)
  })

  it('lança erro se o CSV não tiver nem cabeçalho nem linha de dado', () => {
    expect(() => parseProtocolCsv('só uma linha')).toThrow(/vazio ou inválido/)
  })

  it('ignora silenciosamente linha com semana/dia fora do range válido (1-52 semanas, 1-7 dias)', () => {
    const csv = [
      HEADER_ROW,
      '0,1,120,40,N,Exercicio,PEITO,NORMAL,10,8-12,,,,',   // semana 0 inválida
      '1,8,120,40,N,Exercicio,PEITO,NORMAL,10,8-12,,,,',   // dia 8 inválido
      '1,1,120,40,N,Exercicio Valido,PEITO,NORMAL,10,8-12,,,,',
    ].join('\n')
    const protocol = parseProtocolCsv(csv)
    // só a linha válida (semana 1, dia 1) deveria ter virado exercício
    const totalExercises = protocol.weeks.flatMap(w => w.days).flatMap(d => d.exercises)
    expect(totalExercises).toHaveLength(1)
    expect(totalExercises[0].name).toBe('Exercicio Valido')
  })
})
