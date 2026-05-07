import React, { useState } from 'react'
import { LuSwords, LuMail, LuLock, LuUser, LuArrowLeft, LuEye, LuEyeOff } from 'react-icons/lu'
import { supabase } from '../lib/supabase'

const inputCls = 'w-full bg-s2 border border-border2 text-ink px-3 py-3 font-mono text-sm tracking-wider outline-none focus:border-neon transition-colors'

function Header() {
  return (
    <div className="text-center">
      <LuSwords size={28} className="text-neon mx-auto mb-2" />
      <div className="font-display text-2xl text-neon tracking-[0.15em]">OVERLOAD</div>
    </div>
  )
}

function strengthInfo(pwd) {
  if (!pwd) return null
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd))        score++
  if (/[0-9]/.test(pwd))        score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { label: 'FRACA',  color: 'text-neon',  bars: 1, barCls: 'bg-neon'  }
  if (score <= 3) return { label: 'MÉDIA',  color: 'text-warn',  bars: 2, barCls: 'bg-warn'  }
  return              { label: 'FORTE',  color: 'text-blue',  bars: 3, barCls: 'bg-blue'  }
}

function translateError(msg) {
  if (!msg) return 'Erro desconhecido.'
  const m = msg.toLowerCase()
  if (m.includes('rate limit') || m.includes('email rate'))
    return 'Limite de e-mails atingido. Aguarde alguns minutos e tente novamente.'
  if (m.includes('invalid login') || m.includes('invalid email or password') || m.includes('email not confirmed'))
    return 'E-mail ou senha incorretos.'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.'
  if (m.includes('password should be') || m.includes('password is too short'))
    return 'A senha deve ter no mínimo 8 caracteres.'
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'E-mail inválido.'
  if (m.includes('network') || m.includes('fetch'))
    return 'Erro de conexão. Verifique sua internet.'
  return msg
}

export default function AuthPage() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [doneMsg, setDoneMsg]   = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (password.length < 8) {
        setError('A senha deve ter no mínimo 8 caracteres.')
        return
      }
      if (password !== confirm) {
        setError('As senhas não coincidem.')
        return
      }
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(translateError(error.message))

      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role: 'student' } },
        })
        if (error) {
          setError(translateError(error.message))
        } else if (!data.user || data.user.identities?.length === 0) {
          // Supabase retorna user sem identities quando o email já existe
          setError('Este e-mail já está cadastrado. Faça login ou recupere sua senha.')
        } else {
          setDoneMsg('Verifique seu e-mail para confirmar o cadastro, depois faça login.')
          setDone(true)
        }

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) setError(translateError(error.message))
        else { setDoneMsg('Enviamos um link de recuperação para o seu e-mail.'); setDone(true) }
      }
    } finally {
      setLoading(false)
    }
  }

  const strength = mode === 'register' ? strengthInfo(password) : null

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-bg p-6 max-w-[430px] mx-auto">
        <div className="w-full space-y-6">
          <Header />
          <div className="bg-s1 border border-neon/40 p-6 text-center space-y-4">
            <div className="font-display text-neon text-base tracking-[0.15em]">E-MAIL ENVIADO</div>
            <p className="font-mono text-[11px] text-muted tracking-wider leading-relaxed">{doneMsg}</p>
            <button onClick={() => { setMode('login'); setDone(false) }} className="btn-primary w-full">
              VOLTAR AO LOGIN
            </button>
          </div>
        </div>
      </div>
    )
  }

  const titles = { login: 'ENTRAR', register: 'CRIAR CONTA', forgot: 'RECUPERAR SENHA' }

  return (
    <div className="scanlines flex flex-col items-center justify-center h-dvh bg-bg p-6 max-w-[430px] mx-auto">
      <div className="w-full space-y-6">
        <Header />

        <div className="bg-s1 border border-border1 p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border1">
            {mode !== 'login' && (
              <button onClick={() => switchMode('login')} className="text-muted hover:text-neon transition-colors">
                <LuArrowLeft size={14} />
              </button>
            )}
            <div className="font-display text-sm text-neon tracking-[0.2em]">{titles[mode]}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <div className="font-mono text-[9px] text-muted tracking-widest mb-1">NOME</div>
                <div className="relative">
                  <LuUser size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome" required
                    className={inputCls + ' pl-9'}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="font-mono text-[9px] text-muted tracking-widest mb-1">E-MAIL</div>
              <div className="relative">
                <LuMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  className={inputCls + ' pl-9'}
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="font-mono text-[9px] text-muted tracking-widest mb-1">SENHA</div>
                <div className="relative">
                  <LuLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    minLength={mode === 'register' ? 8 : 1}
                    className={inputCls + ' pl-9 pr-10'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  >
                    {showPass ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                  </button>
                </div>

                {strength && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={`h-[2px] flex-1 transition-all duration-300 ${i < strength.bars ? strength.barCls : 'bg-border2'}`}
                        />
                      ))}
                    </div>
                    <div className={`font-mono text-[9px] tracking-widest ${strength.color}`}>
                      SENHA {strength.label}
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <div className="font-mono text-[9px] text-muted tracking-widest mb-1">CONFIRMAR SENHA</div>
                <div className="relative">
                  <LuLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required
                    className={
                      inputCls + ' pl-9 pr-10' +
                      (confirm && confirm !== password ? ' border-neon' : '')
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                  >
                    {showConfirm ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <div className="font-mono text-[9px] text-neon tracking-widest mt-1">
                    AS SENHAS NÃO COINCIDEM
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="font-mono text-[10px] text-red-400 tracking-wider bg-red-400/10 border border-red-400/20 px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'AGUARDE...' : titles[mode]}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-border1 space-y-2 text-center">
            {mode === 'login' && (
              <>
                <button onClick={() => switchMode('forgot')}
                  className="block w-full font-mono text-[10px] text-muted hover:text-neon tracking-wider transition-colors">
                  Esqueceu a senha?
                </button>
                <button onClick={() => switchMode('register')}
                  className="block w-full font-mono text-[10px] text-muted hover:text-neon tracking-wider transition-colors">
                  Não tem conta? CRIAR CONTA
                </button>
              </>
            )}
            {mode === 'register' && (
              <button onClick={() => switchMode('login')}
                className="font-mono text-[10px] text-muted hover:text-neon tracking-wider transition-colors">
                Já tem conta? ENTRAR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
