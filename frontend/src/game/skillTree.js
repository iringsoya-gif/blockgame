/**
 * 스킬 트리 정의
 * 레벨업 또는 골드 소모로 업그레이드
 * 클래스별 전용 브랜치 포함
 */

export const SKILL_UPGRADES = {
  // ── clear_line 트리 ──────────────────────────────
  clear_line_II: {
    id: 'clear_line_II',
    name: '라인 소거 II',
    base: 'clear_line',
    desc: '2줄 동시 제거',
    cost: { gold: 30, level: 3 },
    classes: ['warrior', 'mage', 'rogue'],
    effect: { clearLines: 2 },
  },
  clear_line_III: {
    id: 'clear_line_III',
    name: '라인 소거 III',
    base: 'clear_line',
    requires: 'clear_line_II',
    desc: '3줄 동시 제거 + 가비지 전환',
    cost: { gold: 60, level: 5 },
    classes: ['warrior', 'mage', 'rogue'],
    effect: { clearLines: 3, sendGarbage: 1 },
  },

  // ── shield 트리 ──────────────────────────────────
  reflect_shield: {
    id: 'reflect_shield',
    name: '반사 보호막',
    base: 'shield',
    desc: '막은 가비지를 적에게 반사',
    cost: { gold: 40, level: 3 },
    classes: ['warrior'],
    effect: { reflect: true },
  },
  iron_shield: {
    id: 'iron_shield',
    name: '철벽',
    base: 'shield',
    requires: 'reflect_shield',
    desc: '보호막 3회 연속 사용 가능',
    cost: { gold: 80, level: 6 },
    classes: ['warrior'],
    effect: { shieldCharges: 3 },
  },

  // ── time_slow 트리 ────────────────────────────────
  time_stop: {
    id: 'time_stop',
    name: '시간 정지',
    base: 'time_slow',
    desc: '낙하 완전 정지 (5초)',
    cost: { gold: 50, level: 4 },
    classes: ['mage'],
    effect: { stopDrop: 5000 },
  },
  time_reverse: {
    id: 'time_reverse',
    name: '시간 역행',
    base: 'time_slow',
    requires: 'time_stop',
    desc: '마지막으로 놓은 블록을 되돌림',
    cost: { gold: 90, level: 7 },
    classes: ['mage'],
    effect: { undoLastPiece: true },
  },

  // ── swap_block 트리 ───────────────────────────────
  triple_swap: {
    id: 'triple_swap',
    name: '3블록 선택',
    base: 'swap_block',
    desc: '다음 3개 블록 중 원하는 것 선택',
    cost: { gold: 35, level: 3 },
    classes: ['rogue'],
    effect: { swapChoiceCount: 3 },
  },
  ghost_swap: {
    id: 'ghost_swap',
    name: '허상 교체',
    base: 'swap_block',
    requires: 'triple_swap',
    desc: '교체한 블록을 적 보드에 강제 삽입',
    cost: { gold: 70, level: 6 },
    classes: ['rogue'],
    effect: { sendSwappedToEnemy: true },
  },

  // ── add_garbage 트리 (도적 전용) ──────────────────

  // ── summon 트리 (소환사 전용) ─────────────────────────
  summon_blast: {
    id: 'summon_blast',
    name: '소환 폭발',
    base: 'add_garbage',
    desc: '2줄 이상 클리어 시 가비지 2줄로 강화',
    cost: { gold: 45, level: 4 },
    classes: ['summoner'],
    effect: { summonGarbageLines: 2 },
  },

  // ── paladin 전용 ──────────────────────────────────────
  divine_shield: {
    id: 'divine_shield',
    name: '신성 보호막',
    base: 'shield',
    requires: 'iron_shield',
    desc: '보호막 흡수 시 게이지 +20 추가',
    cost: { gold: 60, level: 5 },
    classes: ['paladin'],
    effect: { shieldGaugeBonus: 20 },
  },
  heavy_garbage: {
    id: 'heavy_garbage',
    name: '중형 가비지',
    base: 'add_garbage',
    desc: '가비지 3줄 전송',
    cost: { gold: 40, level: 4 },
    classes: ['rogue'],
    effect: { garbageLines: 3 },
  },
}

// 클래스별 사용 가능 업그레이드 필터
export function getAvailableUpgrades(classId, unlockedIds = []) {
  if (!classId) return []
  return Object.values(SKILL_UPGRADES).filter((u) => {
    if (!Array.isArray(u.classes) || !u.classes.includes(classId)) return false
    if (u.requires && !unlockedIds.includes(u.requires)) return false
    if (unlockedIds.includes(u.id)) return false
    return true
  })
}

// 업그레이드 효과 적용
export function applyUpgrade(upgradeId, skillManager, scene) {
  const u = SKILL_UPGRADES[upgradeId]
  if (!u) return

  const e = u.effect
  const skill = skillManager.playerSkills.find((s) => s.id === u.base)

  if (e.clearLines && skill) skill._clearLines = e.clearLines
  if (e.sendGarbage && skill) skill._sendGarbage = e.sendGarbage
  if (e.reflect && skill)     skill._reflect = true
  if (e.shieldCharges)        skillManager.shieldCharges = e.shieldCharges
  if (e.stopDrop && skill)    skill._stopDrop = e.stopDrop
  if (e.undoLastPiece && skill) skill._undoLastPiece = true
  if (e.swapChoiceCount && skill) skill._swapChoiceCount = e.swapChoiceCount
  if (e.sendSwappedToEnemy && skill) skill._sendSwappedToEnemy = true
  if (e.garbageLines && skill) skill._garbageLines = e.garbageLines
}
