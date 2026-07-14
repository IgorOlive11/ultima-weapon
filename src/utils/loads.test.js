import { describe, it, expect } from 'vitest'
import { round25, round5, fmtKg, calcLoads, getTopGer } from './loads'

// Testes de caracterização — descrevem o comportamento ATUAL, não o "correto".
// Se algum caso aqui parecer um bug, não conserta junto: anota e decide à parte.

describe('round25', () => {
  it('arredonda pro múltiplo de 2.5 mais próximo', () => {
    expect(round25(101)).toBe(100)
    expect(round25(103.75)).toBe(105)
  })

  it('não mexe em valor já múltiplo de 2.5', () => {
    expect(round25(102.5)).toBe(102.5)
  })

  it('.5 arredonda pra cima (Math.round nativo)', () => {
    // 41.5 -> 42 (não 40) — documenta o comportamento de Math.round, não um round-to-even
    expect(round25(103.75)).toBe(105)
  })
})

describe('round5', () => {
  it('arredonda pro múltiplo de 5 mais próximo', () => {
    expect(round5(102)).toBe(100)
    expect(round5(107.5)).toBe(110)
  })
})

describe('fmtKg', () => {
  it('retorna travessão pra valores vazios/zero/negativos', () => {
    expect(fmtKg(0)).toBe('—')
    expect(fmtKg(-5)).toBe('—')
    expect(fmtKg(null)).toBe('—')
    expect(fmtKg(undefined)).toBe('—')
  })

  it('formata kg arredondado pro múltiplo de 2.5 com sufixo KG', () => {
    expect(fmtKg(100)).toBe('100KG')
    expect(fmtKg(101)).toBe('100KG') // arredonda antes de formatar
  })
})

describe('calcLoads', () => {
  it('retorna null pra valores vazios/zero/negativos', () => {
    expect(calcLoads(0)).toBeNull()
    expect(calcLoads(null)).toBeNull()
    expect(calcLoads(-10)).toBeNull()
  })

  it('calcula warmup/feeders/top como percentuais do top set, arredondados', () => {
    expect(calcLoads(100)).toEqual({
      warmup: 45, feeder1: 70, feeder2: 75, feeder3: 80, top: 100,
    })
  })

  it('arredonda cada percentual individualmente (não o valor final só)', () => {
    expect(calcLoads(83)).toEqual({
      warmup: 37.5, feeder1: 57.5, feeder2: 62.5, feeder3: 67.5, top: 82.5,
    })
  })
})

describe('getTopGer', () => {
  it('retorna o ger da ÚLTIMA série do exercício', () => {
    expect(getTopGer({ sets: [{ ger: 8 }, { ger: 10 }, { ger: 12 }] })).toBe(12)
    expect(getTopGer({ sets: [{ ger: 9 }] })).toBe(9)
  })
})
