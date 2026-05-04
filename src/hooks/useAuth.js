import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from './useStore'

export function useAuth() {
  const setAuthUser   = useStore(s => s.setAuthUser)
  const clearAuth     = useStore(s => s.clearAuth)
  const authUser      = useStore(s => s.authUser)
  const authLoading   = useStore(s => s.authLoading)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadUser(session.user)
      else clearAuth()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) loadUser(session.user)
      else if (event === 'SIGNED_OUT') clearAuth()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name, trainer_id')
      .eq('id', user.id)
      .single()

    await setAuthUser({
      id:        user.id,
      email:     user.email,
      role:      profile?.role ?? 'student',
      name:      profile?.name ?? user.email?.split('@')[0] ?? 'User',
      trainerId: profile?.trainer_id ?? null,
    })
  }

  return { authUser, authLoading }
}
