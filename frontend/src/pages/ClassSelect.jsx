import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { CLASSES, isClassUnlocked } from '../game/classes'
import { gameStorage } from '../lib/gameStorage'
import { api } from '../lib/api'
import { sound } from '../lib/sound'

const CLASS_LIST = Object.values(CLASSES)

const CLASS_STATS = {
  warrior:  { attack: 3, defense: 5, speed: 2, magic: 1 },
  mage:     { attack: 4, defense: 2, speed: 3, magic: 5 },
  rogue:    { attack: 5, defense: 2, speed: 5, magic: 2 },
  paladin:  { attack: 3, defense: 5, speed: 2, magic: 3 },
  summoner: { attack: 5, defense: 2, speed: 4, magic: 5 },
}

const CLASS_LORE = {
  warrior:  '수십 번의 전쟁을 살아남은 노련한 전사. 방패 뒤에서 착실히 기회를 노리며, 한 번 결심하면 끝까지 밀어붙인다.',
  mage:     '금지된 시간의 마법을 연구하는 학자. 낙하 속도를 늦추고 미래를 미리 읽는 능력으로 최적의 배치를 계산한다.',
  rogue:    '그림자 속을 누비는 암살자. 쉴 새 없이 블록을 바꾸고 빠른 손놀림으로 적을 압도한다.',
  paladin:  '신성한 빛으로 무장한 수호자. 절체절명의 순간 한 번 더 일어설 수 있다. 진 엔딩을 달성하면 해금된다.',
  summoner: '이계의 존재를 불러내는 신비로운 마법사. 라인을 클리어할 때마다 소환된 존재가 적을 공격한다. 시크릿 엔딩을 달성하면 해금된다.',
}

function StatBar({ label, value, max = 5, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-brand-muted font-mono text-2xs w-14 shrink-0">{label}</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < value ? '' : 'bg-brand-border'}`}
            style={i < value ? { backgroundColor: color } : undefined} />
        ))}
      </div>
    </div>
  )
}

export default function ClassSelect() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [selected,  setSelected]  = useState(null)
  const [hovered,   setHovered]   = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [unlocks,   setUnlocks]   = useState([])
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.unlocks().catch(() => ({ unlocks: [] })),
      api.paymentStatus().catch(() => ({ status: null })),
    ]).then(([u, p]) => {
      setUnlocks(u.unlocks ?? [])
      setIsPremium(p.status === 'active')
    })
  }, [user])

  const activeId = hovered ?? selected
  const active   = CLASSES[activeId]

  const isAvailable = (cls) => {
    if (!isClassUnlocked(cls.id, unlocks)) return false
    // 프리미엄 클래스는 구독 필요
    if (cls.premium && !isPremium) return false
    return true
  }

  const handleStart = () => {
    if (!selected || confirmed || !isAvailable(CLASSES[selected])) return
    setConfirmed(true)
    const returnTo = new URLSearchParams(window.location.search).get('return')
    if (returnTo === 'endless') {
      // 엔드리스용 클래스 변경 — 진행 중 런은 건드리지 않음
      gameStorage.setPlayerClass(selected)
      navigate('/endless')
      return
    }
    gameStorage.clearAll()
    gameStorage.setPlayerClass(selected)
    navigate('/game')
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg overflow-hidden">
      {/* 배경 글로우 */}
      {active && (
        <div className="fixed inset-0 pointer-events-none transition-all duration-700"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${active.color}12 0%, transparent 70%)` }} />
      )}

      <Navbar />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 px-6 py-10">
        <div className="text-center animate-fade-in">
          <h1 className="font-display text-4xl text-brand-text mb-1 tracking-widest">클래스 선택</h1>
          <p className="text-brand-muted font-mono text-sm">당신의 모험 방식을 선택하세요</p>
        </div>

        {/* 클래스 카드 그리드 */}
        <div className="flex flex-wrap justify-center gap-4">
          {CLASS_LIST.map((cls, i) => {
            const available   = isAvailable(cls)
            const isSelected  = selected === cls.id
            const isHovered   = hovered  === cls.id
            const unlocked    = isClassUnlocked(cls.id, unlocks)
            const needsPremium = cls.premium && !isPremium

            return (
              <button
                key={cls.id}
                onClick={() => {
                  if (!available) {
                    if (needsPremium) navigate('/upgrade')
                    return
                  }
                  setSelected(cls.id)
                  sound.menuClick()
                }}
                onMouseEnter={() => setHovered(cls.id)}
                onMouseLeave={() => setHovered(null)}
                className={`panel relative flex flex-col items-center gap-3 p-6 w-44
                            transition-all duration-250 animate-slide-up
                            ${available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                style={{
                  animationDelay:   `${i * 70}ms`,
                  animationFillMode:'both',
                  borderColor: isSelected ? cls.color : isHovered && available ? `${cls.color}66` : undefined,
                  boxShadow:   isSelected ? `0 0 28px ${cls.color}44, 0 4px 32px rgba(0,0,0,0.5)` : undefined,
                  transform:   isSelected ? 'translateY(-4px) scale(1.04)' : isHovered && available ? 'translateY(-2px)' : undefined,
                }}
              >
                {/* 선택 체크 */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cls.color }}>
                    <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}

                {/* 잠금 아이콘 */}
                {!available && (
                  <div className="absolute top-2.5 right-2.5 text-brand-muted text-xs">
                    {needsPremium ? '✦' : '🔒'}
                  </div>
                )}

                <div className="text-4xl transition-transform duration-300"
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 10px ${cls.color})` : undefined,
                    transform: isSelected ? 'scale(1.1)' : undefined,
                    opacity: available ? 1 : 0.5,
                  }}>
                  {cls.icon}
                </div>

                <div className="text-center">
                  <h3 className="font-display text-base font-bold"
                    style={{ color: available ? cls.color : '#666' }}>
                    {cls.name}
                  </h3>
                  {!unlocked && (
                    <p className="text-brand-muted font-mono text-2xs mt-0.5">엔딩 달성 시 해금</p>
                  )}
                  {unlocked && needsPremium && (
                    <p className="font-mono text-2xs mt-0.5" style={{ color: cls.color }}>✦ 프리미엄</p>
                  )}
                </div>

                {/* 스탯 바 */}
                <div className="w-full space-y-1">
                  {Object.entries(CLASS_STATS[cls.id] ?? {}).map(([stat, val]) => (
                    <StatBar key={stat}
                      label={{ attack:'공격', defense:'방어', speed:'속도', magic:'마법' }[stat]}
                      value={val}
                      color={available ? cls.color : '#333355'} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* 선택 클래스 설명 */}
        <div className="h-24 flex flex-col items-center justify-center max-w-2xl text-center transition-all duration-300">
          {activeId ? (
            <div className="animate-fade-in space-y-2">
              <p className="text-brand-textMuted font-body text-sm leading-relaxed px-4">
                {CLASS_LORE[activeId]}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {(CLASSES[activeId]?.bonusDescription ?? []).map((b, i) => (
                  <span key={i} className="badge text-2xs"
                    style={{ color: CLASSES[activeId].color, borderColor: `${CLASSES[activeId].color}44` }}>
                    ✦ {b}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-brand-muted font-mono text-sm">카드를 선택하세요</p>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={!selected || confirmed || !isAvailable(CLASSES[selected] ?? {})}
          className="btn-primary text-base px-14 py-3.5 font-display tracking-widest disabled:opacity-30"
        >
          {confirmed ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              로딩 중...
            </span>
          ) : selected
            ? `${CLASSES[selected].name}으로 시작`
            : '클래스를 선택하세요'
          }
        </button>
      </main>
    </div>
  )
}
