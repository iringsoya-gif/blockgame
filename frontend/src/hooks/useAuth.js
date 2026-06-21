import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { gameStorage } from '../lib/gameStorage'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        // 게임 데이터 초기화
        gameStorage.clearAll()
        localStorage.removeItem('bq_guide_id')
        localStorage.removeItem('bq_earned_achievements')
        localStorage.removeItem('bq_achievements')
        localStorage.removeItem('bq_sound')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const loginWithGoogle = useCallback(() =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    }), [])

  const loginWithDiscord = useCallback(() =>
    supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    }), [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    // 강제 홈 이동
    window.location.href = '/'
  }, [])

  return { user, loading, loginWithGoogle, loginWithDiscord, logout }
}
