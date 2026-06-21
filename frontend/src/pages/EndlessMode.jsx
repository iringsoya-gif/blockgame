/**
 * 엔드리스 모드 — 무한 생존, 레벨이 오를수록 빨라짐
 * 스토리를 다 깬 유저의 반복 플레이 + 최고 기록 경쟁
 */
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { CLASSES } from '../game/classes'
import { showToast } from '../components/game/Toast'
import { showAchievement } from '../components/game/AchievementToast'
import { showTitleUnlock } from '../components/game/TitleToast'
import { updateStats, checkNewAchievements } from '../game/achievements'
import { checkNewTitles } from '../game/titles'
import { sound } from '../lib/sound'
import { gameStorage } from '../lib/gameStorage'

const TetrisGame = lazy(() => import('../components/game/TetrisGame'))

const VIEW = { INTRO: 'intro', ANNOUNCE: 'announce', BATTLE: 'battle', RESULT: 'result' }
const BEST_KEY = 'bq_endless_best'

export default function EndlessMode() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [view, setView]   = useState(VIEW.INTRO)
  const [battleContext, setBattleContext] = useState(null)
  const [result, setResult] = useState(null)
  const [best, setBest] = useState(0)

  const playerClass = gameStorage.getPlayerClass() ?? 'warrior'
  const cls = CLASSES[playerClass] ?? CLASSES.warrior
  const announceTimerRef = useRef(null)

  // unmount 시 타이머 정리 + BGM 정지 (전투 중 이탈 대비)
  useEffect(() => () => {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current)
    sound.stopBGM()
  }, [])

  useEffect(() => {
    if (!loading && !user) navigate('/')
  }, [user, loading, navigate])

  useEffect(() => {
    const v = parseInt(localStorage.getItem(BEST_KEY) ?? '0', 10)
    setBest(Number.isNaN(v) ? 0 : v)
  }, [])

  const startEndless = useCallback(() => {
    sound.menuClick()
    setBattleContext({
      goal:          'endless',
      classId:       playerClass,
      difficulty:    2,
      initial_garbage: 0,
      player_skills: [...(cls.startSkills ?? ['clear_line', 'swap_block'])],
      enemy_skills:  [],
    })
    setView(VIEW.ANNOUNCE)
    sound.battleStart()
    announceTimerRef.current = setTimeout(() => {
      setView(VIEW.BATTLE)
      sound.startBattleBGM()
    }, 1600)
  }, [playerClass, cls])

  const onBattleEnd = useCallback((br) => {
    sound.stopBGM()
    setResult(br)
    setView(VIEW.RESULT)
    const score = br.score ?? 0
    const level = br.endless_level ?? 1
    if (score > best) {
      setBest(score)
      try { localStorage.setItem(BEST_KEY, String(score)) } catch {}
      showToast(`🏆 신기록! ${score.toLocaleString()}점`, 'success')
    }
    // 엔드리스 업적/칭호 통계 기록 (최고 점수/레벨 + 누적 판수 + 전투 통계)
    const ds = br.detailed_stats ?? {}
    const achStats = updateStats({
      endless_games:       1,
      endless_best_score:  score,
      endless_best_level:  level,
      total_lines:         br.lines_cleared ?? 0,
      ...(ds.tetris_count    ? { tetris_count:        ds.tetris_count    } : {}),
      ...(ds.tspin_count     ? { tspin_count:         ds.tspin_count     } : {}),
      ...(ds.max_combo > 0   ? { max_combo:           ds.max_combo       } : {}),
      ...(ds.max_b2b_streak  ? { max_b2b_streak:      ds.max_b2b_streak  } : {}),
    })
    checkNewAchievements(achStats).forEach(a => showAchievement(a))
    checkNewTitles(achStats).forEach(t => showTitleUnlock(t))
    // 서버에 엔드리스 점수 기록 (랭킹 집계용, 실패해도 무시)
    api.submitEndless?.({ score, lines: br.lines_cleared ?? 0 }).catch(() => {})
  }, [best])

  if (loading) return null

  if (view === VIEW.BATTLE && battleContext) {
    return (
      <div className="fixed inset-0 bg-brand-bg">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-brand-muted font-mono text-sm">전투 준비 중...</div>
        }>
          <TetrisGame context={battleContext} onBattleEnd={onBattleEnd} />
        </Suspense>
      </div>
    )
  }

  if (view === VIEW.ANNOUNCE) {
    return (
      <div className="fixed inset-0 bg-brand-bg flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="font-display text-5xl text-brand-accent tracking-widest mb-2">ENDLESS</div>
          <div className="font-mono text-brand-muted">살아남아라. 끝은 없다.</div>
        </div>
      </div>
    )
  }

  if (view === VIEW.RESULT && result) {
    const isNewBest = (result.score ?? 0) >= best
    return (
      <div className="min-h-screen bg-brand-bg">
        <Navbar />
        <div className="max-w-md mx-auto px-5 py-16 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="font-display text-3xl text-brand-text mb-2">게임 종료</h1>
          <div className="panel p-6 my-6 space-y-3">
            <div className="flex justify-between font-mono text-sm">
              <span className="text-brand-muted">점수</span>
              <span className="text-brand-accent text-lg">{(result.score ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span className="text-brand-muted">도달 레벨</span>
              <span className="text-brand-text">Lv.{result.endless_level ?? 1}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span className="text-brand-muted">제거한 줄</span>
              <span className="text-brand-text">{result.lines_cleared ?? 0}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span className="text-brand-muted">최고 기록</span>
              <span className="text-brand-gold">{best.toLocaleString()}</span>
            </div>
            {isNewBest && <div className="text-brand-success font-mono text-xs pt-2">🎉 새로운 최고 기록!</div>}
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => { setResult(null); setView(VIEW.INTRO) }}
              className="btn-primary py-3 font-display tracking-widest">다시 도전</button>
            <button onClick={() => navigate('/')} className="btn-ghost py-2.5 text-sm">홈으로</button>
          </div>
        </div>
      </div>
    )
  }

  // INTRO
  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <div className="max-w-md mx-auto px-5 py-12 text-center">
        <div className="text-5xl mb-3">♾️</div>
        <h1 className="font-display text-3xl text-brand-text mb-2 tracking-widest">엔드리스 모드</h1>
        <p className="text-brand-muted font-body text-sm mb-8 leading-relaxed">
          스토리도 적도 없습니다. 오직 끝없이 쏟아지는 블록과 당신뿐.<br />
          10줄마다 레벨이 오르고 점점 빨라집니다. 얼마나 버틸 수 있나요?
        </p>

        <div className="panel p-5 mb-6 text-left space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-brand-muted">플레이 클래스</span>
            <span className="text-brand-text">{cls.icon} {cls.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">최고 기록</span>
            <span className="text-brand-gold">{best.toLocaleString()}점</span>
          </div>
        </div>

        <button onClick={startEndless}
          className="btn-primary w-full py-3.5 font-display tracking-widest text-base mb-3">
          시작하기
        </button>
        <button onClick={() => navigate('/class-select?return=endless')}
          className="btn-ghost w-full py-2.5 text-sm">
          클래스 변경
        </button>
      </div>
    </div>
  )
}
