/**
 * 칭호 해금 알림 토스트
 */
import { useState, useEffect, useCallback } from 'react'
import { RARITY_COLORS } from '../../game/titles'

let _pushTitle = null

export function showTitleUnlock(title) {
  if (_pushTitle) _pushTitle(title)
}

export default function TitleToastContainer() {
  const [queue, setQueue] = useState([])

  const push = useCallback((title) => {
    setQueue(q => [...q, { ...title, _key: Date.now() + Math.random() }])
  }, [])

  useEffect(() => {
    _pushTitle = push
    return () => { _pushTitle = null }
  }, [push])

  useEffect(() => {
    if (queue.length === 0) return
    const timer = setTimeout(() => setQueue(q => q.slice(1)), 4500)
    return () => clearTimeout(timer)
  }, [queue])

  if (queue.length === 0) return null

  const current = queue[0]
  const color   = RARITY_COLORS[current.rarity] ?? '#8888aa'

  return (
    <div className="fixed top-20 left-1/2 z-[70] animate-slide-down">
      <div className="panel px-6 py-4 flex items-center gap-4 shadow-2xl"
        style={{ borderColor: `${color}66`, background: `linear-gradient(135deg, ${color}11, transparent)` }}>
        <div className="text-3xl animate-float">🏅</div>
        <div>
          <div className="font-mono text-2xs tracking-widest mb-0.5" style={{ color }}>
            칭호 획득 · {current.rarity?.toUpperCase()}
          </div>
          <div className="font-display text-lg font-bold" style={{ color }}>
            {current.name}
          </div>
          <div className="text-brand-muted text-xs font-body">{current.desc}</div>
        </div>
      </div>
    </div>
  )
}
