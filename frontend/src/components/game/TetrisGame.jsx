import { useEffect, useRef, useCallback, useState, memo } from 'react'
import Phaser from 'phaser'
import { BattleScene, SCENE_W, SCENE_H } from '../../game/scenes/BattleScene'
import TouchControls from './TouchControls'
import PauseModal   from './PauseModal'
import SoundSettings from './SoundSettings'
import { sound } from '../../lib/sound'

const TetrisGame = memo(function TetrisGame({ context, onBattleEnd }) {
  const containerRef = useRef(null)
  const gameRef      = useRef(null)
  const sceneRef     = useRef(null)
  const [paused,    setPaused]    = useState(false)
  const [showSound, setShowSound] = useState(false)

  // Phaser 콜백이 마운트 시점 클로저에 갇히지 않도록 최신 콜백을 ref로 유지
  const onBattleEndRef = useRef(onBattleEnd)
  onBattleEndRef.current = onBattleEnd

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game({
      type:            Phaser.AUTO,
      width:           SCENE_W,
      height:          SCENE_H,
      backgroundColor: '#06061a',
      parent:          containerRef.current,
      scene:           [BattleScene],
      scale: {
        mode:       Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:      SCENE_W,
        height:     SCENE_H,
      },
      render:  { antialias: true, pixelArt: false },
      input:   { activePointers: 3 },
    })
    gameRef.current = game

    let sceneTimer = null
    game.events.once('ready', () => {
      game.scene.start('BattleScene', {
        ...context,
        onBattleEnd: (result) => onBattleEndRef.current?.(result),
        onPause: () => {
          setPaused(true)
          if (sceneRef.current) sceneRef.current._paused = true
        },
      })
      sceneTimer = setTimeout(() => {
        sceneRef.current = game.scene.getScene('BattleScene')
      }, 100)
    })

    return () => {
      if (sceneTimer) clearTimeout(sceneTimer)
      try { sound.stopBGM() } catch (_) {}
      try { game.scene.stop('BattleScene'); game.destroy(true) } catch (_) {}
      gameRef.current  = null
      sceneRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 터치 이벤트 연결 ──────────────────────────────
  const sc = () => sceneRef.current
  const onLeft      = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._moveH(-1) }, [])
  const onRight     = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._moveH(1)  }, [])
  const onRotate    = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._rotatePlayer(1)    }, [])
  const onRotateCCW = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._rotatePlayer(-1)   }, [])
  const onHardDrop  = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._hardDrop()         }, [])
  const onSoftDrop  = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._playerStepDown()  }, [])
  const onHold      = useCallback(() => { const s = sc(); if (s && !s.gameOver && !s._paused) s._holdPieceAction()  }, [])
  const onSkill     = useCallback((i)  => { const s = sc(); if (s && !s.gameOver && !s._paused) s._useSkill(i)      }, [])

  const handleResume = useCallback(() => {
    setPaused(false)
    if (sceneRef.current) sceneRef.current._paused = false
  }, [])

  const handleQuit = useCallback(() => {
    setPaused(false)
    onBattleEnd?.({ win: false, quit: true, lines_cleared: 0, score: 0, time_taken: 0, goal: 'versus' })
  }, [onBattleEnd])

  const skillCount = context?.player_skills?.length ?? 3

  return (
    <div className="flex flex-col items-center gap-2 w-full touch-game">
      {/* Phaser 캔버스 */}
      <div ref={containerRef}
        className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60 w-full"
        style={{ maxWidth: SCENE_W, aspectRatio: `${SCENE_W}/${SCENE_H}` }}
      />

      {/* 데스크탑 키 힌트 */}
      <div className="hidden sm:flex gap-5 text-xs font-mono opacity-40 text-brand-muted select-none">
        <span>← → 이동</span>
        <span>↑ / Z 회전</span>
        <span>Space 낙하</span>
        <span>C 홀드</span>
        <span className="text-brand-accent opacity-80">Q W E R A 스킬</span>
        <span>ESC 일시정지</span>
      </div>

      {/* 모바일 터치 */}
      <TouchControls
        onLeft={onLeft} onRight={onRight}
        onRotate={onRotate} onRotateCCW={onRotateCCW}
        onHardDrop={onHardDrop} onSoftDrop={onSoftDrop} onHold={onHold}
        onSkill={onSkill} skillCount={skillCount}
      />

      {/* 일시정지 모달 */}
      {paused && (
        <PauseModal
          onResume={handleResume}
          onQuit={handleQuit}
          onSettings={() => { setPaused(false); setShowSound(true) }}
        />
      )}

      {/* 사운드 설정 */}
      {showSound && (
        <SoundSettings onClose={() => {
          setShowSound(false)
          if (sceneRef.current) sceneRef.current._paused = false
        }} />
      )}
    </div>
  )
})

export default TetrisGame
