/**
 * 업적 시스템
 * localStorage 기반 로컬 추적 + Supabase 영속화
 */

export const ACHIEVEMENTS = {
  // ── 첫 경험 ─────────────────────────────────────────
  first_battle: {
    id: 'first_battle',
    name: '첫 번째 전투',
    desc: '처음으로 테트리스 전투를 완료했다',
    icon: '⚔',
    rarity: 'common',
    condition: (stats) => stats.total_battles >= 1,
  },
  first_clear: {
    id: 'first_clear',
    name: '탑 정복자',
    desc: '스토리를 처음으로 클리어했다',
    icon: '✦',
    rarity: 'uncommon',
    condition: (stats) => stats.cleared_runs >= 1,
  },
  first_tetris: {
    id: 'first_tetris',
    name: '테트리스!',
    desc: '한 번에 4줄을 클리어했다',
    icon: '🧩',
    rarity: 'common',
    condition: (stats) => stats.tetris_count >= 1,
  },

  // ── 전투 마스터리 ────────────────────────────────────
  line_master: {
    id: 'line_master',
    name: '라인 마스터',
    desc: '누적 1000줄을 클리어했다',
    icon: '📊',
    rarity: 'rare',
    condition: (stats) => stats.total_lines >= 1000,
  },
  tspin_novice: {
    id: 'tspin_novice',
    name: 'T-Spin 입문',
    desc: 'T-Spin을 처음 성공했다',
    icon: '🌀',
    rarity: 'uncommon',
    condition: (stats) => stats.tspin_count >= 1,
  },
  combo_king: {
    id: 'combo_king',
    name: '콤보 황제',
    desc: '5콤보 이상을 달성했다',
    icon: '🔥',
    rarity: 'rare',
    condition: (stats) => stats.max_combo >= 5,
  },
  perfect_clear: {
    id: 'perfect_clear',
    name: '완전 소거',
    desc: '퍼펙트 클리어를 달성했다',
    icon: '💎',
    rarity: 'epic',
    condition: (stats) => stats.perfect_clear_count >= 1,
  },
  b2b_streak: {
    id: 'b2b_streak',
    name: 'Back-to-Back',
    desc: 'B2B를 3번 연속 달성했다',
    icon: '⚡',
    rarity: 'rare',
    condition: (stats) => stats.max_b2b_streak >= 3,
  },

  // ── 클래스 마스터리 ──────────────────────────────────
  warrior_master: {
    id: 'warrior_master',
    name: '불굴의 전사',
    desc: '전사로 클리어했다',
    icon: '⚔',
    rarity: 'uncommon',
    condition: (stats) => stats.class_clears?.warrior >= 1,
  },
  mage_master: {
    id: 'mage_master',
    name: '시간의 마법사',
    desc: '마법사로 클리어했다',
    icon: '✦',
    rarity: 'uncommon',
    condition: (stats) => stats.class_clears?.mage >= 1,
  },
  rogue_master: {
    id: 'rogue_master',
    name: '그림자 도적',
    desc: '도적으로 클리어했다',
    icon: '◈',
    rarity: 'uncommon',
    condition: (stats) => stats.class_clears?.rogue >= 1,
  },
  all_classes: {
    id: 'all_classes',
    name: '만능 모험가',
    desc: '세 가지 기본 클래스 모두로 클리어했다',
    icon: '🌟',
    rarity: 'epic',
    condition: (stats) =>
      stats.class_clears?.warrior >= 1 &&
      stats.class_clears?.mage    >= 1 &&
      stats.class_clears?.rogue   >= 1,
  },

  // ── 엔딩 수집 ────────────────────────────────────────
  bad_ending_collector: {
    id: 'bad_ending_collector',
    name: '쓸쓸한 결말',
    desc: '배드 엔딩을 경험했다',
    icon: '💀',
    rarity: 'common',
    condition: (stats) => stats.endings?.bad_ending >= 1,
  },
  secret_hunter: {
    id: 'secret_hunter',
    name: '비밀 탐구자',
    desc: '시크릿 엔딩을 달성했다',
    icon: '🔮',
    rarity: 'epic',
    condition: (stats) => stats.endings?.secret_ending >= 1,
  },
  all_endings: {
    id: 'all_endings',
    name: '이야기의 끝',
    desc: '모든 엔딩을 수집했다',
    icon: '📖',
    rarity: 'legendary',
    condition: (stats) =>
      stats.endings?.true_ending   >= 1 &&
      stats.endings?.bad_ending    >= 1 &&
      stats.endings?.secret_ending >= 1,
  },

  // ── 런 기록 ──────────────────────────────────────────
  speed_runner: {
    id: 'speed_runner',
    name: '스피드런',
    desc: '30분 이내에 클리어했다',
    icon: '⏱',
    rarity: 'rare',
    condition: (stats) => stats.fastest_clear_sec && stats.fastest_clear_sec < 1800,
  },
  survivor: {
    id: 'survivor',
    name: '생존자',
    desc: '10번의 런을 완료했다',
    icon: '🛡',
    rarity: 'uncommon',
    condition: (stats) => stats.total_runs >= 10,
  },
  legend: {
    id: 'legend',
    name: '전설',
    desc: '50번의 런을 완료했다',
    icon: '👑',
    rarity: 'legendary',
    condition: (stats) => stats.total_runs >= 50,
  },

  // ── 스토리 컬렉션 ────────────────────────────────────
  knight_redeemer: {
    id: 'knight_redeemer',
    name: '기사들의 구원자',
    desc: '별을 삼킨 성채에서 기사들을 해방했다',
    icon: '⚔',
    rarity: 'epic',
    condition: (stats) => (stats.endings?.redemption_ending ?? 0) >= 1,
  },
  ship_silencer: {
    id: 'ship_silencer',
    name: '함선을 멈춘 자',
    desc: '정지된 함선에서 미라를 정지시켰다',
    icon: '🛸',
    rarity: 'epic',
    condition: (stats) => (stats.endings?.free_ending ?? 0) >= 1,
  },
  story_collector: {
    id: 'story_collector',
    name: '이야기 수집가',
    desc: '서로 다른 스토리를 3개 이상 클리어했다',
    icon: '📚',
    rarity: 'rare',
    condition: (stats) => Object.keys(stats.class_clears ?? {}).length >= 3 || (stats.clears ?? 0) >= 3,
  },

  // ── 챌린지 ───────────────────────────────────────────
  streak_week: {
    id: 'streak_week',
    name: '꾸준한 도전자',
    desc: '7일 연속 일일 챌린지에 참여했다',
    icon: '🔥',
    rarity: 'rare',
    condition: (stats) => (stats.max_streak ?? 0) >= 7,
  },
  challenge_master: {
    id: 'challenge_master',
    name: '챌린지 마스터',
    desc: '일일 챌린지를 30회 완료했다',
    icon: '🗓',
    rarity: 'epic',
    condition: (stats) => (stats.challenge_wins ?? 0) >= 30,
  },
  endless_survivor: {
    id: 'endless_survivor',
    name: '끝없는 생존자',
    desc: '엔드리스 모드에서 레벨 5에 도달했다',
    icon: '♾️',
    rarity: 'uncommon',
    condition: (stats) => (stats.endless_best_level ?? 0) >= 5,
  },
  endless_veteran: {
    id: 'endless_veteran',
    name: '무한의 도전자',
    desc: '엔드리스 모드를 10회 플레이했다',
    icon: '🔄',
    rarity: 'rare',
    condition: (stats) => (stats.endless_games ?? 0) >= 10,
  },
  endless_master: {
    id: 'endless_master',
    name: '심연의 지배자',
    desc: '엔드리스 모드에서 레벨 10에 도달했다',
    icon: '🌌',
    rarity: 'epic',
    condition: (stats) => (stats.endless_best_level ?? 0) >= 10,
  },
  endless_legend: {
    id: 'endless_legend',
    name: '불멸의 전설',
    desc: '엔드리스 모드에서 5000점을 돌파했다',
    icon: '💫',
    rarity: 'legendary',
    condition: (stats) => (stats.endless_best_score ?? 0) >= 5000,
  },
  hidden_combo_master: {
    id: 'hidden_combo_master',
    name: '연쇄의 화신',
    desc: '한 전투에서 10연속 콤보를 달성했다',
    icon: '🔗',
    rarity: 'epic',
    hidden: true,
    condition: (stats) => (stats.max_combo ?? 0) >= 10,
  },
  hidden_perfectionist: {
    id: 'hidden_perfectionist',
    name: '완벽주의자',
    desc: '퍼펙트 클리어를 5회 달성했다',
    icon: '💠',
    rarity: 'epic',
    hidden: true,
    condition: (stats) => (stats.perfect_clear_count ?? 0) >= 5,
  },
  hidden_worldwalker: {
    id: 'hidden_worldwalker',
    name: '세계를 걷는 자',
    desc: '서로 다른 7개의 스토리를 모두 클리어했다',
    icon: '🌠',
    rarity: 'legendary',
    hidden: true,
    condition: (stats) => Object.keys(stats.cleared_stories ?? {}).length >= 7,
  },
}

export const RARITY_COLORS = {
  common:    '#aaaacc',
  uncommon:  '#44ff99',
  rare:      '#5588ff',
  epic:      '#aa44ff',
  legendary: '#ffd700',
}

const STORAGE_KEY = 'bq_achievements'

export function getAchievementStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch { return {} }
}

export function saveAchievementStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

export function checkNewAchievements(stats) {
  const earned = JSON.parse(localStorage.getItem('bq_earned_achievements') ?? '[]')
  const newOnes = []

  for (const ach of Object.values(ACHIEVEMENTS)) {
    if (earned.includes(ach.id)) continue
    try {
      if (ach.condition(stats)) {
        earned.push(ach.id)
        newOnes.push(ach)
      }
    } catch (_) {}
  }

  if (newOnes.length > 0) {
    localStorage.setItem('bq_earned_achievements', JSON.stringify(earned))
  }
  return newOnes
}

export function getEarnedAchievements() {
  try {
    return JSON.parse(localStorage.getItem('bq_earned_achievements') ?? '[]')
  } catch { return [] }
}

export function updateStats(patch) {
  const stats   = getAchievementStats()
  const updated = JSON.parse(JSON.stringify(stats))  // 깊은 복사

  for (const [key, value] of Object.entries(patch)) {
    // 점 표기법 지원: 'class_clears.warrior' → updated.class_clears.warrior
    if (key.includes('.')) {
      const [parent, child] = key.split('.')
      if (!updated[parent]) updated[parent] = {}
      if (typeof value === 'number') {
        updated[parent][child] = (updated[parent][child] ?? 0) + value
      } else {
        updated[parent][child] = value
      }
    } else if (typeof value === 'number') {
      updated[key] = (updated[key] ?? 0) + value
    } else if (typeof value === 'object' && value !== null) {
      updated[key] = { ...(updated[key] ?? {}), ...value }
    } else {
      updated[key] = value
    }
  }

  // max_combo는 누적이 아닌 최댓값
  if (patch.max_combo !== undefined) {
    updated.max_combo = Math.max(stats.max_combo ?? 0, patch.max_combo)
  }
  // max_streak도 최댓값
  if (patch.max_streak !== undefined) {
    updated.max_streak = Math.max(stats.max_streak ?? 0, patch.max_streak)
  }
  // max_b2b_streak도 최댓값
  if (patch.max_b2b_streak !== undefined) {
    updated.max_b2b_streak = Math.max(stats.max_b2b_streak ?? 0, patch.max_b2b_streak)
  }
  // fastest_clear_sec는 최솟값 (빠를수록 좋음)
  if (patch.fastest_clear_sec !== undefined) {
    updated.fastest_clear_sec = stats.fastest_clear_sec
      ? Math.min(stats.fastest_clear_sec, patch.fastest_clear_sec)
      : patch.fastest_clear_sec
  }
  // 엔드리스 최고 점수/레벨은 최댓값
  if (patch.endless_best_score !== undefined) {
    updated.endless_best_score = Math.max(stats.endless_best_score ?? 0, patch.endless_best_score)
  }
  if (patch.endless_best_level !== undefined) {
    updated.endless_best_level = Math.max(stats.endless_best_level ?? 0, patch.endless_best_level)
  }

  saveAchievementStats(updated)
  return updated
}
