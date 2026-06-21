import { useEffect, useState } from 'react'
import { RARITY_COLORS } from '../../game/achievements'

const listeners = new Set()

export function showAchievement(achievement) {
  listeners.forEach(fn => fn(achievement))
}

export function AchievementContainer() {
  const [queue, setQueue] = useState([])

  useEffect(() => {
    const handler = (ach) => {
      setQueue(p => [...p, { ...ach, uid: Date.now() + Math.random() }])
    }
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  const dismiss = (uid) => setQueue(p => p.filter(a => a.uid !== uid))

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center pointer-events-none">
      {queue.map(ach => (
        <AchievementCard key={ach.uid} achievement={ach} onDismiss={() => dismiss(ach.uid)} />
      ))}
    </div>
  )
}

function AchievementCard({ achievement, onDismiss }) {
  const color = RARITY_COLORS[achievement.rarity] ?? '#aaaacc'

  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="animate-slide-up pointer-events-auto"
      style={{ minWidth: 300 }}>
      <div className="panel px-5 py-3 flex items-center gap-4 cursor-pointer"
        style={{ borderColor: `${color}55`, boxShadow: `0 0 20px ${color}22` }}
        onClick={onDismiss}>
        <div className="text-3xl shrink-0">{achievement.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-2xs tracking-widest"
              style={{ color }}>
              🏆 업적 달성
            </span>
            <span className="font-mono text-2xs px-1.5 py-0.5 rounded-full border"
              style={{ color, borderColor: `${color}44` }}>
              {achievement.rarity}
            </span>
          </div>
          <div className="font-display text-sm text-brand-text font-bold">{achievement.name}</div>
          <div className="text-brand-muted font-body text-xs truncate">{achievement.desc}</div>
        </div>
      </div>
    </div>
  )
}
