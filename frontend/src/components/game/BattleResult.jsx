/**
 * 전투 결과 상세 팝업
 * 라인별 점수, T-spin, 콤보, 시간 표시
 */
import { useEffect, useRef } from 'react'
import { sound } from '../../lib/sound'

const GOAL_LABELS = {
  versus:    { win: '⚔ 승리', lose: '✕ 패배' },
  survival:  { win: '⏱ 생존', lose: '✕ 탈락' },
  line_race: { win: '🏁 선착', lose: '✕ 패배' },
  score:     { win: '💎 종료', lose: '💎 종료' },
  endless:   { win: '🏆 기록', lose: '🏆 종료' },
}

function StatRow({ label, value, color, highlight }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-brand-border/30
      ${highlight ? 'bg-brand-accent/5 px-2 -mx-2 rounded' : ''}`}>
      <span className="text-brand-muted font-mono text-xs">{label}</span>
      <span className="font-mono text-sm font-bold" style={{ color: color ?? '#e8e6ff' }}>
        {value}
      </span>
    </div>
  )
}

export default function BattleResult({ result, onClose }) {
  const goal    = result.goal ?? 'versus'
  const win     = result.win
  const labels  = GOAL_LABELS[goal] ?? GOAL_LABELS.versus
  const resultLabel = win ? labels.win : labels.lose
  const resultColor = win ? '#44ff99' : '#ff4466'

  const stats = result.detailed_stats ?? {}
  const hasDetails = Object.keys(stats).length > 0

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current?.(), 4500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in"
      onClick={onClose}>
      <div className="panel p-6 w-80 animate-scale-in" onClick={e => e.stopPropagation()}
        style={{ borderColor: `${resultColor}44` }}>

        {/* 결과 헤더 */}
        <div className="text-center mb-5">
          <div className="font-display text-3xl font-black mb-1" style={{ color: resultColor,
            textShadow: `0 0 20px ${resultColor}66` }}>
            {resultLabel}
          </div>
          {result.boss_id && win && (
            <div className="text-brand-gold font-mono text-xs">보스 처치!</div>
          )}
        </div>

        {/* 주요 지표 */}
        <div className="space-y-0.5 mb-4">
          <StatRow label="클리어 라인" value={`${result.lines_cleared ?? 0}줄`}   color="#44ff99" />
          <StatRow label="점수"        value={(result.score ?? 0).toLocaleString() + 'pt'} color="#7c5cfc" />
          <StatRow label="소요 시간"   value={`${result.time_taken ?? 0}초`}      color="#aaaacc" />

          {/* 상세 통계 (있을 때만) */}
          {stats.tetris_count > 0 && (
            <StatRow label="테트리스" value={`${stats.tetris_count}회`} color="#00f5ff" highlight />
          )}
          {stats.tspin_count > 0 && (
            <StatRow label="T-Spin"   value={`${stats.tspin_count}회`} color="#aa00ff" highlight />
          )}
          {stats.max_combo > 1 && (
            <StatRow label="최고 콤보" value={`x${stats.max_combo}`}  color="#ff4499" highlight />
          )}
          {stats.perfect_clears > 0 && (
            <StatRow label="퍼펙트 클리어" value={`${stats.perfect_clears}회`} color="#ffd700" highlight />
          )}
        </div>

        {/* 획득 보상 (보상 정보가 있을 때만) */}
        {win && (result.gold_earned != null || result.xp_earned != null) && (
          <div className="flex justify-center gap-4 mb-4 font-mono text-xs">
            <span className="text-brand-gold">+{result.gold_earned ?? 0}G</span>
            <span className="text-brand-accent">+{result.xp_earned ?? 0}XP</span>
          </div>
        )}

        {/* 닫기 */}
        <button onClick={onClose} className="btn-ghost w-full text-xs py-2">
          계속하기 (4초 후 자동)
        </button>
      </div>
    </div>
  )
}
