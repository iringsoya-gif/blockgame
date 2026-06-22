import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { api, getGuideId } from '../lib/api'
import { gameStorage } from '../lib/gameStorage'
import { useGame, calcLevel, xpProgress } from '../hooks/useGame'
import { CLASSES } from '../game/classes'
import { STORY_OPENINGS, getBossCount } from '../game/stories'
import { SKILL_UPGRADES } from '../game/skillTree'
import { showToast } from '../components/game/Toast'
import { showAchievement } from '../components/game/AchievementToast'
import { sound } from '../lib/sound'
import { updateStats, checkNewAchievements } from '../game/achievements'
import { checkNewTitles } from '../game/titles'
import { showTitleUnlock } from '../components/game/TitleToast'
import StoryPanel     from '../components/game/StoryPanel'
const TetrisGame = lazy(() => import('../components/game/TetrisGame'))
import SkillTreeModal from '../components/game/SkillTreeModal'
import NPCRelationPanel from '../components/game/NPCRelationPanel'
import ProgressBar    from '../components/game/ProgressBar'
import SoundSettings  from '../components/game/SoundSettings'
import BattleResult   from '../components/game/BattleResult'
import TutorialOverlay, { hasTutorialSeen } from '../components/game/TutorialOverlay'
import SaveLoadModal  from '../components/game/SaveLoadModal'
import Navbar         from '../components/layout/Navbar'

const VIEW = { STORY: 'story', ANNOUNCE: 'announce', BATTLE: 'battle', ENDING: 'ending' }

const ENDING_INFO = {
  true_ending:    { title: '탑의 해방',      color: '#4ade80', emoji: '✦', cleared: true  },
  harmony_ending: { title: '완전한 화음',    color: '#ff44cc', emoji: '🎵', cleared: true  },
  memory_ending:  { title: '기억의 해방',    color: '#ff8800', emoji: '💾', cleared: true  },
  secret_ending:  { title: '정령과의 계약', color: '#aa88ff', emoji: '◈', cleared: true  },
  thief_ending:   { title: '자유로운 선율', color: '#ffaa00', emoji: '🎶', cleared: true  },
  machine_ending: { title: '기계와의 동행', color: '#88aaff', emoji: '🤖', cleared: true  },
  bad_ending:     { title: '탑에 삼켜지다', color: '#ff5d73', emoji: '✕', cleared: false },
  redemption_ending: { title: '기사들의 안식',  color: '#ffd23f', emoji: '⚔', cleared: true  },
  fallen_ending:     { title: '새로운 별',      color: '#aa44ff', emoji: '★', cleared: true  },
  escape_ending:     { title: '살아남은 자',    color: '#88aaff', emoji: '🚪', cleared: true  },
  free_ending:       { title: '함선의 정지',    color: '#4ade80', emoji: '🛸', cleared: true  },
  survivor_ending:   { title: '차가운 귀환',    color: '#88aaff', emoji: '❄', cleared: true  },
}

export default function Game() {
  const { user, loading: authLoading } = useAuth()
  const navigate    = useNavigate()
  const guideId     = getGuideId()
  const playerClass = gameStorage.getPlayerClass() ?? 'warrior'
  const cls         = CLASSES[playerClass]

  const { gameState, setGameState, messages, addMessage, unlockedUpgrades, setUnlockedUpgrades } = useGame(playerClass)

  const [view,           setView]           = useState(VIEW.STORY)
  const [currentChoices, setCurrentChoices] = useState([])
  const [loading,        setLoading]        = useState(false)
  const [battleContext,  setBattleContext]  = useState(null)
  const [announceData,   setAnnounceData]  = useState(null)
  const [endingId,       setEndingId]      = useState(null)
  const [showSkillTree,  setShowSkillTree] = useState(false)
  const [showHelp,       setShowHelp]      = useState(false)
  const [showSound,      setShowSound]     = useState(false)
  const [npcRelations,   setNpcRelations]  = useState({})
  const [isPremium,      setIsPremium]     = useState(false)
  const [battleCount,    setBattleCount]   = useState(0)
  const [battleResult,   setBattleResult]  = useState(null)
  const [showTutorial,   setShowTutorial]  = useState(false)
  const [showSaveLoad,   setShowSaveLoad]  = useState(null)  // 'save' | 'load' | null
  const [pendingBattle,  setPendingBattle]  = useState(null)
  const endRunCalledRef = useRef(false)
  const initDoneRef     = useRef(false)
  const saveTimerRef    = useRef(null)
  const announceTimerRef = useRef(null)

  // ── 서버 자동 저장 ───────────────────────────────
  const saveToServer = useCallback(() => {
    if (!user || endRunCalledRef.current) return
    api.saveGame({
      guide_id:      guideId,
      story_context: { battle_count: battleCount, npc_relations: npcRelations },
      player_stats:  { ...gameState, playerClass, unlockedUpgrades },
    }).catch(() => {})
  }, [user, guideId, battleCount, npcRelations, gameState, playerClass, unlockedUpgrades])

  // 3분마다 자동 저장 (interval 재생성 없이 항상 최신 saveToServer 호출)
  const saveRef = useRef(saveToServer)
  useEffect(() => { saveRef.current = saveToServer }, [saveToServer])

  // sendAction 안정화용 — 자주 바뀌는 값을 ref로 미러링 (StoryPanel 불필요 리렌더 방지)
  const liveRef = useRef({ loading, gameState, view })
  liveRef.current = { loading, gameState, view }
  useEffect(() => {
    const interval = setInterval(() => saveRef.current?.(), 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // ── 인증 체크 ─────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate('/')
  }, [user, authLoading, navigate])

  // ── 초기화 ────────────────────────────────────────
  useEffect(() => {
    if (!user || initDoneRef.current) return
    initDoneRef.current = true

    const runId = gameStorage.getRunId()
    if (!runId) {
      gameStorage.setRunStart(Date.now())  // 클리어 시간 측정 시작
      api.startRun(playerClass)
        .then(r => { if (r.run_id) gameStorage.setRunId(r.run_id) })
        .catch(e => {
          // 클래스 권한 없음(미해금/프리미엄) → 클래스 선택으로 안내
          if (e?.status === 403 || e?.status === 402) {
            showToast(e.message || '이 클래스를 사용할 수 없습니다', 'error')
            navigate('/class-select')
          }
        })
    }

    if (messages.length === 0) {
      addMessage('system', `${cls?.icon ?? ''} ${cls?.name ?? ''}으로 모험을 시작합니다`)
      addMessage('gm', STORY_OPENINGS[guideId] ?? STORY_OPENINGS.default)
      // 첫 플레이 안내 (1회만)
      if (!localStorage.getItem('bq_story_hint_seen')) {
        addMessage('system', '💡 아래에 행동을 자유롭게 입력하거나, 제시되는 선택지를 눌러 진행하세요')
        try { localStorage.setItem('bq_story_hint_seen', '1') } catch {}
      }
    }

    Promise.allSettled([
      api.npcRelations().then(r => setNpcRelations(r.relations ?? {})),
      api.subscriptionMe().then(r => setIsPremium(r.is_premium ?? false)),
      api.gmSession().then(r => { if (r.battle_count) setBattleCount(r.battle_count) }),
    ])

    sound.startStoryBGM()
    return () => { sound.stopBGM(); clearTimeout(saveTimerRef.current); clearTimeout(announceTimerRef.current) }
  }, [user])

  // ── HP 0 → 배드 엔딩 ─────────────────────────────
  useEffect(() => {
    if (gameState.hp <= 0 && view === VIEW.STORY && !endingId) {
      _triggerEnding('bad_ending')
    }
  }, [gameState.hp, view])

  // ── GM 결과 처리 ──────────────────────────────────
  const handleGMResult = useCallback((result) => {
    if (result.story) addMessage('gm', result.story)
    setCurrentChoices(result.choices ?? [])

    if (result.relation_changes && Object.keys(result.relation_changes).length > 0) {
      setNpcRelations(prev => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(result.relation_changes))
          next[k] = Math.max(-3, Math.min(3, (next[k] ?? 0) + (v ?? 0)))
        return next
      })
    }

    if (result.ending) { _triggerEnding(result.ending); return }

    if (result.battle) {
      const mergedSkills = [...new Set([
        ...(result.battle.player_skills ?? []),
        ...(cls?.startSkills ?? []),
      ])]
      const ctx = { ...result.battle, player_skills: mergedSkills, classId: playerClass }
      setAnnounceData({ name: result.battle.enemy_name ?? '적', isBoss: result.battle.type === 'boss' })
      setView(VIEW.ANNOUNCE)
      announceTimerRef.current = setTimeout(() => {
        // 첫 전투면 튜토리얼 먼저
        if (!hasTutorialSeen()) {
          setPendingBattle(ctx)
          setShowTutorial(true)
          setCurrentChoices([])
          sound.stopBGM()
        } else {
          setBattleContext(ctx)
          setCurrentChoices([])
          setView(VIEW.BATTLE)
          sound.stopBGM()
        }
      }, 1600)
    }
  }, [cls, playerClass, addMessage])

  const _triggerEnding = useCallback((eid) => {
    if (endRunCalledRef.current) return
    endRunCalledRef.current = true
    setEndingId(eid)
    setView(VIEW.ENDING)
    const info    = ENDING_INFO[eid]
    const cleared = info?.cleared ?? false
    // 클리어 엔딩이면 클래스별 업적 통계 + 엔딩 업적 체크
    if (cleared) {
      // 클리어 소요 시간 계산 (초)
      const startTs = gameStorage.getRunStart()
      const clearSec = startTs ? Math.floor((Date.now() - startTs) / 1000) : null
      const achStats = updateStats({
        clears: 1,
        [`class_clears.${playerClass}`]: 1,
        [`endings.${eid}`]: 1,
        [`cleared_stories.${guideId}`]: 1,
        ...(clearSec && clearSec > 0 ? { fastest_clear_sec: clearSec } : {}),
      })
      checkNewAchievements(achStats).forEach(a => showAchievement(a))
      checkNewTitles(achStats).forEach(t => showTitleUnlock(t))
    }
    // 서버 저장 후 런 종료
    saveToServer()
    api.endRun({
      player_class:     playerClass,
      ending_id:        eid,
      guide_id:         guideId,
      survived_battles: battleCount,
      total_lines:      0,
      final_level:      gameState.level,
      final_gold:       gameState.gold,
      cleared,
    }).catch(() => {})
  }, [playerClass, battleCount, gameState, saveToServer, guideId])

  // ── 행동 전송 ─────────────────────────────────────
  const [lastFailedAction, setLastFailedAction] = useState(null)

  const sendAction = useCallback(async (text) => {
    const t = (text ?? '').trim()
    const { loading: isLoading, gameState: gs, view: curView } = liveRef.current
    if (!t || isLoading || curView !== VIEW.STORY) return
    setCurrentChoices([])
    addMessage('player', t)
    setLoading(true)
    setLastFailedAction(null)
    try {
      const result = await api.gmAction(t, { ...gs, playerClass })
      handleGMResult(result)
    } catch (e) {
      let msg
      if (e?.status === 402) {
        msg = '이 스토리는 프리미엄 플랜에서 이용 가능합니다.'
      } else if (e?.isNetworkError) {
        msg = e.message + ' (아래 버튼으로 다시 시도할 수 있습니다)'
        setLastFailedAction(t)  // 재시도용 보관
      } else if (e?.status === 429) {
        msg = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        setLastFailedAction(t)
      } else {
        msg = '게임 마스터의 응답을 받지 못했습니다. 다시 시도해주세요.'
        setLastFailedAction(t)
      }
      addMessage('gm', msg)
      showToast(msg, e?.status === 402 ? 'warn' : 'error')
    } finally {
      setLoading(false)
    }
  }, [playerClass, handleGMResult, addMessage])

  const retryLastAction = useCallback(() => {
    if (lastFailedAction) sendAction(lastFailedAction)
  }, [lastFailedAction, sendAction])

  // ── 전투 결과 ─────────────────────────────────────
  const onBattleEnd = useCallback(async (result) => {
    if (result.quit) {
      setView(VIEW.STORY)
      setBattleContext(null)
      sound.startStoryBGM()
      return
    }

    // 전투 결과 팝업 (보상 정보 포함)
    const xpGainCalc    = result.win ? 30 + (result.lines_cleared ?? 0) * 2 : 10
    const scoreGoldCalc = Math.floor((result.score ?? 0) / 100)
    setBattleResult({
      ...result,
      xp_earned:   xpGainCalc,
      gold_earned: result.win ? 10 + scoreGoldCalc : 0,
    })
    setView(VIEW.STORY)
    setBattleContext(null)
    setBattleCount(c => c + 1)
    setLoading(true)
    sound.startStoryBGM()

    const xpGain    = result.win ? 30 + (result.lines_cleared ?? 0) * 2 : 10
    const scoreGold = Math.floor((result.score ?? 0) / 100)

    setGameState(s => {
      const newXp = s.xp + xpGain
      const newLv = calcLevel(newXp)
      if (newLv > s.level) {
        addMessage('system', `🎉 레벨 업! ${s.level} → ${newLv}`)
        showToast(`레벨 업! Lv${newLv}`, 'success')
        sound.levelUp()
      }
      return {
        hp:    result.win ? Math.min(100, s.hp + 5) : Math.max(0, s.hp - 20),
        gold:  result.win ? s.gold + 10 + scoreGold : s.gold,
        xp:    newXp, level: newLv,
      }
    })

    showToast(
      result.win ? `⚔ 승리! +${10 + scoreGold}G +${xpGain}XP` : '전투에서 패배했습니다.',
      result.win ? 'success' : 'warn'
    )

    // 업적 통계 (한 번만 갱신하고 그 결과로 업적 체크)
    const ds = result.detailed_stats ?? {}
    const achStats = updateStats({
      total_battles:      1,
      total_lines:        result.lines_cleared ?? 0,
      ...(result.win ? { wins: 1 } : { losses: 1 }),
      ...(ds.tetris_count    ? { tetris_count:        ds.tetris_count    } : {}),
      ...(ds.tspin_count     ? { tspin_count:         ds.tspin_count     } : {}),
      ...(ds.perfect_clears  ? { perfect_clear_count: ds.perfect_clears  } : {}),
      ...(ds.max_combo > 0   ? { max_combo:           ds.max_combo       } : {}),
      ...(ds.max_b2b_streak  ? { max_b2b_streak:      ds.max_b2b_streak  } : {}),
    })
    checkNewAchievements(achStats).forEach(a => showAchievement(a))
    checkNewTitles(achStats).forEach(t => showTitleUnlock(t))

    // 전투 후 서버 저장
    setTimeout(saveToServer, 2000)

    try {
      const gmResult = await api.gmBattleResult(result)
      handleGMResult(gmResult)
    } catch {
      addMessage('gm', result.win ? '전투에서 승리했습니다.' : '전투에서 패배했습니다...')
    } finally {
      setLoading(false)
    }
  }, [playerClass, handleGMResult, setGameState, addMessage, saveToServer])

  // ── 스킬 트리 ─────────────────────────────────────
  const handleUnlock = useCallback((upgradeId, cost) => {
    if (gameState.gold < cost.gold || gameState.level < cost.level) { showToast('조건 미충족', 'error'); return }
    if (!isPremium && unlockedUpgrades.length >= 3) { showToast('무료 한도 — 프리미엄 필요', 'warn'); return }
    setGameState(s => ({ ...s, gold: s.gold - cost.gold }))
    setUnlockedUpgrades(p => [...p, upgradeId])
    addMessage('system', `✦ 스킬 업그레이드: ${SKILL_UPGRADES[upgradeId]?.name ?? upgradeId}`)
    showToast(`✦ ${SKILL_UPGRADES[upgradeId]?.name ?? upgradeId} 습득!`, 'success')
  }, [gameState, isPremium, unlockedUpgrades, setGameState, setUnlockedUpgrades, addMessage])

  // ── 종료 ──────────────────────────────────────────
  const handleQuit = useCallback(async () => {
    saveToServer()
    if (!endRunCalledRef.current) {
      await api.endRun({
        player_class: playerClass, ending_id: null,
        survived_battles: battleCount, total_lines: 0,
        final_level: gameState.level, final_gold: gameState.gold, cleared: false,
      }).catch(() => {})
    }
    await api.gmReset().catch(() => {})
    gameStorage.clearAll()
    navigate('/')
  }, [playerClass, battleCount, gameState, navigate, saveToServer])

  if (authLoading) return <LoadingScreen />

  // ── 엔딩 ──────────────────────────────────────────
  if (view === VIEW.ENDING && endingId) {
    const info   = ENDING_INFO[endingId] ?? { title: endingId, color: '#8b5cff', emoji: '?', cleared: false }
    const lastGm = [...messages].reverse().find(m => m.role === 'gm')
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 text-center bg-brand-bg relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${info.color}15 0%, transparent 70%)` }} />
        <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
          <div>
            <p className="text-brand-muted font-mono text-xs tracking-[0.4em] mb-4">— E N D I N G —</p>
            <div className="text-5xl mb-4 animate-float">{info.emoji}</div>
            <h1 className="font-display text-5xl font-black mb-2"
              style={{ color: info.color, textShadow: `0 0 40px ${info.color}66` }}>
              {info.title}
            </h1>
            {info.cleared && <p className="font-mono text-xs text-brand-success">✓ 클리어 — 새 콘텐츠 해금</p>}
          </div>
          {lastGm && (
            <div className="panel p-8 max-w-2xl text-left animate-slide-up"
              style={{ borderColor: `${info.color}33`, animationDelay: '200ms', animationFillMode: 'both' }}>
              <p className="text-brand-text font-body leading-loose text-sm">{lastGm.text}</p>
            </div>
          )}
          <div className="flex gap-8 font-mono text-sm animate-slide-up"
            style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            {[
              { label: '클래스', value: `${cls?.icon} ${cls?.name}` },
              { label: '레벨',   value: `Lv ${gameState.level}` },
              { label: '골드',   value: `G ${gameState.gold}` },
              { label: '전투',   value: `${battleCount}회` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-brand-muted text-xs mb-1">{label}</div>
                <div className="text-brand-text font-bold">{value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
            <button className="btn-primary px-8 py-3 font-display tracking-widest"
              onClick={() => { gameStorage.clearAll(); navigate('/class-select') }}>
              다시 도전
            </button>
            <button className="btn-ghost px-6 py-3" onClick={() => { gameStorage.clearAll(); navigate('/history') }}>전적</button>
            <button className="btn-ghost px-6 py-3" onClick={() => { gameStorage.clearAll(); navigate('/') }}>홈</button>
          </div>
        </div>
      </div>
    )
  }

  // ── 전투 예고 ─────────────────────────────────────
  if (view === VIEW.ANNOUNCE && announceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-brand-danger/8 to-transparent pointer-events-none" />
        <div className="relative z-10 text-center space-y-5">
          <p className="font-mono text-brand-muted text-sm tracking-[0.4em] animate-fade-in">
            {announceData.isBoss ? '— B O S S —' : '— B A T T L E —'}
          </p>
          <h2 className={`font-display font-black animate-scale-in
            ${announceData.isBoss ? 'text-7xl text-brand-danger' : 'text-6xl text-brand-text'}`}
            style={announceData.isBoss ? { textShadow: '0 0 60px rgba(255,68,102,0.8)' } : {}}>
            {announceData.name}
          </h2>
          <p className="font-mono text-brand-muted text-sm tracking-widest animate-pulse">
            {announceData.isBoss ? '⚠ 강적이 나타났다!' : '전투 시작'}
          </p>
        </div>
        {showTutorial && (
          <TutorialOverlay onComplete={() => {
            setShowTutorial(false)
            if (pendingBattle) {
              setBattleContext(pendingBattle)
              setPendingBattle(null)
              setView(VIEW.BATTLE)
            }
          }} />
        )}
      </div>
    )
  }

  const xpRatio  = xpProgress(gameState.xp, gameState.level)
  const isBattle = view === VIEW.BATTLE

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg">
      <Navbar slim actions={
        <div className="flex items-center gap-3">
          {/* HP */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
            <span className="text-brand-muted">HP</span>
            <div className="w-16 h-1.5 bg-brand-panel rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${gameState.hp}%`,
                  background: gameState.hp > 50 ? '#4ade80' : gameState.hp > 25 ? '#ffaa00' : '#ff5d73',
                }} />
            </div>
            <span style={{ color: gameState.hp > 25 ? '#4ade80' : '#ff5d73' }}>{gameState.hp}</span>
          </div>
          {/* XP */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
            <span className="text-brand-muted">Lv{gameState.level}</span>
            <div className="w-12 h-1.5 bg-brand-panel rounded-full overflow-hidden">
              <div className="h-full bg-brand-accent rounded-full transition-all" style={{ width: `${xpRatio * 100}%` }} />
            </div>
          </div>
          <span className="hidden sm:inline text-brand-gold font-mono text-xs">G {gameState.gold}</span>
          {isBattle && <span className="text-brand-danger font-mono text-xs font-bold animate-pulse">⚔</span>}
          <button onClick={() => setShowSkillTree(true)} disabled={isBattle} className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-20" aria-label="스킬 트리" title="스킬 트리">✦</button>
          <button onClick={() => setShowSaveLoad('save')} disabled={isBattle} className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-20" aria-label="게임 저장" title="저장">💾</button>
          <button onClick={() => setShowSound(true)} className="btn-ghost text-xs px-2.5 py-1.5" aria-label="사운드 설정" title="사운드">🔊</button>
          <button onClick={() => setShowHelp(true)}  className="btn-ghost text-xs px-2.5 py-1.5" title="도움말">?</button>
          <button onClick={handleQuit} className="btn-ghost text-xs px-2.5 py-1.5 hover:text-brand-danger hover:border-brand-danger/40">나가기</button>
        </div>
      } />

      {/* 스토리 화면 */}
      {view === VIEW.STORY && (
        <main className="flex-1 flex justify-center overflow-hidden p-4 sm:p-6 gap-4">
          <div className="flex flex-col w-full max-w-xl min-h-0">
            <div className="mb-3 shrink-0">
              <ProgressBar battleCount={battleCount} totalBosses={getBossCount(guideId)} />
            </div>
            {lastFailedAction && !loading && (
              <button onClick={retryLastAction}
                className="mb-3 shrink-0 btn-primary py-2 text-sm flex items-center justify-center gap-2 animate-fade-in">
                ↻ 다시 시도
              </button>
            )}
            <StoryPanel
              messages={messages}
              onSubmit={sendAction}
              onChoose={sendAction}
              disabled={false}
              loading={loading}
              currentChoices={currentChoices}
            />
          </div>
          {Object.keys(npcRelations).length > 0 && (
            <aside className="hidden lg:block w-44 shrink-0 pt-1" aria-label="NPC 관계도">
              <NPCRelationPanel relations={npcRelations} />
            </aside>
          )}
        </main>
      )}

      {/* 전투 화면 */}
      {isBattle && (
        <main className="flex-1 flex justify-center items-start overflow-auto p-2 sm:p-4">
          {battleContext && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-brand-muted font-mono text-sm">
                전투 준비 중...
              </div>
            }>
              <TetrisGame context={battleContext} onBattleEnd={onBattleEnd} />
            </Suspense>
          )}
        </main>
      )}

      {/* 모달 */}
      {showSkillTree && (
        <SkillTreeModal
          classId={playerClass} unlockedIds={unlockedUpgrades}
          gold={gameState.gold} level={gameState.level}
          onUnlock={handleUnlock} onClose={() => setShowSkillTree(false)}
          isPremium={isPremium}
        />
      )}
      {showHelp  && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSound && <SoundSettings onClose={() => setShowSound(false)} />}
      {battleResult && <BattleResult result={battleResult} onClose={() => setBattleResult(null)} />}
      {showSaveLoad && (
        <SaveLoadModal
          mode={showSaveLoad}
          isPremium={isPremium}
          currentState={{
            story_context: { battle_count: battleCount, npc_relations: npcRelations },
            player_stats:  { ...gameState, playerClass, unlockedUpgrades },
          }}
          onLoad={(save) => {
            const stats = save.player_stats ?? {}
            // 게임 스탯 필드만 선택적 복원
            if (stats.hp !== undefined) {
              setGameState({
                hp:    stats.hp    ?? 100,
                gold:  stats.gold  ?? 0,
                xp:    stats.xp    ?? 0,
                level: stats.level ?? 1,
              })
            }
            if (Array.isArray(stats.unlockedUpgrades)) {
              setUnlockedUpgrades(stats.unlockedUpgrades)
            }
            const ctx = save.story_context ?? {}
            if (ctx.battle_count !== undefined) setBattleCount(ctx.battle_count)
            if (ctx.npc_relations) setNpcRelations(ctx.npc_relations)
          }}
          onClose={() => setShowSaveLoad(null)}
        />
      )}
    </div>
  )
}

// ── 도움말 모달 ─────────────────────────────────────
function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="도움말">
      <div className="panel p-6 max-w-md w-full mx-4 animate-scale-in overflow-y-auto max-h-[85vh]"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-xl text-brand-accent tracking-widest">도움말</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none" aria-label="닫기">✕</button>
        </div>
        <div className="space-y-5 text-sm">
          <section>
            <h3 className="font-mono text-brand-muted text-xs tracking-widest mb-2">스토리</h3>
            <ul className="space-y-1 text-brand-textMuted font-body">
              <li>• 텍스트 입력 또는 선택지 클릭으로 진행</li>
              <li>• Enter 전송, Shift+Enter 줄바꿈</li>
              <li>• AI GM이 당신의 선택에 반응합니다</li>
            </ul>
          </section>
          <section>
            <h3 className="font-mono text-brand-muted text-xs tracking-widest mb-2">전투 키</h3>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
              {[['← →','이동'],['↑ / Z','회전'],['Space','즉시 낙하'],['↓','소프트 드롭'],['C','홀드'],['Q W E R A','스킬']].map(([k,d]) => (
                <div key={k} className="flex gap-2 items-center">
                  <kbd className="badge px-1.5 text-brand-accent shrink-0">{k}</kbd>
                  <span className="text-brand-muted">{d}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="font-mono text-brand-muted text-xs tracking-widest mb-2">전투 목표</h3>
            <ul className="space-y-1 text-brand-textMuted text-xs font-body">
              <li>⚔ <b>섬멸전</b> — 상대 보드를 채우면 승리</li>
              <li>⏱ <b>생존전</b> — 제한 시간 버티기</li>
              <li>🏁 <b>라인 레이스</b> — 목표 줄 먼저 클리어</li>
              <li>💎 <b>점수전</b> — 시간 내 최고 점수</li>
            </ul>
          </section>
          <section>
            <h3 className="font-mono text-brand-muted text-xs tracking-widest mb-2">테트리스 팁</h3>
            <ul className="space-y-1 text-brand-textMuted text-xs font-body">
              <li>• T-Spin으로 좁은 공간에서 라인 클리어</li>
              <li>• 4줄 동시 클리어 = TETRIS (B2B 보너스)</li>
              <li>• 홀드[C]로 원하는 블록 보관</li>
            </ul>
          </section>
        </div>
        <button onClick={onClose} className="btn-ghost w-full mt-5 text-sm">닫기</button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-brand-bg">
      <div className="w-10 h-10 border-2 border-brand-border border-t-brand-accent rounded-full animate-spin" />
      <p className="text-brand-muted font-mono text-sm">Loading...</p>
    </div>
  )
}
