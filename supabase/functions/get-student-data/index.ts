import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// service role ignora RLS — usado só após verificar que o caller é trainer/admin
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  // verifica quem está chamando
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  const role = user.user_metadata?.role
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
    headers: { 'Content-Type': 'application/json' },
  })
}
