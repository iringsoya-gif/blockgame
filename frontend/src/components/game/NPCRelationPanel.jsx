import { memo } from 'react'
/**
 * NPC 관계도 패널 — 스토리 화면 우측에 표시
 */
const NPCRelationPanel = memo(function NPCRelationPanel({ relations = {} }) {
  if (Object.keys(relations).length === 0) return null

  const getRelationColor = (val) => {
    if (val >= 2)  return '#4ade80'
    if (val >= 1)  return '#88ccff'
    if (val <= -2) return '#ff5d73'
    if (val <= -1) return '#ffaa44'
    return '#6060a0'
  }

  const getRelationLabel = (val) => {
    if (val >= 3)  return '절친'
    if (val >= 2)  return '우호'
    if (val >= 1)  return '친근'
    if (val === 0) return '중립'
    if (val >= -1) return '냉담'
    if (val >= -2) return '적대'
    return '원수'
  }

  return (
    <div className="panel p-3 space-y-2">
      <p className="text-brand-muted font-mono text-2xs tracking-widest">— NPC 관계 —</p>
      {Object.entries(relations).map(([name, val]) => {
        const color = getRelationColor(val)
        const label = getRelationLabel(val)
        const pct   = ((val + 3) / 6) * 100

        return (
          <div key={name} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-brand-text font-body text-xs truncate max-w-[120px]">{name}</span>
              <span className="font-mono text-2xs shrink-0 ml-2" style={{ color }}>{label}</span>
            </div>
            <div className="h-1 bg-brand-panel rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default NPCRelationPanel
