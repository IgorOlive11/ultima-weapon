import { createClient } from 'npm:@supabase/supabase-js'
import { Resend } from 'npm:resend'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY')!
const FEEDBACK_TO_EMAIL     = Deno.env.get('FEEDBACK_TO_EMAIL') ?? 'igorwooliveira11@gmail.com'

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
const resend = new Resend(RESEND_API_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TYPE_LABELS: Record<string, string> = {
  melhoria: 'MELHORIA',
  bug:      'BUG',
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

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { type, description, context, screenshot } = await req.json()
  if (!description || typeof description !== 'string' || !description.trim()) {
    return json({ error: 'description required' }, 400)
  }

  const label = TYPE_LABELS[type] ?? 'FEEDBACK'
  const subject = `[Overload · ${label}] ${description.slice(0, 60)}`

  const attachments = []
  if (typeof screenshot === 'string' && screenshot.startsWith('data:image/')) {
    const base64 = screenshot.split(',')[1]
    if (base64) attachments.push({ filename: 'screenshot.png', content: base64 })
  }

  const html = buildHtml({ label, description, context, authorName: profile?.name ?? user.email, authorEmail: user.email })

  const { error } = await resend.emails.send({
    from: 'Overload <noreply@overload.app.br>',
    to: FEEDBACK_TO_EMAIL,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
  })

  if (error) return json({ error }, 500)
  return json({ ok: true })
})

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

function buildHtml({ label, description, context, authorName, authorEmail }: {
  label: string; description: string; context: Record<string, unknown>; authorName: string; authorEmail: string
}): string {
  const errors: Array<{ ts: string; message: string }> = Array.isArray(context?.consoleErrors) ? context.consoleErrors : []
  const errorsHtml = errors.length
    ? errors.map(e => `<div style="margin-bottom:6px"><span style="color:#888">${esc(e.ts)}</span><br>${esc(e.message)}</div>`).join('')
    : '<div style="color:#666">nenhum erro capturado</div>'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#0a0a0a;color:#e8e8e8;font-family:'Share Tech Mono',monospace;font-size:13px">
  <div style="max-width:600px;margin:0 auto">
    <h2 style="color:#FF1414;letter-spacing:2px;margin-bottom:4px">OVERLOAD · ${esc(label)}</h2>
    <p style="color:#888;margin-top:0">enviado por ${esc(authorName)} (${esc(authorEmail)})</p>

    <div style="background:#111;border:1px solid #222;padding:16px;margin:16px 0;white-space:pre-wrap">${esc(description)}</div>

    <h3 style="color:#39FF14;letter-spacing:1px">CONTEXTO</h3>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr><td style="color:#888;padding:2px 8px 2px 0">Rota</td><td>${esc(context?.route)}</td></tr>
      <tr><td style="color:#888;padding:2px 8px 2px 0">Timestamp</td><td>${esc(context?.timestamp)}</td></tr>
      <tr><td style="color:#888;padding:2px 8px 2px 0">User agent</td><td>${esc(context?.userAgent)}</td></tr>
      <tr><td style="color:#888;padding:2px 8px 2px 0">Plataforma</td><td>${esc(context?.platform)}</td></tr>
      <tr><td style="color:#888;padding:2px 8px 2px 0">Viewport</td><td>${esc(context?.viewportWidth)}x${esc(context?.viewportHeight)}</td></tr>
    </table>

    <h3 style="color:#39FF14;letter-spacing:1px;margin-top:20px">ESTADO (recorte)</h3>
    <pre style="background:#111;border:1px solid #222;padding:12px;overflow-x:auto;font-size:11px;white-space:pre-wrap">${esc(JSON.stringify(context?.storeSlice ?? {}, null, 2))}</pre>

    <h3 style="color:#39FF14;letter-spacing:1px;margin-top:20px">ÚLTIMOS ERROS DE CONSOLE</h3>
    <div style="background:#111;border:1px solid #222;padding:12px;font-size:11px">${errorsHtml}</div>
  </div>
</body>
</html>`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
