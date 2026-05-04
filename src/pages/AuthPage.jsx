import React, { useState } from 'react'
import { LuSwords, LuMail, LuLock, LuUser } from 'react-icons/lu'
import { supabase } from '../lib/supabase'

const inputCls = 'w-full bg-s2 border border-border2 text-ink px-3 py-3 font-mono text-sm tracking-wider outline-none focus:border-neon transition-colors'

export default function AuthPage() {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role: 'student' } },
        })
        if (error) setError(error.message)
        else setDone(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-bg p-6 max-w-[430px] mx-auto">
        <div className="bg-s1 border border-neon/40 p-6 w-full text-center space-y-3">
          <div className="font-display text-neon text-lg tracking-[0.15em]">CONTA CRIADA</div>
          <p className="font-mono text-[11px] text-muted tracking-wider leading-relaxed">
            Verifique seu e-mail para confirmar o cadastro,<br />depois faça login.
          </p>
          <button
            onClick={() => { setMode('login'); setDone(false) }}
            className="btn-primary w-full mt-2"
          >
            FAZER LOGIN
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="scanlines flex flex-col items-center justify-center h-dvh bg-bg p-6 max-w-[430px] mx-auto">
      <div className="w-full space-y-6">
        <div className="text-center">
          <LuSwords size={28} className="text-neon mx-auto mb-2" />
          <div className="font-display text-2xl text-neon tracking-[0.15em]">ULTIMA WEAPON</div>
          <div className="font-mono text-[9px] text-muted tracking-[0.2em] mt-1">WEAPONS OF MASS CONSTRUCTION</div>
        </div>

        <div className="bg-s1 border border-border1 p-5">
          <div className="font-display text-sm text-neon tracking-[0.2em] mb-4 pb-2 border-b border-border1">
            {mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
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

            {error && (
              <div className="font-mono text-[10px] text-red-400 tracking-wider bg-red-400/10 border border-red-400/20 px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
              {loading ? 'AGUARDE...' : mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-border1 text-center">
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
              className="font-mono text-[10px] text-muted hover:text-neon tracking-wider transition-colors"
            >
              {mode === 'login' ? 'Não tem conta? CRIAR CONTA' : 'Já tem conta? ENTRAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
