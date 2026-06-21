export const SKILL_META = {
  clear_line:     { name: '라인 소거',   cost: 30, cooldown: 0,  key: 'Q', desc: '맨 아래 줄 제거',          color: 0x44ff99, icon: '▬' },
  swap_block:     { name: '블록 교체',   cost: 20, cooldown: 5,  key: 'W', desc: '현재 블록 교체',           color: 0x00f5ff, icon: '⇄' },
  preview_extend: { name: '예지',        cost: 25, cooldown: 15, key: 'E', desc: '미리보기 10초 확장',       color: 0xaa88ff, icon: '👁' },
  time_slow:      { name: '시간 늦추기', cost: 40, cooldown: 20, key: 'R', desc: '낙하 속도 감소 (8초)',    color: 0x5599ff, icon: '⏱' },
  shield:         { name: '보호막',      cost: 35, cooldown: 15, key: 'A', desc: '가비지 방어',             color: 0xffd700, icon: '🛡' },
  add_garbage:    { name: '가비지 공격', cost: 30, cooldown: 8,  key: 'S', desc: '적에게 가비지 2줄',      color: 0xff4466, icon: '💥' },
  sword_dance:    { name: '검기난무',     cost: 45, cooldown: 12, key: 'D', desc: '적에게 가비지 3줄 + 게이지 회복', color: 0xe63946, icon: '⚔' },
  mind_blade:     { name: '심검',         cost: 50, cooldown: 10, key: 'F', desc: '맨 아래 2줄 베어내기',   color: 0xc1121f, icon: '🗡' },
  arcane_blast:   { name: '비전 폭발',     cost: 48, cooldown: 11, key: 'D', desc: '적 가비지 2줄 + 내 1줄 정리', color: 0xaa66ff, icon: '🔮' },
  summon_aid:     { name: '소환수 지원',   cost: 42, cooldown: 14, key: 'F', desc: '다음 3블록을 직선으로',  color: 0x66ddcc, icon: '🐉' },
}

export const ENEMY_SKILL_META = {
  add_garbage:    { name: '가비지 투척',  icon: '💥', color: 0xff4466 },
  slow_player:    { name: '둔화 저주',    icon: '🐌', color: 0xff8800 },
  scramble_board: { name: '보드 뒤섞기', icon: '🌀', color: 0xaa44ff },
  block_skills:   { name: '스킬 봉인',   icon: '🔒', color: 0xff2244 },
  mirror_board:   { name: '거울 반전',   icon: '↔',  color: 0x44aaff },
}

const ENEMY_COOLDOWNS = {
  add_garbage: 8, slow_player: 15, scramble_board: 25,
  block_skills: 30, mirror_board: 20,
}

export class SkillManager {
  constructor(playerSkillIds, enemySkillIds, aiRef = null) {
    this.playerSkills = playerSkillIds
      .filter(id => SKILL_META[id])
      .map(id => ({ id, ...SKILL_META[id], cooldownLeft: 0 }))

    this.enemySkillIds   = enemySkillIds
    this.ai              = aiRef
    this._enemyCooldowns = Object.fromEntries(enemySkillIds.map(id => [id, 0]))

    this.playerGauge  = 0
    this.enemyGauge   = 0
    this.maxGauge     = 100
    this.gaugePerLine = 25

    this.shieldActive  = false
    this.shieldCharges = 1
    this._shieldLeft   = 0

    this.skillBlocked    = false
    this.skillBlockTimer = 0

    this.onApplyEffect = null
    this.onSkillEffect = null   // 시각 이펙트 콜백 (BattleScene에서 등록)
    this.onEnemySkill  = null   // 적 스킬 알림 콜백
  }

  addPlayerGauge(lines) {
    const prev = this.playerGauge
    this.playerGauge = Math.min(this.maxGauge, this.playerGauge + lines * this.gaugePerLine)
    // 게이지 풀 충전 시 플래시
    if (prev < this.maxGauge && this.playerGauge >= this.maxGauge) {
      this.onSkillEffect?.('gauge_full')
    }
  }
  addEnemyGauge(lines) {
    this.enemyGauge = Math.min(this.maxGauge, this.enemyGauge + lines * 25)
  }

  usePlayerSkill(index) {
    if (this.skillBlocked) {
      this.onSkillEffect?.('blocked')
      return false
    }
    const skill = this.playerSkills[index]
    if (!skill) return false
    if (skill.cooldownLeft > 0) { this.onSkillEffect?.('on_cooldown', skill); return false }
    if (this.playerGauge < skill.cost) { this.onSkillEffect?.('no_gauge', skill); return false }

    this.playerGauge   -= skill.cost
    skill.cooldownLeft  = skill.cooldown
    this.onApplyEffect?.('player', skill.id)
    this.onSkillEffect?.('used', skill)
    return true
  }

  tryEnemySkill(board) {
    // 스킬별 게이지 비용
    const SKILL_COSTS = {
      add_garbage: 30, slow_player: 35, scramble_board: 45,
      block_skills: 55, mirror_board: 40,
    }
    for (const id of this.enemySkillIds) {
      if ((this._enemyCooldowns[id] ?? 0) > 0) continue
      const cost = SKILL_COSTS[id] ?? 30
      if (this.enemyGauge < cost) continue
      const shouldUse = this.ai
        ? this.ai.shouldUseSkill(id, this.enemyGauge, board)
        : this.enemyGauge >= cost
      if (!shouldUse) continue
      this._enemyCooldowns[id] = ENEMY_COOLDOWNS[id] ?? 10
      this.enemyGauge = Math.max(0, this.enemyGauge - cost)
      this.onApplyEffect?.('enemy', id)
      this.onEnemySkill?.(id, ENEMY_SKILL_META[id])
      return id
    }
    return null
  }

  activateShield() {
    this.shieldActive = true
    this._shieldLeft  = this.shieldCharges
    this.onSkillEffect?.('shield_on')
  }

  absorbGarbage() {
    if (this.shieldActive && this._shieldLeft > 0) {
      this._shieldLeft--
      if (this._shieldLeft <= 0) this.shieldActive = false
      this.onSkillEffect?.('shield_absorb')
      return true
    }
    return false
  }

  applyBlockSkills(duration = 5) {
    this.skillBlocked    = true
    this.skillBlockTimer = duration
    this.onSkillEffect?.('skills_blocked')
  }

  unlockEnemySkillsForPhase(allSkills, phase) {
    const unlocked = allSkills.slice(0, Math.min(allSkills.length, phase + 1))
    this.enemySkillIds = unlocked
    for (const id of unlocked)
      if (!(id in this._enemyCooldowns)) this._enemyCooldowns[id] = 0
  }

  update(deltaMs) {
    const dt = deltaMs / 1000
    for (const s of this.playerSkills)
      if (s.cooldownLeft > 0) s.cooldownLeft = Math.max(0, s.cooldownLeft - dt)
    for (const id of Object.keys(this._enemyCooldowns))
      this._enemyCooldowns[id] = Math.max(0, this._enemyCooldowns[id] - dt)
    if (this.skillBlockTimer > 0) {
      this.skillBlockTimer = Math.max(0, this.skillBlockTimer - dt)
      if (this.skillBlockTimer <= 0) this.skillBlocked = false
    }
  }
}
