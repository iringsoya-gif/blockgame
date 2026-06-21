import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { CLASSES } from '../game/classes'
import { showToast } from '../components/game/Toast'
import { showAchievement } from '../components/game/AchievementToast'
import { updateStats, checkNewAchievements } from '../game/achievements'
import { checkNewTitles } from '../game/titles'
import { showTitleUnlock } from '../components/game/TitleToast'
import BattleResult from '../components/game/BattleResult'
const TetrisGame = lazy(() => import('../components/game/TetrisGame'))
import { sound } from '../lib/sound'

const VIEW = { LOBBY: 'lobby', ANNOUNCE: 'announce', BATTLE: 'battle', RESULT: 'result' }

function formatDate(d = new Date()) {
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
}

function Stars({ n, max = 5, color = '#ffd700' }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className="w-2 h-2 rounded-full"
          style={{ backgroundColor: i < n ? color : '#1e1e4a' }} />
      ))}
    </div>
  )
}

function RankRow({ entry, isMe }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
      ${isMe ? 'bg-brand-accent/10 border border-brand-accent/30' : 'hover:bg-brand-panelLight'}`}>
      <div className="w-8 text-center shrink-0">
        {medals[entry.rank]
          ? <span className="text-lg">{medals[entry.rank]}</span>
          : <span className="font-mono text-xs text-brand-muted">#{entry.rank}</span>}
      </div>
      {entry.avatar_url
        ? <img src={entry.avatar_url} className="w-7 h-7 rounded-full shrink-0" alt="" />
        : <div className="w-7 h-7 rounded-full bg-brand-accent/20 flex items-center justify-center
                          text-xs text-brand-accent font-bold shrink-0">
            {entry.username?.[0]?.toUpperCase() ?? '?'}
          </div>}
      <span className="flex-1 font-body text-sm text-brand-text truncate">
        {entry.username ?? '모험가'}
        {isMe && <span className="text-brand-accent text-xs ml-1">(나)</span>}
      </span>
      <div className="flex gap-4 font-mono text-xs text-brand-muted shrink-0">
        <span className="text-brand-success">{(entry.score ?? 0).toLocaleString()}pt</span>
        <span className="hidden sm:inline">{entry.lines_cleared}줄</span>
        <span className="hidden sm:inline">{entry.time_taken}s</span>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return <div className="h-12 rounded-xl bg-brand-panel animate-pulse opacity-30" />
}

export default function Challenge() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [view,          setView]          = useState(VIEW.LOBBY)
  const [challenge,     setChallenge]     = useState(null)
  const [battleContext, setBattleContext] = useState(null)  // 전투 컨텍스트
  const [leaderboard,   setLeaderboard]   = useState([])
  const [myHistory,     setMyHistory]     = useState([])
  const [result,        setResult]        = useState(null)
  const [battleResult,  setBattleResult]  = useState(null)
  const [fetching,      setFetching]      = useState(true)
  const [tab,           setTab]           = useState('leaderboard')

  const playerClass = localStorage.getItem('bq_player_class') ?? 'warrior'

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    Promise.all([
      api.todayChallenge(),
      api.challengeLeaderboard(),
      api.challengeHistory(),
    ]).then(([c, lb, h]) => {
      setChallenge(c)
      setLeaderboard(lb.leaderboard ?? [])
      setMyHistory(h.history ?? [])
    }).catch(() => showToast('데이터 로드 실패', 'error'))
    .finally(() => setFetching(false))
  }, [user])

  const startChallenge = useCallback(() => {
    if (!challenge || challenge.already_completed) return
    sound.menuClick()

    // battleContext 미리 생성
    const forcedClass = challenge.forced_class ?? playerClass
    const ctx = {
      ...challenge.battle_context,
      classId:       forcedClass,
      player_skills: ['clear_line', 'swap_block', 'shield', 'time_slow'],
    }
    setBattleContext(ctx)

    setView(VIEW.ANNOUNCE)
    sound.battleStart()
    setTimeout(() => {
      setView(VIEW.BATTLE)
      sound.startBattleBGM()
    }, 1600)
  }, [challenge, playerClass])

  const onBattleEnd = useCallback(async (br) => {
    sound.stopBGM()
    setBattleResult(br)
    setView(VIEW.RESULT)

    const ds = br.detailed_stats ?? {}
    const achStats = updateStats({
      total_battles: 1,
      challenge_wins: br.win ? 1 : 0,
      total_lines: br.lines_cleared ?? 0,
      ...(ds.tetris_count    ? { tetris_count:        ds.tetris_count    } : {}),
      ...(ds.tspin_count     ? { tspin_count:         ds.tspin_count     } : {}),
      ...(ds.perfect_clears  ? { perfect_clear_count: ds.perfect_clears  } : {}),
      ...(ds.max_combo > 0   ? { max_combo:           ds.max_combo       } : {}),
      ...(ds.max_b2b_streak  ? { max_b2b_streak:      ds.max_b2b_streak  } : {}),
    })
    checkNewAchievements(achStats).forEach(a => showAchievement(a))
    checkNewTitles(achStats).forEach(t => showTitleUnlock(t))

    try {
      const submitResult = await api.submitChallenge({
        score:         br.score ?? 0,
        lines_cleared: br.lines_cleared ?? 0,
        time_taken:    br.time_taken ?? 0,
        win:           br.win,
        goal:          br.goal ?? 'versus',
      })
      setResult({ ...br, ...submitResult })
      showToast(`🏆 ${submitResult.message} +${submitResult.xp_bonus}XP +${submitResult.gold_bonus ?? 0}G`, 'success')

      // 1위 달성 + 스트릭 통계 + 칭호
      const rankStats = updateStats({
        ...(submitResult.rank === 1 ? { challenge_first_place: 1 } : {}),
        ...(submitResult.streak ? { max_streak: submitResult.streak } : {}),
      })
      checkNewTitles(rankStats).forEach(t => showTitleUnlock(t))
      checkNewAchievements(rankStats).forEach(a => showAchievement(a))

      // 랭킹 갱신
      api.challengeLeaderboard().then(lb => setLeaderboard(lb.leaderboard ?? []))
    } catch (e) {
      setResult(br)
      showToast(e?.message ?? '결과 제출 실패', 'error')
    }
  }, [])

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin" />
      </div>
    )
  }

  // ── 전투 예고 화면 ─────────────────────────────────
  if (view === VIEW.ANNOUNCE && challenge) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg">
        <div className="text-center space-y-5">
          <p className="font-mono text-brand-muted text-sm tracking-[0.4em] animate-fade-in">
            — DAILY CHALLENGE —
          </p>
          {challenge.rule && (
            <div className="inline-block animate-fade-in">
              <span className="badge text-brand-accent border-brand-accent/50 text-sm px-3 py-1">
                🎯 {challenge.rule.label}
              </span>
            </div>
          )}
          <h2 className="font-display text-6xl font-black text-brand-accent animate-scale-in">
            {challenge.battle_context?.enemy_name}
          </h2>
          <div className="flex flex-col items-center justify-center gap-1.5 animate-fade-in">
            {challenge.rule?.desc && (
              <span className="text-brand-text font-body text-sm">{challenge.rule.desc}</span>
            )}
            <div className="flex items-center justify-center gap-3">
              <span className="badge text-brand-gold border-brand-gold/40">
                ⚡ {challenge.modifier?.label}
              </span>
              <span className="text-brand-muted font-body text-sm">
                {challenge.modifier?.desc}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 전투 화면 ──────────────────────────────────────
  if (view === VIEW.BATTLE && battleContext) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-bg">
        <header className="flex items-center justify-between px-5 py-2.5 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-display text-base text-brand-accent tracking-widest">BlockQuest</span>
            <span className="badge text-brand-gold border-brand-gold/40">🗓 일일 챌린지</span>
          </div>
          <span className="font-mono text-brand-muted text-xs">{formatDate()}</span>
        </header>
        <main className="flex-1 flex justify-center items-start overflow-auto p-2 sm:p-4">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full text-brand-muted font-mono text-sm">전투 준비 중...</div>
          }>
            <TetrisGame context={battleContext} onBattleEnd={onBattleEnd} />
          </Suspense>
        </main>
      </div>
    )
  }

  // ── 결과 화면 ──────────────────────────────────────
  if (view === VIEW.RESULT && result) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="animate-fade-in space-y-3">
          <p className="font-mono text-brand-muted text-xs tracking-widest">— 챌린지 결과 —</p>
          <h2 className="font-display text-5xl font-black"
            style={{ color: result.win ? '#44ff99' : '#ff4466' }}>
            {result.win ? '✦ 성공 ✦' : '✕ 실패 ✕'}
          </h2>
          {result.rank && (
            <p className="font-display text-2xl text-brand-gold">#{result.rank}위</p>
          )}
        </div>

        <div className="panel p-6 grid grid-cols-3 gap-6 min-w-72">
          {[
            { l: '점수', v: (result.score ?? 0).toLocaleString() + 'pt', c: '#44ff99' },
            { l: '라인', v: `${result.lines_cleared ?? 0}줄`,            c: '#7c5cfc' },
            { l: '시간', v: `${result.time_taken ?? 0}초`,               c: '#ffd700' },
          ].map(({ l, v, c }) => (
            <div key={l} className="text-center">
              <div className="text-brand-muted font-mono text-xs mb-1">{l}</div>
              <div className="font-display font-bold text-lg" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {result.xp_bonus && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-4 font-mono text-sm">
              <span className="text-brand-accent">+{result.xp_bonus} XP</span>
              <span className="text-brand-gold">+{result.gold_bonus ?? 0} G</span>
            </div>
            {result.streak > 1 && (
              <p className="font-mono text-xs text-brand-success">
                🔥 {result.streak}일 연속 도전 (+{result.streak_bonus}G 보너스)
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/leaderboard')} className="btn-primary px-6 py-2.5">
            랭킹 보기
          </button>
          <button onClick={() => {
            setView(VIEW.LOBBY)
            api.challengeHistory().then(h => setMyHistory(h.history ?? []))
          }} className="btn-ghost px-6 py-2.5">
            로비
          </button>
        </div>

        {battleResult && <BattleResult result={battleResult} onClose={() => setBattleResult(null)} />}
      </div>
    )
  }

  // ── 로비 화면 ──────────────────────────────────────
  const myEntry = leaderboard.find(e => e.user_id === user?.id)

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* 헤더 */}
        <div className="text-center animate-fade-in">
          <p className="font-mono text-brand-accent text-xs tracking-[0.3em] mb-2">— DAILY CHALLENGE —</p>
          <h1 className="font-display text-3xl text-brand-text">{formatDate()}</h1>
        </div>

        {/* 오늘의 챌린지 카드 */}
        {challenge && (
          <div className="panel p-6 flex flex-col sm:flex-row gap-6 animate-slide-up"
            style={{ borderColor: challenge.already_completed ? 'rgba(68,255,153,0.3)' : 'rgba(124,92,252,0.3)' }}>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-display text-xl text-brand-text">
                  {challenge.battle_context?.enemy_name}
                </span>
                {challenge.already_completed && (
                  <span className="badge border-brand-success/40 text-brand-success text-xs">✓ 완료</span>
                )}
              </div>

              {/* 특별 룰 */}
              {challenge.rule && (
                <div className="panel p-3 flex items-start gap-3 bg-brand-accent/10 border-brand-accent/30">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <div className="font-mono text-sm text-brand-accent font-bold">
                      {challenge.rule.label}
                    </div>
                    <div className="text-brand-muted text-xs font-body">
                      {challenge.rule.desc}
                    </div>
                  </div>
                </div>
              )}

              {/* 수식어 */}
              <div className="panel p-3 flex items-start gap-3 bg-brand-panelLight">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-mono text-sm text-brand-accent font-bold">
                    {challenge.modifier?.label}
                  </div>
                  <div className="text-brand-muted text-xs font-body">
                    {challenge.modifier?.desc}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 font-mono text-xs text-brand-muted">
                <div className="flex items-center gap-2">
                  <span>난이도</span>
                  <Stars n={challenge.battle_context?.difficulty ?? 2} />
                </div>
                <span>목표: {challenge.battle_context?.type === 'boss' ? '보스 토벌' : {
                  versus:    '섬멸전',
                  line_race: `${challenge.battle_context?.target_lines}줄 레이스`,
                  survival:  `${challenge.battle_context?.duration_sec}초 생존`,
                  score:     `${challenge.battle_context?.duration_sec}초 점수전`,
                }[challenge.battle_context?.goal] ?? '섬멸전'}</span>
                {challenge.forced_class && (
                  <span className="text-brand-accent">
                    고정: {CLASSES[challenge.forced_class]?.icon} {CLASSES[challenge.forced_class]?.name}
                  </span>
                )}
              </div>

              {challenge.already_completed && challenge.my_score !== null && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-brand-muted">내 점수</span>
                  <span className="text-brand-success font-bold">{challenge.my_score?.toLocaleString()}pt</span>
                  {myEntry && <span className="text-brand-gold">#{myEntry.rank}위</span>}
                </div>
              )}
            </div>

            {/* 참여 버튼 */}
            <div className="shrink-0 flex flex-col items-center justify-center gap-2">
              {challenge.already_completed ? (
                <>
                  <div className="text-4xl">✓</div>
                  <p className="text-brand-success font-mono text-xs">완료</p>
                  <p className="text-brand-muted font-mono text-2xs">내일 새 챌린지</p>
                </>
              ) : (
                <button onClick={startChallenge}
                  className="btn-primary px-8 py-3 font-display tracking-widest">
                  도전하기
                </button>
              )}
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 border-b border-brand-border">
          {[
            { id: 'leaderboard', label: `🏆 오늘 랭킹 (${leaderboard.length}명)` },
            { id: 'history',     label: `📅 내 기록 (${myHistory.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-mono border-b-2 -mb-px transition-colors
                ${tab === t.id ? 'text-brand-accent border-brand-accent' : 'text-brand-muted border-transparent hover:text-brand-text'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 랭킹 */}
        {tab === 'leaderboard' && (
          <div className="space-y-1 animate-fade-in">
            {leaderboard.length === 0 ? (
              <div className="panel p-12 text-center">
                <p className="text-brand-muted font-body text-sm mb-4">
                  아직 도전자가 없습니다. 첫 번째가 되세요!
                </p>
                {!challenge?.already_completed && (
                  <button onClick={startChallenge} className="btn-primary text-sm px-6 py-2">
                    지금 도전하기
                  </button>
                )}
              </div>
            ) : (
              leaderboard.map(entry => (
                <RankRow key={entry.user_id} entry={entry} isMe={entry.user_id === user?.id} />
              ))
            )}
          </div>
        )}

        {/* 기록 */}
        {tab === 'history' && (
          <div className="space-y-2 animate-fade-in">
            {myHistory.length === 0 ? (
              <p className="text-brand-muted font-body text-sm text-center py-8">
                아직 참여 기록이 없습니다
              </p>
            ) : (
              myHistory.map((h, i) => (
                <div key={i} className="panel px-4 py-3 flex items-center justify-between">
                  <div className="font-mono text-sm text-brand-text">
                    {new Date(h.challenge_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex gap-4 font-mono text-xs text-brand-muted">
                    <span className={h.win ? 'text-brand-success' : 'text-brand-danger'}>
                      {h.win ? '성공' : '실패'}
                    </span>
                    <span className="text-brand-success">{(h.score ?? 0).toLocaleString()}pt</span>
                    <span>{h.lines_cleared}줄</span>
                    <span>{h.time_taken}s</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
