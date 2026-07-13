// Adapter de fonte de dados de exercícios. A UI (e o resto do app) só conhece esta
// interface — nunca a URL/formato de uma fonte específica. Isso é o que permite trocar
// de fonte (plano pago da ExerciseDB, Free Exercise DB, etc.) sem reescrever a UI.
//
// Duas implementações:
//   - exerciseDbSource: fala direto com oss.exercisedb.dev. Usada SÓ pelo script de
//     seed (scripts/seedExercises.mjs), nunca em runtime pelo app.
//   - supabaseSource (export default `exerciseSource`): lê da tabela exercises_library
//     no Supabase, já populada pelo seed. É essa que a UI (fase 2) importa.
//
// Interface comum:
//   listExercises({ search, muscle, bodyPart, equipment, page, pageSize }) -> { items, total, hasMore }
//   getExercise(id) -> item | null
//   listMuscles() / listBodyParts() / listEquipments() -> string[]

import { supabase } from './supabase'
import { translateQueryToEnglish } from './exercisePtDictionary'

const EXERCISEDB_BASE = 'https://oss.exercisedb.dev/api/v1'
const EXERCISEDB_PAGE_LIMIT = 25 // confirmado por teste manual — a API ignora limit>25 e devolve 25 mesmo assim

function normalizeExerciseDbItem(raw) {
  return {
    id: raw.exerciseId,
    name: raw.name,
    namePt: null,
    gifUrl: raw.gifUrl,
    targetMuscles: raw.targetMuscles ?? [],
    secondaryMuscles: raw.secondaryMuscles ?? [],
    bodyParts: raw.bodyParts ?? [],
    equipments: raw.equipments ?? [],
    instructions: raw.instructions ?? [],
  }
}

// ─── exerciseDbSource — só o script de seed usa isso ───────────────────────────────
export const exerciseDbSource = {
  // Pagina TODOS os exercícios via cursor (parâmetro `after`, não `offset` — a API
  // ignora `offset` silenciosamente e sempre devolve a primeira página).
  async *iterateAllExercises() {
    let after = undefined
    let hasNextPage = true
    while (hasNextPage) {
      const url = new URL(`${EXERCISEDB_BASE}/exercises`)
      url.searchParams.set('limit', String(EXERCISEDB_PAGE_LIMIT))
      if (after) url.searchParams.set('after', after)

      const res = await fetch(url)
      if (!res.ok) throw new Error(`ExerciseDB respondeu ${res.status} em ${url}`)
      const json = await res.json()

      for (const raw of json.data) yield normalizeExerciseDbItem(raw)

      hasNextPage = !!json.meta?.hasNextPage
      after = json.meta?.nextCursor
      if (hasNextPage && !after) break // segurança: sem cursor não dá pra continuar
    }
  },

  async listEquipments() {
    const res = await fetch(`${EXERCISEDB_BASE}/equipments`)
    const json = await res.json()
    return (json.data ?? []).map(e => e.name)
  },

  async listBodyParts() {
    const res = await fetch(`${EXERCISEDB_BASE}/bodyparts`)
    const json = await res.json()
    return (json.data ?? []).map(e => e.name)
  },

  async listMuscles() {
    const res = await fetch(`${EXERCISEDB_BASE}/muscles`)
    const json = await res.json()
    return (json.data ?? []).map(e => e.name)
  },
}

// ─── supabaseSource — o que a UI usa (fase 2) ───────────────────────────────────────
function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    namePt: row.name_pt,
    gifUrl: row.gif_url,
    targetMuscles: row.target_muscles ?? [],
    secondaryMuscles: row.secondary_muscles ?? [],
    bodyParts: row.body_parts ?? [],
    equipments: row.equipments ?? [],
    instructions: row.instructions ?? [],
    // Tradução manual, só dos exercícios do protocolo do usuário (ver
    // 20260713000000_add_instructions_pt.sql) — nunca gerada automaticamente.
    instructionsPt: row.instructions_pt ?? null,
  }
}

// Taxonomia da ExerciseDB — capturada ao vivo da API (não inventada) em 2026-07-09.
// Fixa aqui em vez de consultar a API (ou até o Supabase) a cada tela: são listas de
// referência estáveis, não dado do usuário. bodyParts é a lista curta (10, boa pra
// chips de filtro); muscles é a taxonomia completa (alvo + secundário, 50 valores) —
// a fase 2 decide se filtra só pelos que aparecem de fato em target_muscles.
const EXERCISEDB_BODY_PARTS = ['back', 'cardio', 'chest', 'lower arms', 'lower legs', 'neck', 'shoulders', 'upper arms', 'upper legs', 'waist']
const EXERCISEDB_EQUIPMENTS = ['assisted', 'band', 'barbell', 'body weight', 'bosu ball', 'cable', 'dumbbell', 'elliptical machine', 'ez barbell', 'hammer', 'kettlebell', 'leverage machine', 'medicine ball', 'olympic barbell', 'resistance band', 'roller', 'rope', 'skierg machine', 'sled machine', 'smith machine', 'stability ball', 'stationary bike', 'stepmill machine', 'tire', 'trap bar', 'upper body ergometer', 'weighted', 'wheel roller']
const EXERCISEDB_MUSCLES = ['abdominals', 'abductors', 'abs', 'adductors', 'ankle stabilizers', 'ankles', 'back', 'biceps', 'brachialis', 'calves', 'cardiovascular system', 'chest', 'core', 'deltoids', 'delts', 'feet', 'forearms', 'glutes', 'grip muscles', 'groin', 'hamstrings', 'hands', 'hip flexors', 'inner thighs', 'latissimus dorsi', 'lats', 'levator scapulae', 'lower abs', 'lower back', 'obliques', 'pectorals', 'quadriceps', 'quads', 'rear deltoids', 'rhomboids', 'rotator cuff', 'serratus anterior', 'shins', 'shoulders', 'soleus', 'spine', 'sternocleidomastoid', 'trapezius', 'traps', 'triceps', 'upper back', 'upper chest', 'wrist extensors', 'wrist flexors', 'wrists']

export const exerciseSource = {
  async listBodyParts() { return EXERCISEDB_BODY_PARTS },
  async listEquipments() { return EXERCISEDB_EQUIPMENTS },
  async listMuscles() { return EXERCISEDB_MUSCLES },

  async listExercises({ search = '', muscle = null, bodyPart = null, equipment = null, page = 0, pageSize = 30 } = {}) {
    let query = supabase
      .from('exercises_library')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1)

    const rawSearch = search.trim()
    if (rawSearch) {
      // Nomes/dados da ExerciseDB são só em inglês — traduz vocabulário de academia
      // reconhecido (ver exercisePtDictionary.js) e busca pelos dois termos (ILIKE OR),
      // já que a tradução é parcial/heurística e o termo original pode bater direto.
      const { query: translated } = translateQueryToEnglish(rawSearch)
      if (translated && translated.toLowerCase() !== rawSearch.toLowerCase()) {
        query = query.or(`name.ilike.%${rawSearch}%,name.ilike.%${translated}%`)
      } else {
        query = query.ilike('name', `%${rawSearch}%`)
      }
    }
    if (muscle)    query = query.contains('target_muscles', [muscle])
    if (bodyPart)  query = query.contains('body_parts', [bodyPart])
    if (equipment) query = query.contains('equipments', [equipment])

    const { data, count, error } = await query
    if (error) throw error
    return {
      items: (data ?? []).map(rowToItem),
      total: count ?? 0,
      hasMore: count != null ? (page + 1) * pageSize < count : false,
    }
  },

  async getExercise(id) {
    const { data, error } = await supabase
      .from('exercises_library')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return rowToItem(data)
  },
}
