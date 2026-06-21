import { memo } from 'react'
/**
 * 스토리 진행도 표시 — 전투 횟수 기반
 */
const ProgressBar = memo(function ProgressBar({ battleCount = 0, totalBosses = 2 }) {
  // 예상 전체 전투 수 (일반 * 2 + 보스)
  const estimatedTotal = totalBosses * 3
  const pct = Math.min(100, (battleCount / estimatedTotal) * 100)

  const milestones = [
    { at: Math.floor(estimatedTotal * 0.33), label: '중반', icon: '⚔' },
    { at: Math.floor(estimatedTotal * 0.66), label: '보스전', icon: '💀' },
    { at: estimatedTotal,                    label: '클라이맥스', icon: '✦' },
  ]

  return (
    <div className="space-y-1.5 px-1">
      <div className="flex justify-between items-center">
        <span className="text-brand-muted font-mono text-2xs tracking-widest">탐험 진행도</span>
        <span className="text-brand-muted font-mono text-2xs">{battleCount}전</span>
      </div>

      <div className="relative h-1.5 bg-brand-panel rounded-full overflow-visible">
        {/* 마일스톤 마커 */}
        {milestones.map(m => (
          <div key={m.label}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${(m.at / estimatedTotal) * 100}%` }}
            title={m.label}>
            <div className={`w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500
              ${battleCount >= m.at
                ? 'bg-brand-accent border-brand-accent'
                : 'bg-brand-panel border-brand-border'}`} />
          </div>
        ))}

        {/* 진행 바 */}
        <div className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #5540cc, #7c5cfc, #9b7ffe)',
          }} />
      </div>
    </div>
  )
})

export default ProgressBar
