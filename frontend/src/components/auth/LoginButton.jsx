import { useAuth } from '../../hooks/useAuth'

export function LoginButton() {
  const { loginWithGoogle, loginWithDiscord } = useAuth()

  return (
    <div className="flex flex-col gap-3 w-full max-w-xs">
      <button
        onClick={loginWithGoogle}
        className="flex items-center justify-center gap-3 px-5 py-3
                   bg-white text-gray-800 font-medium rounded-lg
                   hover:bg-gray-100 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.1-10.3 7.1-17.2z"/>
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.8-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.6H2.8v6.2C6.7 42.7 14.8 48 24 48z"/>
          <path fill="#FBBC05" d="M10.8 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.8C1 17.4 0 20.6 0 24s1 6.6 2.8 9.1l8-4.2z"/>
          <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.4 30.4 0 24 0 14.8 0 6.7 5.3 2.8 13.1l8 6.2C12.7 13.6 17.9 9.5 24 9.5z"/>
        </svg>
        Google로 시작하기
      </button>

      <button
        onClick={loginWithDiscord}
        className="flex items-center justify-center gap-3 px-5 py-3
                   bg-[#5865F2] text-white font-medium rounded-lg
                   hover:bg-[#4752C4] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 71 55" fill="white">
          <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a40.7 40.7 0 0 0-1.8 3.7 54.2 54.2 0 0 0-16.3 0A38.7 38.7 0 0 0 25.6.4 58.4 58.4 0 0 0 11 5C1.6 19 -1 32.7.3 46.2a58.9 58.9 0 0 0 18 9.1 42.6 42.6 0 0 0 3.7-6 38.4 38.4 0 0 1-5.8-2.8l1.4-1.1a41.9 41.9 0 0 0 36 0l1.4 1.1a38.3 38.3 0 0 1-5.9 2.8 42.4 42.4 0 0 0 3.7 6 58.7 58.7 0 0 0 18-9.1C72 30.6 68.5 17 60.1 4.9zM23.8 38.1c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2zm23.4 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2z"/>
        </svg>
        Discord로 시작하기
      </button>
    </div>
  )
}

export function UserProfile() {
  const { user, logout } = useAuth()
  if (!user) return null

  const avatar = user.user_metadata?.avatar_url
  const name   = user.user_metadata?.full_name ?? user.email

  return (
    <div className="flex items-center gap-3">
      {avatar && <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />}
      <span className="text-brand-text text-sm font-body">{name}</span>
      <button onClick={logout} className="btn-ghost text-xs px-3 py-1">로그아웃</button>
    </div>
  )
}
