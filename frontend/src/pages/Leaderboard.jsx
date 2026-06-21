import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { api } from '../lib/api'
import { CLASSES } from '../game/classes'

const TABS = [
  { id: 'challenge', label: '🗓 일일 챌린지' },
  { id: 'lines',     label: '📊 총 라인' },
  { id: 'runs',      label: '🏃 런 수' },
]

function Medal({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>
  if (rank === 2) return <span className="text-2xl">🥈</span>
  if (rank === 3) return <span className="text-2xl">🥉</span>
  return <span className="text-brand-muted font-mono text-sm w-8 text-center">#{rank}</span>
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg animate-pulse">
      <div className="w-8 h-8 bg-brand-panel rounded-full" />
      <div className="w-8 h-8 bg-brand-panel rounded-full" />
      <div className="flex-1 h-4 bg-brand-panel rounded" />
      <div className="w-20 h-4 bg-brand-panel rounded" />
    </div>
  )
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [tab,         setTab]         = useState('challenge')
  const [data,        setData]        = useState([])
  const [fetching,    setFetching]    = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = async (currentTab) => {
    setFetching(true)
    try {
      let result = []
      if (currentTab === 'challenge') {
        const res = await api.challengeLeaderboard()
        result = (res.leaderboard ?? []).map((e, i) => ({
          rank:   e.rank ?? i + 1,
          userId: e.user_id,
          name:   e.username ?? '모험가',
          avatar: e.avatar_url,
          score:  e.score,
          sub:    `${e.lines_cleared}줄 · ${e.time_taken}초`,
          win:    e.win,
        }))
      } else if (currentTab === 'lines') {
        const res = await api.leaderboardLines()
        result = (res.leaderboard ?? []).map(e => ({
          rank:   e.rank,
          userId: e.id,
          name:   e.username ?? '모험가',
          score:  e.total_lines,
          sub:    `${e.cleared_runs}회 클리어 · Lv${e.max_level}`,
        }))
      } else if (currentTab === 'runs') {
        const res = await api.leaderboardRuns()
        result = (res.leaderboard ?? []).map(e => ({
          rank:   e.rank,
          userId: e.id,
          name:   e.username ?? '모험가',
          score:  e.total_runs,
          sub:    `${e.cleared_runs}회 클리어`,
        }))
      }
      setData(result)
      setLastUpdated(new Date())
    } catch {
      setData([])
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => { fetchData(tab) }, [tab])

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        <div className="animate-fade-in">
          <h1 className="font-display text-3xl text-brand-text tracking-widest mb-1">랭킹</h1>
          {lastUpdated && (
            <p className="text-brand-muted font-mono text-xs">
              업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 border-b border-brand-border pb-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-mono border-b-2 -mb-px transition-colors
                ${tab === t.id ? 'text-brand-accent border-brand-accent' : 'text-brand-muted border-transparent hover:text-brand-text'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 랭킹 목록 */}
        <div className="space-y-1">
          {fetching
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            : data.length === 0
              ? (
                <div className="panel p-12 text-center space-y-3">
                  {tab === 'challenge' ? (
                    <>
                      <p className="text-brand-muted font-body text-sm">오늘 아직 도전자가 없습니다</p>
                      <button onClick={() => navigate('/challenge')}
                        className="btn-primary text-sm px-6 py-2">첫 번째로 도전하기</button>
                    </>
                  ) : (
                    <p className="text-brand-muted font-body text-sm">
                      글로벌 {tab === 'lines' ? '라인' : '런'} 랭킹은 준비 중입니다
                    </p>
                  )}
                </div>
              )
              : data.map((entry, i) => (
                <div key={entry.userId ?? i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                    ${entry.rank <= 3 ? 'panel' : 'hover:bg-brand-panelLight'}`}
                  style={entry.rank <= 3 ? {
                    borderColor: ['rgba(255,215,0,0.4)','rgba(192,192,192,0.3)','rgba(205,127,50,0.3)'][entry.rank - 1]
                  } : {}}>
                  <Medal rank={entry.rank} />
                  {entry.avatar
                    ? <img src={entry.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center
                                      text-xs text-brand-accent font-bold shrink-0">
                        {entry.name[0]?.toUpperCase()}
                      </div>}
                  <span className="flex-1 text-brand-text text-sm font-body truncate">{entry.name}</span>
                  <div className="text-right font-mono text-xs space-y-0.5">
                    <div className="text-brand-success font-bold">
                      {tab === 'challenge'
                        ? `${(entry.score ?? 0).toLocaleString()}pt`
                        : tab === 'lines'
                          ? `${(entry.score ?? 0).toLocaleString()}줄`
                          : `${entry.score ?? 0}런`}
                    </div>
                    <div className="text-brand-muted">{entry.sub}</div>
                  </div>
                </div>
              ))
          }
        </div>

        {/* 갱신 버튼 */}
        <div className="text-center">
          <button onClick={() => fetchData(tab)} disabled={fetching}
            className="btn-ghost text-sm px-5 py-2 disabled:opacity-40">
            {fetching ? '로딩 중...' : '🔄 갱신'}
          </button>
        </div>
      </div>
    </div>
  )
}
