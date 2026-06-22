import { useState } from 'react'
import { SKILL_UPGRADES, getAvailableUpgrades } from '../../game/skillTree'
import { useModalA11y } from '../../hooks/useModalA11y'

export default function SkillTreeModal({
  classId, unlockedIds, gold, level,
  onUnlock, onClose,
  isPremium = false,   // 프리미엄 여부
}) {
  const modalRef = useModalA11y(onClose)
  const [hoverId, setHoverId] = useState(null)

  const available = getAvailableUpgrades(classId, unlockedIds)
  const hovered   = SKILL_UPGRADES[hoverId]

  // 무료 플랜: 최대 3개
  const FREE_LIMIT   = 3
  const atFreeLimit  = !isPremium && unlockedIds.length >= FREE_LIMIT

  const canAfford = (u) =>
    gold >= u.cost.gold && level >= u.cost.level && !atFreeLimit

  const handleUnlock = (u) => {
    if (atFreeLimit) return
    if (!canAfford(u)) return
    onUnlock(u.id, u.cost)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="스킬 트리">
      <div ref={modalRef} className="panel p-6 w-[580px] max-h-[80vh] overflow-y-auto animate-scale-in"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl text-brand-accent tracking-widest">스킬 트리</h2>
          <div className="flex items-center gap-3">
            <div className="font-mono text-xs text-brand-muted">
              Lv {level}  |  G {gold}
            </div>
            <button onClick={onClose} aria-label="닫기"
              className="text-brand-muted hover:text-brand-text text-lg leading-none">✕</button>
          </div>
        </div>

        {/* 무료 한도 경고 */}
        {!isPremium && (
          <div className={`mb-4 px-4 py-3 rounded-lg border text-xs font-mono
            ${atFreeLimit
              ? 'border-brand-danger/40 bg-brand-danger/5 text-brand-danger'
              : 'border-brand-border text-brand-muted'}`}>
            {atFreeLimit
              ? `✕ 무료 플랜 한도 도달 (${FREE_LIMIT}개) — 프리미엄으로 업그레이드하면 무제한 구매 가능`
              : `무료 플랜: ${unlockedIds.length} / ${FREE_LIMIT}개 사용 중`}
          </div>
        )}

        {/* 보유 업그레이드 */}
        {unlockedIds.length > 0 && (
          <div className="mb-5">
            <p className="text-brand-muted font-mono text-xs mb-2 tracking-widest">— 보유 —</p>
            <div className="flex flex-wrap gap-2">
              {unlockedIds.map(id => {
                const u = SKILL_UPGRADES[id]
                return u ? (
                  <span key={id} className="badge border-brand-success/40 text-brand-success text-xs">
                    ✓ {u.name}
                  </span>
                ) : null
              })}
            </div>
          </div>
        )}

        {/* 구매 가능 */}
        <p className="text-brand-muted font-mono text-xs mb-3 tracking-widest">— 구매 가능 —</p>
        {available.length === 0 ? (
          <p className="text-brand-muted text-sm font-body py-6 text-center">
            현재 레벨에서 구매 가능한 스킬이 없습니다
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {available.map(u => {
              const affordable = canAfford(u)
              const isHovered  = hoverId === u.id

              return (
                <button key={u.id}
                  onMouseEnter={() => setHoverId(u.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => handleUnlock(u)}
                  disabled={!affordable}
                  className={`panel p-4 text-left transition-all duration-150
                    ${affordable
                      ? 'hover:border-brand-accent cursor-pointer'
                      : atFreeLimit
                        ? 'opacity-40 cursor-not-allowed'
                        : 'opacity-50 cursor-not-allowed'}`}
                  style={isHovered && affordable ? { borderColor: 'rgba(124,92,252,0.6)' } : {}}>

                  <div className="font-mono text-sm text-brand-text font-bold mb-1">{u.name}</div>
                  <div className="font-body text-xs text-brand-muted mb-3 leading-relaxed">{u.desc}</div>

                  <div className="flex gap-3 font-mono text-xs flex-wrap">
                    <span style={{ color: gold >= u.cost.gold ? '#ffd23f' : '#ff5d73' }}>
                      G {u.cost.gold}
                    </span>
                    <span style={{ color: level >= u.cost.level ? '#8b5cff' : '#ff5d73' }}>
                      Lv {u.cost.level}+
                    </span>
                    {u.requires && (
                      <span className="text-brand-muted text-2xs">
                        ← {SKILL_UPGRADES[u.requires]?.name}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 프리미엄 유도 */}
        {atFreeLimit && (
          <div className="mt-4 pt-4 border-t border-brand-border text-center">
            <a href="/upgrade"
              className="font-mono text-xs text-brand-accent hover:text-brand-accentHover
                         transition-colors underline underline-offset-2">
              ✦ 프리미엄으로 업그레이드하면 무제한 스킬 트리 이용 가능
            </a>
          </div>
        )}

        <button onClick={onClose} className="btn-ghost w-full mt-5 text-sm">닫기</button>
      </div>
    </div>
  )
}
