export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '전사',
    icon: '⚔',
    description: '방어에 능하고 끈질기게 버티는 전사.',
    color: '#ff8800',
    startSkills: ['clear_line', 'shield', 'swap_block'],
    unlockRequirement: null,
    premium: false,  // 기본 해금
    passives: {
      shieldCharges: 2,
      gaugePerLine: 30,
      dropIntervalBonus: 100,
    },
    bonusDescription: ['보호막 2회 연속', '스킬 게이지 +20%', '낙하 속도 감소'],
  },

  mage: {
    id: 'mage',
    name: '마법사',
    icon: '✦',
    description: '시간을 조작하는 마법사.',
    color: '#8b5cff',
    startSkills: ['arcane_blast', 'time_slow', 'preview_extend'],
    unlockRequirement: null,
    premium: false,
    passives: {
      freeTimeSlow: true,
      extraPreview: 2,
      gaugePerLine: 22,
    },
    bonusDescription: ['시간 늦추기 무료', '미리보기 +2 항시', '게이지 충전 -10%'],
  },

  rogue: {
    id: 'rogue',
    name: '도적',
    icon: '◈',
    description: '빠르고 교활한 도적.',
    color: '#4ade80',
    startSkills: ['swap_block', 'clear_line', 'add_garbage'],
    unlockRequirement: null,
    premium: false,
    passives: {
      swapNoCooldown: true,
      fastDrop: true,
      gaugePerLine: 28,
      canUseEnemySkill: true,
    },
    bonusDescription: ['블록 교체 쿨다운 없음', '낙하 속도 증가', '가비지 공격 가능'],
  },

  paladin: {
    id: 'paladin',
    name: '성기사',
    icon: '🛡',
    description: '신성한 힘으로 아군을 지키는 성기사. 패배해도 한 번 더 기회가 주어진다.',
    color: '#ffd23f',
    startSkills: ['shield', 'clear_line', 'time_slow'],
    unlockRequirement: 'class_paladin',
    premium: true,  // 망각의 탑 true_ending 달성 시 해금
    passives: {
      shieldCharges: 3,
      gaugePerLine: 28,
      reviveOnce: true,    // 첫 번째 게임오버 시 HP 30으로 부활
      dropIntervalBonus: 80,
    },
    bonusDescription: ['보호막 3회 연속', '1회 부활 (HP 30)', '낙하 속도 감소'],
  },

  summoner: {
    id: 'summoner',
    name: '소환사',
    icon: '🌀',
    description: '이계의 존재를 소환하는 신비로운 마법사. 라인 클리어 시 강력한 추가 효과가 발동한다.',
    color: '#ff44cc',
    startSkills: ['summon_aid', 'preview_extend', 'clear_line'],
    unlockRequirement: 'class_summoner',
    premium: true,  // 망각의 탑 secret_ending 달성 시 해금
    passives: {
      extraPreview: 1,
      gaugePerLine: 35,
      summonOnClear: true,   // 2줄 이상 클리어 시 적 보드에 가비지 자동 추가
      fastDrop: true,
    },
    bonusDescription: ['클리어 시 자동 가비지 공격', '게이지 충전 +40%', '낙하 속도 증가'],
  },

  guardian: {
    id: 'guardian',
    name: '수호기사',
    icon: '⚜',
    description: '원탁의 맹세를 잇는 수호자. 받은 공격을 굳건히 막아내고 되돌려준다.',
    color: '#ffd23f',
    startSkills: ['shield', 'clear_line', 'swap_block'],
    unlockRequirement: 'class_guardian',
    premium: true,  // 별을 삼킨 성채 클리어 시 해금
    passives: {
      shieldCharges: 3,
      gaugePerLine: 26,
      lockDelayBonus: 250,    // 락 딜레이 +250ms (더 여유로운 조작)
      garbageDefense: true,   // 받는 가비지 큐 지연 +1초 (상쇄 기회 증가)
    },
    bonusDescription: ['보호막 3회 연속', '락 딜레이 연장 (정밀 조작)', '가비지 방어 시간 증가'],
  },

  technician: {
    id: 'technician',
    name: '기술자',
    icon: '⚙',
    description: '함선의 시스템을 다루던 생존자. 냉철한 계산으로 흐름을 지배한다.',
    color: '#44aaff',
    startSkills: ['preview_extend', 'time_slow', 'clear_line'],
    unlockRequirement: 'class_technician',
    premium: true,  // 정지된 함선 클리어 시 해금
    passives: {
      extraPreview: 2,
      gaugePerLine: 24,
      freeTimeSlow: true,     // 시간 늦추기 무료
      counterBonus: true,     // 가비지 상쇄 시 게이지 추가 충전
    },
    bonusDescription: ['미리보기 +2 항시', '시간 늦추기 무료', '가비지 상쇄 시 게이지 보너스'],
  },
  swordmaster: {
    id: 'swordmaster',
    name: '검객',
    icon: '⚔',
    description: '강호를 떠도는 검의 달인. 끊임없는 초식 연계로 적을 압도한다.',
    color: '#e63946',
    startSkills: ['sword_dance', 'mind_blade', 'clear_line'],
    unlockRequirement: 'class_swordmaster',
    premium: true,  // 강호: 마교의 부활 클리어 시 해금
    passives: {
      comboBonus: true,       // 콤보 유지 시 추가 게이지 (초식 연계)
      gaugePerLine: 28,       // 빠른 게이지 충전
      fastDrop: true,         // 발검 — 빠른 낙하
    },
    bonusDescription: ['콤보 연계 시 게이지 보너스', '게이지 충전 속도 증가', '발검 — 빠른 낙하 속도'],
  },
}

export const ALL_CLASS_IDS    = Object.keys(CLASSES)
export const DEFAULT_CLASS_IDS = ['warrior', 'mage', 'rogue']

export function isClassUnlocked(classId, unlockedIds = []) {
  const cls = CLASSES[classId]
  if (!cls) return false
  if (!cls.unlockRequirement) return true
  return unlockedIds.includes(cls.unlockRequirement)
}

export function applyClassPassives(classId, skillManager, scene) {
  const cls = CLASSES[classId]
  if (!cls) return
  const p = cls.passives

  if (p.gaugePerLine)      skillManager.gaugePerLine    = p.gaugePerLine
  if (p.shieldCharges)     skillManager.shieldCharges   = p.shieldCharges
  if (p.extraPreview)      scene._permanentPreviewBonus = p.extraPreview
  if (p.freeTimeSlow) {
    const s = skillManager.playerSkills.find(s => s.id === 'time_slow')
    if (s) s.cost = 0
  }
  if (p.swapNoCooldown) {
    const s = skillManager.playerSkills.find(s => s.id === 'swap_block')
    if (s) s.cooldown = 0
  }
  if (p.fastDrop)          scene.playerDropInterval = 620
  else if (p.dropIntervalBonus) scene.playerDropInterval = 800 + p.dropIntervalBonus
  if (p.reviveOnce)        scene._reviveAvailable   = true
  if (p.summonOnClear)     scene._summonOnClear      = true
  // 수호기사
  if (p.lockDelayBonus)    scene.LOCK_DELAY         = (scene.LOCK_DELAY ?? 500) + p.lockDelayBonus
  if (p.garbageDefense)    scene.GARBAGE_DELAY      = (scene.GARBAGE_DELAY ?? 1500) + 1000
  // 기술자
  if (p.counterBonus)      scene._counterBonus      = true
  // 검객
  if (p.comboBonus)        scene._comboBonus        = true
}
