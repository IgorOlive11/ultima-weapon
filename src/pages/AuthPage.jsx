import React, { useState } from 'react'
import { LuSwords, LuMail, LuLock, LuUser, LuArrowLeft } from 'react-icons/lu'
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

export default function AuthPage() {
  const [mode, setMode]         = useState('login') // 'login' | 'register' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [doneMsg, setDoneMsg]   = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
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
    if (m.includes('password should be'))
      return 'A senha deve ter no mínimo 6 caracteres.'
    if (m.includes('unable to validate email'))
      return 'E-mail inválido.'
    if (m.includes('network') || m.includes('fetch'))
      return 'Erro de conexão. Verifique sua internet.'
    return msg
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(translateError(error.message))
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role: 'student' } },
        })
        if (error) setError(translateError(error.message))
        else { setDoneMsg('Verifique seu e-mail para confirmar o cadastro, depois faça login.'); setDone(true) }
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
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    className={inputCls + ' pl-9'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>
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
