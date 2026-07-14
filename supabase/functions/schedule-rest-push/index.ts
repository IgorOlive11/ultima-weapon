import { createClient } from 'npm:@supabase/supabase-js'
import webpush from 'npm:web-push'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY      = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY     = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_CONTACT_EMAIL   = Deno.env.get('VAPID_CONTACT_EMAIL') ?? 'mailto:igorwooliveira11@gmail.com'

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
webpush.setVapidDetails(VAPID_CONTACT_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Agenda um push pro fim do descanso. Chamado pelo cliente ao iniciar/ajustar o rest
// timer (useStore.js startRestTimer/adjustRestTimer), só quando o usuário ligou o
// toggle de notificações e já tem uma subscription salva. Também aceita
// { cancel: true } — chamado ao pular ou parar o descanso (stopRestTimer) — pra não
// deixar uma notificação antiga disparar depois que o usuário já seguiu em frente.
//
// Sincronização com +15s/-15s/pular: cada agendamento novo grava um `activePushId`
// (gerado aqui, no servidor) dentro do próprio registro de pushSubscription em
// user_data. Antes de mandar o push de verdade, o worker em background relê esse
// registro e só envia se o id ainda bater — se o usuário ajustou o tempo (novo id
// sobrescreve) ou cancelou (id vira null), o envio antigo se auto-cancela.
//
// LIMITAÇÃO CONHECIDA (documentar, não esconder): EdgeRuntime.waitUntil mantém a
// function rodando em background depois de responder o HTTP, mas Supabase Edge
// Functions (Deno Deploy) não garantem esse tempo de execução em background com
// precisão pra atrasos de vários minutos — o worker pode ser reciclado antes do
// setTimeout terminar, especialmente em planos gratuitos ou sob carga. Funciona bem
// pra descansos curtos (a maioria dos casos, ~1-3min); não é uma entrega garantida no
// segundo exato. Sem uma fila/cron externo dedicado, esse é o melhor esforço possível
// só com Edge Functions.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  const { seconds, title, body, cancel } = await req.json()

  const { data: row } = await adminClient
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .eq('section', 'pushSubscription')
    .single()

  const subscription = row?.data
  if (!subscription?.endpoint) return json({ error: 'Sem subscription de push salva' }, 400)

  if (cancel) {
    await adminClient.from('user_data').upsert(
      { user_id: user.id, section: 'pushSubscription', data: { ...subscription, activePushId: null }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    )
    return json({ ok: true, cancelled: true })
  }

  const delaySec = Math.max(1, Math.min(600, Number(seconds) || 0)) // clamp de segurança, máx 10min
  const pushId = crypto.randomUUID()

  await adminClient.from('user_data').upsert(
    { user_id: user.id, section: 'pushSubscription', data: { ...subscription, activePushId: pushId }, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,section' }
  )

  const sendAfterDelay = async () => {
    await new Promise(resolve => setTimeout(resolve, delaySec * 1000))
    try {
      const { data: freshRow } = await adminClient
        .from('user_data')
        .select('data')
        .eq('user_id', user.id)
        .eq('section', 'pushSubscription')
        .single()
      // Superado por um novo agendamento (+15s/-15s reiniciou) ou cancelado
      // (pular/parar) — não manda um push que já não faz sentido.
      if (freshRow?.data?.activePushId !== pushId) return

      await webpush.sendNotification(subscription, JSON.stringify({
        title: title || 'Descanso finalizado',
        body: body || 'Hora da próxima série 💪',
      }))
    } catch (err) {
      console.error('[schedule-rest-push] falha ao enviar push', err)
    }
  }

  // @ts-ignore — global do runtime Deno Deploy / Supabase Edge Functions
  EdgeRuntime.waitUntil(sendAfterDelay())

  return json({ ok: true, scheduledInSec: delaySec, pushId })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
