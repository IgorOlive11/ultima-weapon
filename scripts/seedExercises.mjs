// Script de seed ONE-OFF — roda manual via `npm run seed:exercises`, nunca em runtime.
// Popula/atualiza public.exercises_library a partir da ExerciseDB free/oss
// (oss.exercisedb.dev). Idempotente: upsert por id, rodar de novo não duplica.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=xxx npm run seed:exercises
//   (SUPABASE_URL cai pra VITE_SUPABASE_URL do .env.local se não for passado à parte)
//
// USE_REMOTE_GIF=false pra baixar os GIFs e subir pro Supabase Storage (bucket
// "exercises", precisa existir e ser público) em vez de guardar a URL remota da
// ExerciseDB direto. Default true (MVP) — mais simples, sem depender de Storage.
//
// Licença da fonte: ExerciseDB free/oss é uso NÃO comercial + atribuição obrigatória
// (ver crédito na tela da biblioteca, fase 2). Trocar de fonte é só reimplementar o
// adapter em src/lib/exerciseSource.js — a tabela/UI não mudam.

import { createClient } from '@supabase/supabase-js'

try { process.loadEnvFile('.env.local') } catch { /* arquivo pode não existir — ok */ }

const SUPABASE_URL  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY
const USE_REMOTE_GIF = process.env.USE_REMOTE_GIF !== 'false'

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  console.error('Uso: SUPABASE_SERVICE_ROLE_KEY=xxx npm run seed:exercises')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const EXERCISEDB_BASE = 'https://oss.exercisedb.dev/api/v1'
const PAGE_LIMIT = 25 // confirmado por teste manual — a API ignora limit>25

// Cursor-based: o parâmetro é `after` (não `offset` — a API ignora offset em silêncio
// e sempre devolve a primeira página de novo).
async function* iterateAllExercises() {
  let after
  let hasNextPage = true
  while (hasNextPage) {
    const url = new URL(`${EXERCISEDB_BASE}/exercises`)
    url.searchParams.set('limit', String(PAGE_LIMIT))
    if (after) url.searchParams.set('after', after)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`ExerciseDB respondeu ${res.status} em ${url}`)
    const json = await res.json()

    for (const raw of json.data) yield raw

    hasNextPage = !!json.meta?.hasNextPage
    after = json.meta?.nextCursor
    if (hasNextPage && !after) break // segurança: sem cursor não dá pra continuar
  }
}

async function uploadGifToStorage(exerciseId, gifUrl) {
  const res = await fetch(gifUrl)
  if (!res.ok) throw new Error(`falha ao baixar gif ${gifUrl}: ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  const path = `${exerciseId}.gif`
  const { error } = await supabase.storage.from('exercises').upload(path, buf, {
    contentType: 'image/gif',
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from('exercises').getPublicUrl(path)
  return data.publicUrl
}

async function main() {
  console.log(`Seed exercises_library — USE_REMOTE_GIF=${USE_REMOTE_GIF}`)
  let count = 0
  let failed = 0

  for await (const raw of iterateAllExercises()) {
    try {
      const gifUrl = USE_REMOTE_GIF ? raw.gifUrl : await uploadGifToStorage(raw.exerciseId, raw.gifUrl)

      const { error } = await supabase.from('exercises_library').upsert({
        id: raw.exerciseId,
        name: raw.name,
        gif_url: gifUrl,
        target_muscles: raw.targetMuscles ?? [],
        secondary_muscles: raw.secondaryMuscles ?? [],
        body_parts: raw.bodyParts ?? [],
        equipments: raw.equipments ?? [],
        instructions: raw.instructions ?? [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (error) throw error
      count++
      if (count % 100 === 0) console.log(`  ${count} exercícios processados...`)
    } catch (err) {
      failed++
      console.error(`  falhou ${raw.exerciseId} (${raw.name}):`, err.message)
    }
  }

  console.log(`Concluído: ${count} upserts, ${failed} falhas.`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
