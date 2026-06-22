import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import LoadError from '../components/layout/LoadError'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { CLASSES, isClassUnlocked } from '../game/classes'
import { TITLES, getUnlockedTitles, getActiveTitle, setActiveTitle, getTitle, RARITY_COLORS as TITLE_RARITY_COLORS } from '../game/titles'
import {
  ACHIEVEMENTS, RARITY_COLORS,
  getEarnedAchievements, getAchievementStats,
} from '../game/achievements'

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common']
// 업적은 정적이므로 모듈 레벨에서 1회만 정렬
const SORTED_ACHIEVEMENTS = RARITY_ORDER.flatMap(r =>
  Object.values(ACHIEVEMENTS).filter(a => a.rarity === r)
)

function AchievementCard({ ach, earned }) {
  const color = earned ? (RARITY_COLORS[ach.rarity] ?? '#aaaacc') : '#333355'
  // 히든 업적은 미달성 시 내용을 가림 (발견의 재미)
  const concealed = ach.hidden && !earned
  const name = concealed ? '???' : ach.name
  const desc = concealed ? '숨겨진 업적입니다. 조건을 발견해보세요.' : ach.desc
  const icon = concealed ? '❔' : ach.icon
  return (
    <div className={`panel p-4 flex gap-3 items-start transition-all duration-200
      ${earned ? 'card-hover' : 'opacity-40'}`}
      style={earned ? { borderColor: `${color}33` } : {}}>
      <div className="text-2xl shrink-0" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-display text-sm text-brand-text font-bold truncate">{name}</span>
          <span className="font-mono text-2xs px-1.5 py-0.5 rounded-full border shrink-0"
            style={{ color, borderColor: `${color}44` }}>
            {concealed ? 'hidden' : ach.rarity}
          </span>
        </div>
        <p className="text-brand-muted font-body text-xs leading-relaxed">{desc}</p>
        {earned && (
          <p className="text-brand-success font-mono text-2xs mt-1">✓ 달성</p>
        )}
      </div>
    </div>
  )
}

function ClassCard({ cls, unlocked, unlockedContent }) {
  const locked = !isClassUnlocked(cls.id, unlockedContent)
  return (
    <div className={`panel p-5 flex flex-col gap-3 transition-all duration-200
      ${!locked ? 'card-hover' : 'opacity-50'}`}
      style={!locked ? { borderColor: `${cls.color}33` } : {}}>
      <div className="flex items-center gap-3">
        <div className="text-3xl" style={{ filter: locked ? 'grayscale(1)' : 'none' }}>
          {cls.icon}
        </div>
        <div>
          <div className="font-display text-base font-bold" style={{ color: locked ? '#666' : cls.color }}>
            {cls.name}
          </div>
          {locked && cls.unlockRequirement && (
            <div className="text-brand-muted font-mono text-2xs mt-0.5">
              🔒 {cls.unlockRequirement === 'true_ending' ? '진 엔딩 달성 시 해금' : '시크릿 엔딩 달성 시 해금'}
            </div>
          )}
          {!locked && !cls.unlockRequirement && (
            <div className="text-brand-success font-mono text-2xs">✓ 해금됨</div>
          )}
          {!locked && cls.unlockRequirement && (
            <div className="text-brand-success font-mono text-2xs">✓ 특별 클래스 해금</div>
          )}
        </div>
      </div>
      <p className="text-brand-muted text-xs font-body leading-relaxed">{cls.description}</p>
      {!locked && (
        <div className="flex flex-wrap gap-1">
          {cls.bonusDescription.map(b => (
            <span key={b} className="badge text-2xs" style={{ color: cls.color, borderColor: `${cls.color}33` }}>
              ✦ {b}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Profile() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  const [stats,   setStats]   = useState(null)
  const [best,    setBest]    = useState(null)
  const [unlocks, setUnlocks] = useState([])
  const [fetching, setFetching] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadData = useCallback(() => {
    if (!user) return
    setFetching(true)
    setLoadError(false)
    Promise.all([api.runStats(), api.bestRun(), api.unlocks()])
      .then(([s, b, u]) => {
        setStats(s)
        setBest(b.best)
        setUnlocks(u.unlocks ?? [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setFetching(false))
  }, [user])

  useEffect(() => { loadData() }, [loadData])
  const [activeTab, setActiveTab] = useState('stats')
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('payment') === 'success') {
      window.history.replaceState({}, '', '/profile')
      // 웹훅 처리에 시간이 걸릴 수 있어 잠시 폴링하며 프리미엄 반영 확인
      let tries = 0
      const check = async () => {
        tries++
        try {
          const sub = await api.subscriptionMe()
          if (sub?.is_premium) {
            showToast('✦ 프리미엄 업그레이드 완료!', 'success')
            loadData()
            return
          }
        } catch (_) {}
        if (tries < 5) {
          setTimeout(check, 2000)
        } else {
          showToast('결제가 확인되는 중입니다. 잠시 후 새로고침해주세요.', 'info')
        }
      }
      check()
    }
  }, [location.search, loadData])

  const earnedIds = getEarnedAchievements()
  const achStats  = getAchievementStats()

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  const avatar   = user?.user_metadata?.avatar_url
  const username = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '모험가'

  const sortedAchs = SORTED_ACHIEVEMENTS

  const tabs = [
    { id: 'stats',        label: '📊 통계' },
    { id: 'achievements', label: `🏆 업적 (${earnedIds.length}/${Object.keys(ACHIEVEMENTS).length})` },
    { id: 'classes',      label: '⚔ 클래스' },
    { id: 'titles',       label: '🏅 칭호' },
  ]

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar actions={
        <button onClick={() => { if (window.confirm('로그아웃 하시겠습니까?')) logout() }}
          className="btn-ghost text-xs px-3 py-1.5 hover:text-brand-danger hover:border-brand-danger/40">
          로그아웃
        </button>
      } />

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* 프로필 헤더 */}
        <div className="panel p-6 flex items-center gap-6 animate-fade-in">
          {avatar
            ? <img src={avatar} alt={username} className="w-16 h-16 rounded-full border-2 border-brand-border" />
            : <div className="w-16 h-16 rounded-full bg-brand-accent/20 flex items-center justify-center
                              border-2 border-brand-accent/40 font-display text-2xl text-brand-accent">
                {username[0]?.toUpperCase()}
              </div>
          }
          <div className="flex-1">
            <h1 className="font-display text-2xl text-brand-text">{username}</h1>
            {(() => {
              const t = getTitle(getActiveTitle())
              return (
                <span className="inline-block font-mono text-xs mt-1 px-2 py-0.5 rounded-full border"
                  style={{ color: TITLE_RARITY_COLORS[t.rarity], borderColor: `${TITLE_RARITY_COLORS[t.rarity]}55` }}>
                  🏅 {t.name}
                </span>
              )
            })()}
            <p className="text-brand-muted font-mono text-sm mt-1">{user?.email}</p>
            {stats && (
              <div className="flex gap-4 mt-3 font-mono text-xs text-brand-muted">
                <span>{stats.total_runs}번의 모험</span>
                <span>·</span>
                <span className="text-brand-success">{stats.cleared}번 클리어</span>
                <span>·</span>
                <span className="text-brand-gold">{stats.total_lines}줄</span>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/class-select')}
            className="btn-primary text-sm px-5 py-2.5">
            새 모험 시작
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-brand-border">
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-mono transition-all duration-150 border-b-2 -mb-px
                ${activeTab === tab.id
                  ? 'text-brand-accent border-brand-accent'
                  : 'text-brand-muted border-transparent hover:text-brand-text'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 통계 탭 */}
        {activeTab === 'stats' && loadError && (
          <LoadError onRetry={loadData} />
        )}
        {activeTab === 'stats' && !loadError && (
          <div className="space-y-6 animate-fade-in">
            {/* 주요 지표 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {fetching
                ? Array.from({length: 4}).map((_, i) => (
                    <div key={i} className="panel p-5 animate-pulse h-24 opacity-40" />
                  ))
                : [
                    { label: '총 런',    value: stats?.total_runs  ?? 0, color: '#e8e6ff' },
                    { label: '클리어',   value: stats?.cleared     ?? 0, color: '#4ade80' },
                    { label: '클리어율', value: `${stats?.clear_rate ?? 0}%`, color: '#8b5cff' },
                    { label: '총 라인',  value: (stats?.total_lines ?? 0).toLocaleString(), color: '#ffd23f' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="panel p-5 text-center">
                      <div className="font-display text-3xl font-black mb-1" style={{ color }}>{value}</div>
                      <div className="text-brand-muted font-mono text-xs">{label}</div>
                    </div>
                  ))
              }
            </div>

            {/* 최고 기록 */}
            {best && (
              <div className="panel p-5" style={{ borderColor: 'rgba(255,215,0,0.25)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-brand-gold text-xl">🏆</span>
                  <h3 className="font-display text-sm text-brand-gold tracking-widest">최고 기록</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { l: '클래스',   v: `${CLASSES[best.player_class]?.icon} ${CLASSES[best.player_class]?.name ?? best.player_class}` },
                    { l: '라인',     v: best.total_lines,  c: '#4ade80' },
                    { l: '레벨',     v: `Lv${best.final_level}`, c: '#8b5cff' },
                    { l: '골드',     v: `G${best.final_gold}`, c: '#ffd23f' },
                    { l: '엔딩',     v: best.ending_id ?? '-', c: '#e8e6ff' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="text-center">
                      <div className="text-brand-muted font-mono text-2xs mb-1">{l}</div>
                      <div className="font-mono text-sm font-bold" style={{ color: c ?? '#e8e6ff' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 선호 클래스 */}
            {stats?.fav_class && (
              <div className="panel p-4 flex items-center gap-3">
                <span className="text-brand-muted font-mono text-xs">가장 많이 플레이한 클래스</span>
                <span className="font-display text-sm" style={{ color: CLASSES[stats.fav_class]?.color }}>
                  {CLASSES[stats.fav_class]?.icon} {CLASSES[stats.fav_class]?.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 업적 탭 */}
        {activeTab === 'achievements' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-brand-muted font-mono text-xs">
                {earnedIds.length} / {Object.keys(ACHIEVEMENTS).length} 달성
              </p>
              <div className="h-1.5 w-48 bg-brand-panel rounded-full overflow-hidden">
                <div className="h-full bg-brand-accent rounded-full"
                  style={{ width: `${(earnedIds.length / Object.keys(ACHIEVEMENTS).length) * 100}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sortedAchs.map(ach => (
                <AchievementCard key={ach.id} ach={ach} earned={earnedIds.includes(ach.id)} />
              ))}
            </div>
          </div>
        )}

        {/* 클래스 탭 */}
        {activeTab === 'classes' && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-brand-muted font-mono text-xs">
              특정 엔딩을 달성하면 숨겨진 클래스가 해금됩니다
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.values(CLASSES).map(cls => (
                <ClassCard key={cls.id} cls={cls} unlockedContent={unlocks} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'titles' && <TitlesTab />}
      </div>
    </div>
  )
}

// ── 칭호 탭 ─────────────────────────────────────────────
function TitlesTab() {
  const [unlocked, setUnlocked] = useState(getUnlockedTitles())
  const [active,   setActive]   = useState(getActiveTitle())

  const handleSelect = (id) => {
    if (!unlocked.includes(id)) return
    setActiveTitle(id)
    setActive(id)
  }

  const sorted = Object.values(TITLES).sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-brand-muted font-mono text-xs">
        획득한 칭호 중 하나를 선택해 프로필에 표시할 수 있습니다 ({unlocked.length}/{Object.keys(TITLES).length})
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map(title => {
          const isUnlocked = unlocked.includes(title.id)
          const isActive   = active === title.id
          const color      = TITLE_RARITY_COLORS[title.rarity]
          return (
            <button key={title.id}
              onClick={() => handleSelect(title.id)}
              disabled={!isUnlocked}
              className={`text-left panel px-4 py-3 transition-all duration-150
                ${isActive ? 'ring-2' : ''}
                ${isUnlocked ? 'card-hover cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              style={isActive ? { borderColor: color, '--tw-ring-color': `${color}66` } : { borderColor: `${color}33` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-base font-bold"
                  style={{ color: isUnlocked ? color : '#555' }}>
                  {isUnlocked ? title.name : '???'}
                </span>
                {isActive && <span className="text-2xs font-mono text-brand-accent">사용 중</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted text-xs font-body">
                  {isUnlocked ? title.desc : '🔒 ' + title.desc}
                </span>
                <span className="font-mono text-2xs uppercase" style={{ color: `${color}aa` }}>
                  {title.rarity}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
