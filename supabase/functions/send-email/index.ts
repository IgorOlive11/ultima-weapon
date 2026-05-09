import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const GIF_URL = 'https://overload.app.br/doom-animated.gif'

function buildConfirmationURL(emailData: Record<string, string>): string {
  const { token_hash, redirect_to, email_action_type } = emailData
  const typeMap: Record<string, string> = {
    signup:       'signup',
    recovery:     'recovery',
    invite:       'invite',
    email_change: 'email_change',
    magiclink:    'magiclink',
  }
  const type = typeMap[email_action_type] ?? 'signup'
  return `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${encodeURIComponent(redirect_to)}`
}

function emailHtml(label: string, body: string, buttonText: string, buttonUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <link href="https://fonts.googleapis.com/css2?family=Metal+Mania&family=Share+Tech+Mono&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Metal+Mania&family=Share+Tech+Mono&display=swap');
    @font-face {
      font-family: 'Metal Mania';
      font-style: normal;
      font-weight: 400;
      src: url('https://fonts.gstatic.com/s/metalmania/v22/RWmMoKWb4e8kqMfBT4Y5yA.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Share Tech Mono';
      font-style: normal;
      font-weight: 400;
      src: url('https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFcLowEFA87Heg.woff2') format('woff2');
    }
    @media (prefers-color-scheme: dark) {
      body, .outer { background-color: #0a0a0a !important; }
      .outer-td   { background-color: #0a0a0a !important; }
      .card-wrap  { background-color: #111111 !important; border-color: #222222 !important; }
      .content-td { background-color: #111111 !important; }
      .gif-td     { background-color: #111111 !important; }
      .ftr-td     { background-color: #0d0d0d !important; border-color: #1a1a1a !important; }
      .body-text  { color: #888888 !important; }
      .ftr-text   { color: #333333 !important; }
    }
  </style>
</head>
<body class="outer" style="margin:0;padding:0;background-color:#f2f2f2">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f2f2f2">
<tr>
  <td class="outer-td" bgcolor="#f2f2f2" align="center" style="padding:40px 16px;background-color:#f2f2f2">
  <table width="480" cellpadding="0" cellspacing="0" bgcolor="#ffffff" class="card-wrap" style="max-width:480px;background-color:#ffffff;border:1px solid #dddddd">

    <!-- header — sempre escuro para manter identidade da marca -->
    <tr>
      <td bgcolor="#1a1a1a" align="center" style="padding:22px 24px;background-color:#1a1a1a;border-bottom:1px solid #0a0a0a">
        <p style="margin:0;font-family:'Metal Mania',Impact,'Arial Black',Arial,sans-serif;font-size:36px;color:#FF1414;letter-spacing:5px">OVERLOAD</p>
      </td>
    </tr>

    <!-- conteúdo: texto esquerda + gif direita -->
    <tr>
      <td class="content-td" bgcolor="#ffffff" style="padding:28px 24px;background-color:#ffffff">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top" style="padding-right:20px">
              <p style="margin:0 0 10px;font-family:'Metal Mania',Impact,'Arial Black',Arial,sans-serif;font-size:20px;color:#FF1414;letter-spacing:3px">${label}</p>
              <p class="body-text" style="margin:0 0 24px;font-family:'Share Tech Mono','Courier New',monospace;font-size:12px;color:#444444;line-height:1.8">${body}</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="#FF1414" style="background-color:#FF1414">
                    <a href="${buttonUrl}" style="display:inline-block;padding:12px 24px;font-family:'Metal Mania',Impact,'Arial Black',Arial,sans-serif;font-size:14px;letter-spacing:3px;color:#ffffff;text-decoration:none">${buttonText}</a>
                  </td>
                </tr>
              </table>
            </td>
            <td class="gif-td" valign="middle" align="center" width="152" bgcolor="#ffffff" style="background-color:#ffffff">
              <img src="${GIF_URL}" width="144" height="179" alt="" style="display:block">
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- footer -->
    <tr>
      <td class="ftr-td" bgcolor="#e8e8e8" style="padding:14px 24px;background-color:#e8e8e8;border-top:1px solid #dddddd">
        <p class="ftr-text" style="margin:0;font-family:'Share Tech Mono','Courier New',monospace;font-size:9px;color:#666666;letter-spacing:2px">OVERLOAD · BY IGOR OLIVEIRA</p>
      </td>
    </tr>

  </table>
  </td>
</tr>
</table>
</body>
</html>`
}

const TEMPLATES: Record<string, (url: string, email: string) => { subject: string; html: string }> = {
  signup: (url) => ({
    subject: 'Confirme sua conta — Overload',
    html: emailHtml(
      'CONFIRMAR CONTA',
      'Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.',
      'CONFIRMAR E-MAIL',
      url,
    ),
  }),
  recovery: (url, email) => ({
    subject: 'Recupere sua senha — Overload',
    html: emailHtml(
      'RECUPERAÇÃO DE SENHA',
      `Recebemos uma solicitação de redefinição de senha para <strong>${email}</strong>. O link expira em 1 hora.`,
      'REDEFINIR SENHA',
      url,
    ),
  }),
  invite: (url) => ({
    subject: 'Você foi convidado — Overload',
    html: emailHtml(
      'CONVITE',
      'Você foi convidado a participar do Overload. Clique no botão abaixo para criar sua conta e acessar seu plano de treino.',
      'ACEITAR CONVITE',
      url,
    ),
  }),
  magiclink: (url) => ({
    subject: 'Seu link de acesso — Overload',
    html: emailHtml(
      'LINK DE ACESSO',
      'Use o botão abaixo para entrar na sua conta. O link é válido por 10 minutos e só pode ser usado uma vez.',
      'ENTRAR AGORA',
      url,
    ),
  }),
  email_change: (url) => ({
    subject: 'Confirme seu novo e-mail — Overload',
    html: emailHtml(
      'ALTERAÇÃO DE E-MAIL',
      'Clique no botão abaixo para confirmar este endereço como o novo e-mail da sua conta.',
      'CONFIRMAR NOVO E-MAIL',
      url,
    ),
  }),
}

Deno.serve(async (req) => {
  try {
    const { user, email_data } = await req.json()
    const confirmationUrl = buildConfirmationURL(email_data)
    const templateFn = TEMPLATES[email_data.email_action_type] ?? TEMPLATES.signup
    const { subject, html } = templateFn(confirmationUrl, user.email)

    const { error } = await resend.emails.send({
      from: 'Overload <noreply@overload.app.br>',
      to:   user.email,
      subject,
      html,
    })

    const headers = { 'Content-Type': 'application/json' }
    if (error) return new Response(JSON.stringify({ error }), { status: 500, headers })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
