/**
 * 모바일 터치 컨트롤
 * 테트리스 전투 화면 하단에 오버레이로 표시
 */
import { useCallback, useRef } from 'react'

function TouchButton({ label, onPress, onRelease, className = '', style = {} }) {
  const timerRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    onPress?.()
    // 길게 누를 때 반복 (DAS)
    timerRef.current = setTimeout(() => {
      timerRef.current = setInterval(() => onPress?.(), 80)
    }, 200)
  }, [onPress])

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault()
    clearTimeout(timerRef.current)
    clearInterval(timerRef.current)
    timerRef.current = null
    onRelease?.()
  }, [onRelease])

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`select-none touch-none flex items-center justify-center
                  rounded-xl font-mono font-bold text-sm
                  bg-brand-panel/90 border border-brand-border/70
                  active:bg-brand-accent/30 active:border-brand-accent/60
                  transition-colors duration-75 ${className}`}
      style={style}
    >
      {label}
    </button>
  )
}

export default function TouchControls({ onLeft, onRight, onRotate, onRotateCCW, onHardDrop, onSoftDrop, onHold, onSkill, skillCount = 3 }) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 768)

  if (!isMobile) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-safe touch-game
                    bg-gradient-to-t from-brand-bg/95 to-transparent
                    px-4 pt-4 pb-6 select-none"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

      {/* 스킬 버튼 (상단 행) */}
      <div className="flex justify-center gap-2 mb-3">
        <TouchButton label="HOLD" onPress={onHold}
          className="h-9 px-4 text-xs text-brand-muted" />
        {Array.from({ length: Math.min(skillCount, 5) }).map((_, i) => (
          <TouchButton key={i}
            label={['Q','W','E','R','A'][i]}
            onPress={() => onSkill?.(i)}
            className="w-12 h-9 text-brand-accent" />
        ))}
      </div>

      {/* 방향 + 액션 버튼 */}
      <div className="flex items-center justify-between gap-3">
        {/* 좌우 이동 */}
        <div className="flex gap-2">
          <TouchButton label="◀" onPress={onLeft}
            className="w-16 h-16 text-xl text-brand-text" />
          <TouchButton label="▶" onPress={onRight}
            className="w-16 h-16 text-xl text-brand-text" />
        </div>

        {/* 하드/소프트 드롭 (중앙) */}
        <div className="flex flex-col gap-1.5">
          <TouchButton label="▽" onPress={onSoftDrop}
            className="w-20 h-7 text-base text-brand-muted" />
          <TouchButton label="▼" onPress={onHardDrop}
            className="w-20 h-9 text-2xl text-brand-danger" />
        </div>

        {/* 회전 */}
        <div className="flex gap-2">
          <TouchButton label="↺" onPress={onRotateCCW}
            className="w-16 h-16 text-xl text-brand-accent" />
          <TouchButton label="↻" onPress={onRotate}
            className="w-16 h-16 text-xl text-brand-accent" />
        </div>
      </div>
    </div>
  )
}
