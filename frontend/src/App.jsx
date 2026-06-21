import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { sound } from './lib/sound'
import { ToastContainer }       from './components/game/Toast'
import { AchievementContainer } from './components/game/AchievementToast'
import TitleToastContainer       from './components/game/TitleToast'
import PWAUpdateBanner           from './components/PWAUpdateBanner'
import ErrorBoundary             from './components/layout/ErrorBoundary'

// 코드 스플리팅 — 초기 번들 크기 감소
const Landing     = lazy(() => import('./pages/Landing'))
const StorySelect = lazy(() => import('./pages/StorySelect'))
const ClassSelect = lazy(() => import('./pages/ClassSelect'))
const Game        = lazy(() => import('./pages/Game'))
const RunHistory  = lazy(() => import('./pages/RunHistory'))
const Profile     = lazy(() => import('./pages/Profile'))
const Challenge   = lazy(() => import('./pages/Challenge'))
const Upgrade     = lazy(() => import('./pages/Upgrade'))
const Settings     = lazy(() => import('./pages/Settings'))
const GuestGame    = lazy(() => import('./pages/GuestGame'))
const Legal        = lazy(() => import('./pages/Legal'))
const EndlessMode  = lazy(() => import('./pages/EndlessMode'))
const Leaderboard  = lazy(() => import('./pages/Leaderboard'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-brand-accent/5 to-transparent pointer-events-none" />
      <div className="flex flex-col items-center gap-5 relative z-10">
        {/* 테트로미노 로딩 애니메이션 */}
        <div className="grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map(i => (
            <div key={i}
              className="w-3 h-3 rounded-sm bg-brand-accent animate-pulse"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }} />
          ))}
        </div>
        <p className="font-display text-lg text-brand-accent tracking-[0.3em] animate-pulse">BLOCKQUEST</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  // 첫 사용자 제스처에 오디오 활성화 (브라우저 자동재생 정책 대응)
  useEffect(() => {
    const unlock = () => { try { sound.resume() } catch {} }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // 코나미 코드 이스터에그 (↑↑↓↓←→←→BA)
  useEffect(() => {
    const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
    let pos = 0
    const onKey = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      pos = (key === SEQ[pos]) ? pos + 1 : (key === SEQ[0] ? 1 : 0)
      if (pos === SEQ.length) {
        pos = 0
        import('./components/game/Toast').then(({ showToast }) => {
          showToast('🌟 숨겨진 코드를 발견했습니다! 당신은 진정한 탐험가입니다.', 'success')
        }).catch(() => {})
        try { sound.levelUp?.() } catch {}
        try { localStorage.setItem('bq_konami_found', '1') } catch {}
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <AchievementContainer />
        <TitleToastContainer />
        <PWAUpdateBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<Landing />} />
            <Route path="/story-select" element={<PrivateRoute><StorySelect /></PrivateRoute>} />
            <Route path="/class-select" element={<PrivateRoute><ClassSelect /></PrivateRoute>} />
            <Route path="/game"         element={<PrivateRoute><Game /></PrivateRoute>} />
            <Route path="/challenge"    element={<PrivateRoute><Challenge /></PrivateRoute>} />
            <Route path="/history"      element={<PrivateRoute><RunHistory /></PrivateRoute>} />
            <Route path="/profile"      element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/upgrade"      element={<PrivateRoute><Upgrade /></PrivateRoute>} />
            <Route path="/settings"     element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/leaderboard"  element={<Leaderboard />} />
            <Route path="/try"          element={<GuestGame />} />
            <Route path="/legal"        element={<Legal />} />
            <Route path="/endless"      element={<PrivateRoute><EndlessMode /></PrivateRoute>} />
            {/* 404 */}
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
