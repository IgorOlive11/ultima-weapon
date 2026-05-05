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
  <meta name="color-scheme" content="dark">
  <link href="https://fonts.googleapis.com/css2?family=Metal+Mania&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0a0a0a">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a">
<tr><td bgcolor="#0a0a0a" align="center" style="padding:40px 16px;background:#0a0a0a">
<table width="480" cellpadding="0" cellspacing="0" bgcolor="#111111" style="max-width:480px;border:1px solid #222">

  <!-- header -->
  <tr>
    <td bgcolor="#111111" align="center" style="padding:22px 24px;background:#111111;border-bottom:1px solid #222">
      <p style="margin:0;font-family:'Metal Mania',Impact,cursive;font-size:36px;color:#FF1414;letter-spacing:5px">OVERLOAD</p>
    </td>
  </tr>

  <!-- conteudo: texto esquerda + gif direita -->
  <tr>
    <td bgcolor="#111111" style="padding:28px 24px;background:#111111">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="top" style="padding-right:20px">
            <p style="margin:0 0 10px;font-family:'Metal Mania',Impact,cursive;font-size:20px;color:#FF1414;letter-spacing:3px">${label}</p>
            <p style="margin:0 0 24px;font-family:'Courier New',monospace;font-size:12px;color:#888;line-height:1.8">${body}</p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#FF1414" style="background:#FF1414">
                  <a href="${buttonUrl}" style="display:inline-block;padding:12px 24px;font-family:'Metal Mania',Impact,cursive;font-size:14px;letter-spacing:3px;color:#fff;text-decoration:none">${buttonText}</a>
                </td>
              </tr>
            </table>
          </td>
          <td valign="middle" align="center" width="128" bgcolor="#111111" style="background:#111111">
            <img src="${GIF_URL}" width="120" height="155" alt="" style="display:block">
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- footer -->
  <tr>
    <td bgcolor="#0d0d0d" style="padding:14px 24px;background:#0d0d0d;border-top:1px solid #1a1a1a">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;color:#333;letter-spacing:2px">OVERLOAD · BY IGOR OLIVEIRA</p>
    </td>
  </tr>

</table>
</td></tr>
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
      `Recebemos uma solicitação de redefinição de senha para <span style="color:#ccc">${email}</span>. O link expira em 1 hora.`,
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

    if (error) return new Response(JSON.stringify({ error }), { status: 500 })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
