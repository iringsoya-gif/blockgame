import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { gameStorage } from '../lib/gameStorage'
import { sound } from '../lib/sound'
import { STORIES } from '../game/stories'

const STORY_META = STORIES

function DifficultyStars({ n, color }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-2 h-2 rounded-full"
          style={{ backgroundColor: i < n ? color : '#1e1e4a' }} />
      ))}
    </div>
  )
}

export default function StorySelect() {
  const { user, loading } = useAuth()
  const navigate   = useNavigate()
  const [guides,   setGuides]   = useState([])
  const [selected, setSelected] = useState(null)
  const [isPremium,setIsPremium]= useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.guides().catch(() => ({ guides: ['default'] })),
      api.paymentStatus().catch(() => ({ status: null })),
    ]).then(([g, p]) => {
      setGuides(g.guides ?? ['default'])
      setIsPremium(p?.status === 'active')
    }).finally(() => setFetching(false))
  }, [user])

  const canPlay = (guideId) => {
    const meta = STORY_META[guideId]
    if (!meta?.premium) return true
    return isPremium
  }

  const handleStart = () => {
    if (!selected || !canPlay(selected)) return
    localStorage.setItem('bq_guide_id', selected)
    sound.menuClick()
    navigate('/class-select')
  }

  const selectedMeta = STORY_META[selected]

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-12">
        <div className="text-center animate-fade-in">
          <h1 className="font-display text-4xl text-brand-text tracking-widest mb-2">스토리 선택</h1>
          <p className="text-brand-muted font-mono text-sm">어떤 세계를 탐험하시겠습니까?</p>
        </div>

        {fetching ? (
          <div className="flex gap-6">
            {[1,2,3].map(i => <div key={i} className="panel w-64 h-80 animate-pulse opacity-30" />)}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-5">
            {guides.map((guideId, i) => {
              const meta       = STORY_META[guideId]
              if (!meta) return null
              const isSelected = selected === guideId
              const locked     = !canPlay(guideId)

              return (
                <button key={guideId}
                  onClick={() => {
                    if (locked) { navigate('/upgrade'); return }
                    setSelected(guideId)
                    sound.menuClick()
                  }}
                  className={`panel w-64 p-6 flex flex-col gap-4 text-left
                              transition-all duration-250 animate-slide-up
                              ${locked ? 'cursor-pointer opacity-75' : 'card-hover cursor-pointer'}`}
                  style={{
                    animationDelay:   `${i * 100}ms`,
                    animationFillMode:'both',
                    borderColor:  isSelected ? meta.theme : undefined,
                    boxShadow:    isSelected ? `0 0 32px ${meta.theme}33, 0 4px 32px rgba(0,0,0,0.5)` : undefined,
                    transform:    isSelected ? 'translateY(-4px) scale(1.02)' : undefined,
                  }}>

                  {/* 헤더 */}
                  <div className="flex items-start justify-between">
                    <div className="text-4xl" style={{ filter: locked ? 'grayscale(0.6)' : 'none' }}>
                      {meta.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: meta.theme }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </div>
                      )}
                      {locked && (
                        <span className="font-mono text-2xs px-2 py-0.5 rounded-full border"
                          style={{ color: '#ffd23f', borderColor: '#ffd23f44', backgroundColor: '#ffd23f11' }}>
                          ✦ 프리미엄
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 제목 */}
                  <div>
                    <h2 className="font-display text-lg font-bold text-brand-text mb-0.5"
                      style={{ color: locked ? undefined : meta.theme === '#8b5cff' ? undefined : meta.theme }}>
                      {meta.title}
                    </h2>
                    <p className="font-mono text-xs" style={{ color: locked ? '#555577' : meta.theme }}>
                      {meta.subtitle}
                    </p>
                  </div>

                  <p className="text-brand-textMuted text-xs font-body leading-relaxed flex-1">
                    {locked ? '프리미엄 구독으로 잠금 해제하세요.' : meta.desc}
                  </p>

                  {/* 태그 */}
                  <div className="flex flex-wrap gap-1">
                    {meta.tags.map(tag => (
                      <span key={tag} className="badge text-2xs"
                        style={{ color: locked ? '#555577' : meta.theme, borderColor: locked ? '#1e1e4a' : `${meta.theme}44` }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 메타 */}
                  <div className="flex items-center justify-between pt-2 border-t border-brand-border">
                    <div className="flex items-center gap-2">
                      <span className="text-brand-muted font-mono text-2xs">난이도</span>
                      <DifficultyStars n={meta.difficulty} color={locked ? '#333355' : meta.theme} />
                    </div>
                    <span className="text-brand-muted font-mono text-2xs">⏱ {meta.estimatedTime}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!selected || !canPlay(selected)}
          className="btn-primary text-base px-14 py-3.5 font-display tracking-widest
                     disabled:opacity-30 animate-scale-in"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          {selected
            ? canPlay(selected)
              ? `${selectedMeta?.title ?? selected} 시작하기`
              : '프리미엄 전용 스토리'
            : '스토리를 선택하세요'}
        </button>

        {/* 프리미엄 유도 */}
        {!isPremium && (
          <p className="text-brand-muted font-mono text-xs text-center">
            <button onClick={() => navigate('/upgrade')}
              className="text-brand-accent hover:text-brand-accentHover transition-colors underline underline-offset-2">
              ✦ 프리미엄
            </button>
            {' '}으로 업그레이드하면 모든 스토리를 플레이할 수 있습니다
          </p>
        )}
      </main>
    </div>
  )
}
