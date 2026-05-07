import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // Verifica role na tabela profiles (não em user_metadata que pode ser stale)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'trainer' && role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { studentId } = await req.json()
  if (!studentId) return json({ error: 'studentId required' }, 400)

  const { data, error } = await adminClient
    .from('user_data')
    .select('section, data')
    .eq('user_id', studentId)

  if (error) return json({ error: error.message }, 500)
  return json({ data })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
