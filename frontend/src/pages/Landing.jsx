import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoginButton } from '../components/auth/LoginButton'
import { gameStorage } from '../lib/gameStorage'

// 파티클 설정
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  size:  Math.random() * 4 + 1,
  left:  Math.random() * 100,
  delay: Math.random() * 8,
  dur:   Math.random() * 6 + 6,
  color: ['#7c5cfc','#9b7ffe','#44ff99','#ff4466','#ffd700'][Math.floor(Math.random()*5)],
}))

// 테트리스 블록 미니 애니메이션 (배경 장식)
const DECO_PIECES = [
  { shape: [[1,1],[1,1]], color: '#ffd700', top: '15%', left: '8%',  rotate: 15, scale: 1.2 },
  { shape: [[1,1,1,1]],   color: '#00f5ff', top: '65%', left: '5%',  rotate: -20, scale: 0.9 },
  { shape: [[0,1,0],[1,1,1]], color: '#aa00ff', top: '25%', right: '7%', rotate: 30, scale: 1.1 },
  { shape: [[1,1,0],[0,1,1]], color: '#ff4466', top: '70%', right: '6%', rotate: -15, scale: 0.8 },
  { shape: [[1,0,0],[1,1,1]], color: '#ff8800', top: '45%', left: '3%', rotate: 10, scale: 0.7 },
]

function DecoPiece({ piece }) {
  const cellSize = 12
  return (
    <div
      className="absolute opacity-20 animate-float"
      style={{
        top: piece.top, left: piece.left, right: piece.right,
        transform: `rotate(${piece.rotate}deg) scale(${piece.scale})`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      }}
    >
      {piece.shape.map((row, y) => (
        <div key={y} className="flex">
          {row.map((cell, x) => (
            <div key={x}
              style={{
                width: cellSize, height: cellSize,
                backgroundColor: cell ? piece.color : 'transparent',
                border: cell ? `1px solid ${piece.color}88` : 'none',
                boxShadow: cell ? `0 0 6px ${piece.color}66` : 'none',
                margin: 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function FeatureCard({ icon, title, desc, delay = 0 }) {
  return (
    <div className="panel p-5 flex flex-col gap-3 card-hover animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="text-3xl">{icon}</div>
      <div>
        <h3 className="font-display text-sm text-brand-text mb-1">{title}</h3>
        <p className="text-brand-muted text-xs font-body leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function Landing() {
  const { user, loading, loginWithGoogle, loginWithDiscord } = useAuth()
  const navigate = useNavigate()
  const [loginLoading, setLoginLoading] = useState(null)
  const bgRef = useRef(null)

  useEffect(() => {
    if (!loading && user) {
      // 진행 중인 게임이 있으면 바로 게임으로
      if (gameStorage.hasActiveGame()) navigate('/game')
      else navigate('/story-select')
    }
  }, [user, loading, navigate])

  // 마우스 패럴랙스 배경
  useEffect(() => {
    const handleMove = (e) => {
      if (!bgRef.current) return
      const x = (e.clientX / window.innerWidth  - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      bgRef.current.style.transform = `translate(${x}px, ${y}px)`
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const handleGoogle = async () => {
    setLoginLoading('google')
    await loginWithGoogle()
    setLoginLoading(null)
  }
  const handleDiscord = async () => {
    setLoginLoading('discord')
    await loginWithDiscord()
    setLoginLoading(null)
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative bg-brand-bg">

      {/* ── 배경 레이어 ── */}
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div ref={bgRef} className="absolute inset-0 transition-transform duration-75 ease-out pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-brand-danger/5 rounded-full blur-[80px]" />
        <div className="absolute top-2/3 left-1/2 w-64 h-64 bg-brand-success/4 rounded-full blur-[60px]" />
      </div>

      {/* 파티클 */}
      {PARTICLES.map((p) => (
        <div key={p.id} className="particle" style={{
          width: p.size, height: p.size,
          left: `${p.left}%`, bottom: '-10px',
          backgroundColor: p.color,
          boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          animationDuration: `${p.dur}s`,
          animationDelay:    `${p.delay}s`,
        }} />
      ))}

      {/* 장식 테트리스 블록 */}
      {DECO_PIECES.map((piece, i) => <DecoPiece key={i} piece={piece} />)}

      {/* ── 네비 ── */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-4">
        <span className="font-display text-xl text-brand-accent tracking-[0.2em]">BlockQuest</span>
        <div className="flex gap-3 text-brand-muted text-xs font-mono">
          <button onClick={() => navigate('/history')}
            className="hover:text-brand-text transition-colors">전적</button>
          <span className="opacity-30">|</span>
          <button onClick={() => navigate('/profile')}
            className="hover:text-brand-text transition-colors">프로필</button>
          <span className="opacity-30">|</span>
          <button onClick={() => navigate('/challenge')}
            className="hover:text-brand-text transition-colors">🗓 챌린지</button>
          <span className="opacity-30">|</span>
          <button onClick={() => navigate('/endless')}
            className="hover:text-brand-text transition-colors">♾️ 엔드리스</button>
          <span className="opacity-30">|</span>
          <button onClick={() => navigate('/upgrade')}
            className="text-brand-accent hover:text-brand-accentHover transition-colors font-medium">✦ 프리미엄</button>
          <span className="opacity-30">|</span>
          <a href="#features" className="hover:text-brand-text transition-colors">소개</a>
          <span className="opacity-30">|</span>
          <button onClick={() => navigate('/settings')}
            className="hover:text-brand-text transition-colors">설정</button>
        </div>
      </nav>

      {/* ── 히어로 ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10 px-6 py-12">

        {/* 타이틀 */}
        <div className="text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                          border border-brand-accent/30 bg-brand-accent/10
                          text-brand-accent text-xs font-mono mb-4">
            <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse" />
            AI 게임 마스터 · 라이브
          </div>

          <h1 className="font-display font-black tracking-wider leading-none">
            <span className="block text-7xl text-glow-accent"
              style={{ color: '#7c5cfc', textShadow: '0 0 40px rgba(124,92,252,0.6)' }}>
              BLOCK
            </span>
            <span className="block text-7xl text-brand-text">QUEST</span>
          </h1>

          <p className="text-brand-textMuted font-body text-lg max-w-md mx-auto leading-relaxed">
            AI가 당신만의 이야기를 엮고,<br />
            <span className="text-brand-accent font-medium">테트리스 배틀</span>로 운명을 결정한다
          </p>
        </div>

        {/* 특징 태그 */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: '🤖', text: 'AI 게임 마스터' },
            { icon: '🧩', text: '테트리스 전투' },
            { icon: '⚔', text: '클래스 & 스킬 트리' },
            { icon: '📜', text: '다중 엔딩' },
            { icon: '🔥', text: '필드 이벤트' },
          ].map((tag) => (
            <span key={tag.text}
              className="badge bg-brand-panelLight gap-1.5 text-brand-textMuted">
              {tag.icon} {tag.text}
            </span>
          ))}
        </div>

        {/* 로그인 카드 */}
        <div className="panel-glow p-8 w-full max-w-sm space-y-5 animate-scale-in"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="text-center">
            <h2 className="font-display text-lg text-brand-text mb-1">모험 시작</h2>
            <p className="text-brand-muted text-xs">계정으로 진행 상황을 저장합니다</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={!!loginLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3
                         bg-white text-gray-800 font-medium rounded-xl text-sm
                         hover:bg-gray-50 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {loginLoading === 'google' ? (
                <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.1-10.3 7.1-17.2z"/>
                  <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.8-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.6H2.8v6.2C6.7 42.7 14.8 48 24 48z"/>
                  <path fill="#FBBC05" d="M10.8 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.8C1 17.4 0 20.6 0 24s1 6.6 2.8 9.1l8-4.2z"/>
                  <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.4 30.4 0 24 0 14.8 0 6.7 5.3 2.8 13.1l8 6.2C12.7 13.6 17.9 9.5 24 9.5z"/>
                </svg>
              )}
              Google로 시작하기
            </button>

            <button
              onClick={handleDiscord}
              disabled={!!loginLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3
                         bg-[#5865F2] text-white font-medium rounded-xl text-sm
                         hover:bg-[#4752C4] transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {loginLoading === 'discord' ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="18" height="14" viewBox="0 0 71 55" fill="white" aria-hidden>
                  <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a40.7 40.7 0 0 0-1.8 3.7 54.2 54.2 0 0 0-16.3 0A38.7 38.7 0 0 0 25.6.4 58.4 58.4 0 0 0 11 5C1.6 19 -1 32.7.3 46.2a58.9 58.9 0 0 0 18 9.1 42.6 42.6 0 0 0 3.7-6 38.4 38.4 0 0 1-5.8-2.8l1.4-1.1a41.9 41.9 0 0 0 36 0l1.4 1.1a38.3 38.3 0 0 1-5.9 2.8 42.4 42.4 0 0 0 3.7 6 58.7 58.7 0 0 0 18-9.1C72 30.6 68.5 17 60.1 4.9zM23.8 38.1c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2zm23.4 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.2 6.4 7.2s-2.9 7.2-6.4 7.2z"/>
                </svg>
              )}
              Discord로 시작하기
            </button>
          </div>

          <p className="text-center text-brand-muted text-2xs font-mono">
            로그인 시 이용약관에 동의하는 것으로 간주됩니다
          </p>

          <div className="text-center">
            <button onClick={() => navigate('/try')}
              className="text-brand-muted text-xs font-mono hover:text-brand-text transition-colors">
              로그인 없이 체험하기 →
            </button>
          </div>
        </div>

        {/* 소셜 공유 */}
        <div className="flex gap-3 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <button
            onClick={() => {
              const text = 'AI 게임 마스터 × 테트리스 배틀 TRPG — BlockQuest'
              const url  = window.location.origin
              if (navigator.share) {
                navigator.share({ title: 'BlockQuest', text, url }).catch(() => {})
              } else {
                navigator.clipboard.writeText(`${text}\n${url}`)
                  .then(() => alert('링크가 복사되었습니다!'))
              }
            }}
            className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
            🔗 공유하기
          </button>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("AI 게임 마스터 × 테트리스 배틀 TRPG BlockQuest")}&url=${encodeURIComponent(window.location.origin)}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
            𝕏 트위터
          </a>
        </div>

        {/* 미리보기 통계 */}
        <div className="flex gap-10 text-center animate-fade-in"
          style={{ animationDelay: '400ms' }}>
          {[
            { value: '5편', label: 'AI 스토리' },
            { value: '7종', label: '플레이어 클래스' },
            { value: '∞', label: '매번 다른 전개' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-2xl text-brand-accent">{stat.value}</div>
              <div className="text-brand-muted text-xs font-mono">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* ── 특징 섹션 ── */}
      <section id="features" className="relative z-10 px-8 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl text-center text-brand-text mb-8 tracking-widest">
            게임 특징
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <FeatureCard
              icon="🤖" delay={0}
              title="AI 게임 마스터"
              desc="AI가 당신의 선택에 실시간으로 반응하며 매번 다른 스토리를 생성합니다. 같은 모험은 두 번 없습니다."
            />
            <FeatureCard
              icon="🧩" delay={100}
              title="전략적 테트리스 배틀"
              desc="락 딜레이, 가비지 상쇄, T-Spin까지 — 깊이 있는 대전 퍼즐이 스토리와 맞물립니다."
            />
            <FeatureCard
              icon="⚔" delay={200}
              title="7개 클래스 & 성장"
              desc="엔딩을 달성해 숨겨진 클래스를 해금하고, 스킬 트리로 나만의 빌드를 완성하세요."
            />
          </div>
        </div>
      </section>

      {/* ── 게임 미리보기 섹션 ── */}
      <section className="relative z-10 px-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl text-center text-brand-text mb-3 tracking-widest">
            이렇게 플레이합니다
          </h2>
          <p className="text-center text-brand-muted text-sm font-body mb-10">
            AI가 들려주는 이야기 속에서 선택하고, 테트리스 배틀로 운명을 가릅니다
          </p>

          {/* 목업: GM 스토리 화면 */}
          <div className="panel p-5 mb-4 animate-fade-in">
            <div className="text-brand-muted font-mono text-2xs mb-2">[게임 마스터]</div>
            <p className="text-brand-text font-body text-sm leading-relaxed mb-4">
              무너진 성문 너머, 검은 별빛에 부식된 갑옷이 스스로 움직인다. 녹슨 검을 들어올린
              기사가 천천히 고개를 든다. <span className="text-brand-muted">"넘어설 수 있겠나, 살아있는 자여."</span>
            </p>
            <div className="space-y-2">
              {['검을 뽑아 정면으로 맞선다', '기사에게 말을 건넨다', '주변에서 약점을 찾는다'].map((c, i) => (
                <div key={i}
                  className="px-4 py-2.5 rounded-lg border border-brand-border bg-brand-panelLight
                             font-body text-sm text-brand-text flex items-center gap-3">
                  <span className="text-brand-accent font-mono text-xs">{i + 1}</span>{c}
                </div>
              ))}
            </div>
          </div>

          {/* 화살표 */}
          <div className="text-center text-brand-accent text-2xl mb-4 animate-pulse">↓</div>

          {/* 목업: 전투 화면 */}
          <div className="panel p-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-sm text-brand-accent tracking-widest">⚔ 배틀 개시</span>
              <span className="font-mono text-xs text-brand-danger">VS 배신의 기사 랜슬롯</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* 플레이어 보드 미니 */}
              <div className="bg-brand-bg rounded-lg p-2 border border-brand-border">
                <div className="grid grid-cols-6 gap-0.5">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const filled = [14,15,20,21,26,27,28,32,33,34].includes(i)
                    return <div key={i} className={`aspect-square rounded-sm ${filled ? 'bg-brand-accent' : 'bg-brand-panelLight'}`} />
                  })}
                </div>
                <div className="text-center text-2xs font-mono text-brand-muted mt-1.5">YOU</div>
              </div>
              {/* 상대 보드 미니 */}
              <div className="bg-brand-bg rounded-lg p-2 border border-brand-border">
                <div className="grid grid-cols-6 gap-0.5">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const filled = [25,30,31,29].includes(i)
                    return <div key={i} className={`aspect-square rounded-sm ${filled ? 'bg-brand-danger' : 'bg-brand-panelLight'}`} />
                  })}
                </div>
                <div className="text-center text-2xs font-mono text-brand-muted mt-1.5">ENEMY</div>
              </div>
            </div>
            <p className="text-center text-brand-muted text-2xs font-mono mt-3">
              라인을 비워 적을 압박하고, 받은 공격은 상쇄하세요
            </p>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="relative z-10 border-t border-brand-border px-8 py-4
                         flex items-center justify-between text-brand-muted text-xs font-mono">
        <span>© 2026 BlockQuest</span>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/legal?tab=privacy')}
            className="hover:text-brand-text transition-colors">개인정보처리방침</button>
          <button onClick={() => navigate('/legal?tab=terms')}
            className="hover:text-brand-text transition-colors">이용약관</button>
        </div>
      </footer>
    </div>
  )
}
