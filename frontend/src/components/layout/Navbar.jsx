import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { path: '/story-select', label: '플레이',   icon: '▶'  },
  { path: '/challenge',    label: '챌린지',   icon: '🗓' },
  { path: '/leaderboard',  label: '랭킹',     icon: '🏆' },
  { path: '/history',      label: '전적',     icon: '📊' },
  { path: '/profile',      label: '프로필',   icon: '👤' },
]

export default function Navbar({ title, actions, showNav = true, slim = false }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const goTo = useCallback((path) => {
    navigate(path)
    closeMenu()
  }, [navigate, closeMenu])

  const isActive = (path) => location.pathname === path ||
    (path !== '/' && location.pathname.startsWith(path))

  return (
    <header
      className={`flex items-center justify-between px-4 sm:px-5
                  border-b border-brand-border bg-brand-bg/97 backdrop-blur-sm
                  sticky top-0 z-20 shrink-0 ${slim ? 'py-2' : 'py-3'}`}
      role="banner">

      {/* 로고 */}
      <button
        onClick={() => goTo('/')}
        className="font-display text-lg tracking-[0.2em] text-brand-accent
                   hover:text-brand-accentHover transition-colors"
        aria-label="BlockQuest 홈">
        {title ?? 'BlockQuest'}
      </button>

      {/* 데스크탑 nav */}
      {showNav && user && (
        <nav className="hidden md:flex items-center gap-0.5" aria-label="메인 네비게이션">
          {NAV_ITEMS.map(item => (
            <button key={item.path}
              onClick={() => goTo(item.path)}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all duration-150
                ${isActive(item.path)
                  ? 'text-brand-accent bg-brand-accent/10 font-semibold'
                  : 'text-brand-muted hover:text-brand-text hover:bg-brand-panelLight'}`}>
              <span className="mr-1.5 text-xs">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* 우측 액션 */}
      <div className="flex items-center gap-1.5">
        {actions}
        {user && (
          <>
            <button onClick={() => goTo('/upgrade')}
              className="hidden md:inline-flex items-center gap-1.5 font-mono text-xs
                         text-brand-accent border border-brand-accent/40 px-2.5 py-1.5
                         rounded-lg hover:bg-brand-accent/10 transition-colors whitespace-nowrap">
              ✦ 프리미엄
            </button>
            <button onClick={() => goTo('/settings')} title="설정 (⚙)"
              className="hidden md:inline-flex btn-ghost text-sm px-2 py-1.5"
              aria-label="설정">⚙</button>
          </>
        )}

        {/* 모바일 햄버거 */}
        {showNav && user && (
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="md:hidden btn-ghost px-2.5 py-1.5 text-base">
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>

      {/* 모바일 드롭다운 */}
      {menuOpen && showNav && user && (
        <div
          className="absolute top-full left-0 right-0 z-30
                     bg-brand-bg border-b border-brand-border
                     divide-y divide-brand-border/40 shadow-panel animate-fade-in"
          role="menu">
          {NAV_ITEMS.map(item => (
            <button key={item.path}
              onClick={() => goTo(item.path)}
              role="menuitem"
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`w-full px-6 py-4 text-left text-sm font-mono
                          flex items-center gap-3 transition-colors
                ${isActive(item.path)
                  ? 'text-brand-accent bg-brand-accent/5'
                  : 'text-brand-text hover:bg-brand-panelLight'}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
          <button onClick={() => goTo('/upgrade')} role="menuitem"
            className="w-full px-6 py-4 text-left text-sm font-mono text-brand-accent
                       flex items-center gap-3 hover:bg-brand-panelLight transition-colors">
            <span>✦</span>프리미엄
          </button>
          <button onClick={() => goTo('/settings')} role="menuitem"
            className="w-full px-6 py-4 text-left text-sm font-mono text-brand-muted
                       flex items-center gap-3 hover:bg-brand-panelLight transition-colors">
            <span>⚙</span>설정
          </button>
        </div>
      )}
    </header>
  )
}
