import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { CLASSES } from '../game/classes'

const ENDING_MAP = {
  true_ending:    { label: '탑의 해방',      color: '#4ade80', story: '망각의 탑' },
  harmony_ending: { label: '완전한 화음',    color: '#ff44cc', story: '심연의 노래' },
  memory_ending:  { label: '기억의 해방',    color: '#ff8800', story: '폐허의 기억' },
  secret_ending:  { label: '정령과의 계약', color: '#aa88ff', story: '망각의 탑' },
  thief_ending:   { label: '자유로운 선율', color: '#ffaa00', story: '심연의 노래' },
  machine_ending: { label: '기계와의 동행', color: '#88aaff', story: '폐허의 기억' },
  redemption_ending: { label: '기사들의 안식', color: '#ffd23f', story: '별을 삼킨 성채' },
  fallen_ending:     { label: '새로운 별',     color: '#aa44ff', story: '별을 삼킨 성채' },
  escape_ending:     { label: '살아남은 자',   color: '#88aaff', story: '별을 삼킨 성채' },
  free_ending:       { label: '함선의 정지',   color: '#4ade80', story: '정지된 함선' },
  survivor_ending:   { label: '차가운 귀환',   color: '#88aaff', story: '정지된 함선' },
  bad_ending:     { label: '탑에 삼켜지다', color: '#ff5d73', story: null },
}

const GUIDE_LABELS = {
  default: '망각의 탑',
  ruins:   '폐허의 기억',
  abyss:   '심연의 노래',
  citadel: '별을 삼킨 성채',
  vessel:  '정지된 함선',
}

function StatCard({ label, value, color }) {
  return (
    <div className="panel p-4 text-center">
      <div className="font-display text-2xl font-black mb-0.5" style={{ color }}>{value}</div>
      <div className="text-brand-muted font-mono text-xs">{label}</div>
    </div>
  )
}

function SkeletonCard() {
  return <div className="panel h-16 animate-pulse opacity-30" />
}

export default function RunHistory() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [runs,    setRuns]    = useState([])
  const [best,    setBest]    = useState(null)
  const [stats,   setStats]   = useState(null)
  const [fetching, setFetching] = useState(true)
  const [filter,  setFilter]  = useState('all') // all | cleared | failed

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    Promise.all([api.runHistory(), api.bestRun(), api.runStats()])
      .then(([h, b, s]) => {
        setRuns(h.runs ?? [])
        setBest(b.best)
        setStats(s)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user])

  const filtered = useMemo(() => runs.filter(r => {
    if (filter === 'cleared') return r.cleared
    if (filter === 'failed')  return !r.cleared && r.status === 'finished'
    return r.status !== 'active'
  }), [runs, filter])

  const clearedCount = useMemo(() => runs.filter(r => r.cleared).length, [runs])

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* 헤더 */}
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl text-brand-text tracking-widest mb-1">전적</h1>
          <p className="text-brand-muted font-mono text-sm">
            {fetching ? '로딩 중...' : `${runs.length}번의 모험 · ${clearedCount}번 클리어`}
          </p>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fetching
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : [
                { label: '총 런',    value: stats?.total_runs ?? runs.length,            color: '#e8e6ff' },
                { label: '클리어',   value: stats?.cleared ?? clearedCount, color: '#4ade80' },
                { label: '클리어율', value: `${stats?.clear_rate ?? 0}%`,               color: '#8b5cff' },
                { label: '총 라인',  value: (stats?.total_lines ?? 0).toLocaleString(),  color: '#ffd23f' },
              ].map(s => <StatCard key={s.label} {...s} />)
          }
        </div>

        {/* 최고 기록 */}
        {best && (
          <div className="panel p-5 animate-slide-up" style={{ borderColor: 'rgba(255,215,0,0.25)' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏆</span>
              <h3 className="font-display text-sm text-brand-gold tracking-widest">최고 기록</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { l: '클래스',  v: `${CLASSES[best.player_class]?.icon ?? ''} ${CLASSES[best.player_class]?.name ?? best.player_class}` },
                { l: '스토리',  v: GUIDE_LABELS[best.guide_id] ?? '-',        c: '#8b5cff' },
                { l: '라인',    v: best.total_lines,                           c: '#4ade80' },
                { l: '레벨',    v: `Lv${best.final_level}`,                   c: '#8b5cff' },
                { l: '골드',    v: `G${best.final_gold}`,                     c: '#ffd23f' },
              ].map(({ l, v, c }) => (
                <div key={l} className="text-center">
                  <div className="text-brand-muted font-mono text-2xs mb-1">{l}</div>
                  <div className="font-mono text-sm font-bold" style={{ color: c ?? '#e8e6ff' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="flex gap-1">
          {[['all','전체'],['cleared','클리어'],['failed','실패']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all
                ${filter === val ? 'bg-brand-accent text-white' : 'btn-ghost'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* 런 목록 */}
        <div className="space-y-2">
          {fetching
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
              ? (
                <div className="panel p-12 text-center">
                  <p className="text-brand-muted font-body text-sm mb-4">
                    {filter === 'all' ? '아직 기록이 없습니다' : '해당 조건의 기록이 없습니다'}
                  </p>
                  {filter === 'all' && (
                    <button onClick={() => navigate('/story-select')} className="btn-primary text-sm px-6 py-2">
                      첫 모험 시작하기
                    </button>
                  )}
                </div>
              )
              : filtered.map((run, i) => {
                const cls    = CLASSES[run.player_class]
                const ending = ENDING_MAP[run.ending_id]
                return (
                  <div key={run.id}
                    className="panel px-4 py-3 flex items-center justify-between
                               hover:border-brand-borderLight transition-colors animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                    {/* 왼쪽 */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-brand-muted font-mono text-xs w-5 text-right opacity-40 shrink-0">{i + 1}</span>
                      <span className="text-xl shrink-0">{cls?.icon ?? '?'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-brand-text">
                            {cls?.name ?? run.player_class}
                          </span>
                          {run.guide_id && run.guide_id !== 'default' && (
                            <span className="badge text-2xs">{GUIDE_LABELS[run.guide_id]}</span>
                          )}
                          {run.cleared && (
                            <span className="font-mono text-2xs text-brand-success border border-brand-success/40 px-1.5 py-0.5 rounded-full">
                              CLEAR
                            </span>
                          )}
                        </div>
                        <div className="text-brand-muted text-2xs font-mono mt-0.5">
                          {new Date(run.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    {/* 오른쪽 */}
                    <div className="flex items-center gap-4 font-mono text-xs text-brand-muted shrink-0 ml-2">
                      {ending && (
                        <span style={{ color: ending.color }}>{ending.label}</span>
                      )}
                      <span className="text-brand-success">{run.total_lines ?? 0}줄</span>
                      <span className="text-brand-accent hidden sm:inline">Lv{run.final_level ?? 1}</span>
                      <span className="text-brand-gold hidden sm:inline">G{run.final_gold ?? 0}</span>
                    </div>
                  </div>
                )
              })
          }
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <button onClick={() => navigate('/story-select')} className="btn-primary px-8 py-3 font-display tracking-widest">
            새 런 시작
          </button>
        </div>
      </div>
    </div>
  )
}
