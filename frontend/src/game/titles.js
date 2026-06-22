/**
 * 칭호 시스템 — 업적/챌린지/플레이로 해금되는 코스메틱 보상
 * 프로필과 랭킹에 표시되어 리텐션 동기 부여
 */

export const TITLES = {
  // ── 기본 ──────────────────────────────────────────
  novice: {
    id: 'novice', name: '견습 모험가', color: '#8888aa',
    desc: '모두가 시작하는 곳', rarity: 'common',
    condition: () => true,  // 기본 보유
  },

  // ── 전투 ──────────────────────────────────────────
  line_breaker: {
    id: 'line_breaker', name: '라인 브레이커', color: '#4ade80',
    desc: '누적 500줄 클리어', rarity: 'uncommon',
    condition: (s) => (s.total_lines ?? 0) >= 500,
  },
  tetris_lord: {
    id: 'tetris_lord', name: '테트리스 군주', color: '#00f5ff',
    desc: '테트리스 50회 달성', rarity: 'rare',
    condition: (s) => (s.tetris_count ?? 0) >= 50,
  },
  spin_master: {
    id: 'spin_master', name: '회전의 달인', color: '#aa00ff',
    desc: 'T-Spin 30회', rarity: 'rare',
    condition: (s) => (s.tspin_count ?? 0) >= 30,
  },
  combo_artist: {
    id: 'combo_artist', name: '콤보 아티스트', color: '#ff4499',
    desc: '최고 콤보 10 이상', rarity: 'epic',
    condition: (s) => (s.max_combo ?? 0) >= 10,
  },

  // ── 스토리 ────────────────────────────────────────
  tower_conqueror: {
    id: 'tower_conqueror', name: '탑의 정복자', color: '#ffd23f',
    desc: '망각의 탑 클리어', rarity: 'uncommon',
    condition: (s) => (s.class_clears?.warrior ?? 0) + (s.clears ?? 0) >= 1,
  },
  true_hero: {
    id: 'true_hero', name: '진정한 영웅', color: '#4ade80',
    desc: '트루 엔딩 달성', rarity: 'epic',
    condition: (s) => (s.endings?.true_ending ?? 0) >= 1,
  },
  spirit_caller: {
    id: 'spirit_caller', name: '정령 소환사', color: '#aa88ff',
    desc: '시크릿 엔딩 달성', rarity: 'epic',
    condition: (s) => (s.endings?.secret_ending ?? 0) >= 1,
  },
  all_endings: {
    id: 'all_endings', name: '운명의 관찰자', color: '#ff8800',
    desc: '모든 엔딩 수집', rarity: 'legendary',
    condition: (s) => Object.keys(s.endings ?? {}).length >= 6,
  },

  // ── 챌린지 ────────────────────────────────────────
  daily_warrior: {
    id: 'daily_warrior', name: '일일 전사', color: '#8b5cff',
    desc: '챌린지 10회 완료', rarity: 'uncommon',
    condition: (s) => (s.challenge_wins ?? 0) >= 10,
  },
  champion: {
    id: 'champion', name: '챔피언', color: '#ffd23f',
    desc: '일일 챌린지 1위 달성', rarity: 'legendary',
    condition: (s) => (s.challenge_first_place ?? 0) >= 1,
  },
  unwavering: {
    id: 'unwavering', name: '불굴의 의지', color: '#ff8800',
    desc: '14일 연속 챌린지 참여', rarity: 'legendary',
    condition: (s) => (s.max_streak ?? 0) >= 14,
  },

  // ── 신규 스토리 ───────────────────────────────────
  round_table: {
    id: 'round_table', name: '원탁의 계승자', color: '#ffd23f',
    desc: '별을 삼킨 성채 클리어', rarity: 'epic',
    condition: (s) => (s.endings?.redemption_ending ?? 0) >= 1 || (s.endings?.escape_ending ?? 0) >= 1,
  },
  void_walker: {
    id: 'void_walker', name: '공허의 항해자', color: '#44aaff',
    desc: '정지된 함선 클리어', rarity: 'epic',
    condition: (s) => (s.endings?.free_ending ?? 0) >= 1 || (s.endings?.machine_ending ?? 0) >= 1,
  },

  // ── 마스터리 ──────────────────────────────────────
  perfectionist: {
    id: 'perfectionist', name: '완벽주의자', color: '#00f5ff',
    desc: '퍼펙트 클리어 5회', rarity: 'epic',
    condition: (s) => (s.perfect_clear_count ?? 0) >= 5,
  },
  veteran: {
    id: 'veteran', name: '베테랑', color: '#ff8800',
    desc: '전투 100회', rarity: 'rare',
    condition: (s) => (s.total_battles ?? 0) >= 100,
  },
  class_master: {
    id: 'class_master', name: '만물의 대가', color: '#ffd23f',
    desc: '서로 다른 클래스로 5번 클리어', rarity: 'legendary',
    condition: (s) => Object.keys(s.class_clears ?? {}).length >= 5,
  },
  endless_climber: {
    id: 'endless_climber', name: '무한의 등반자', color: '#44ddff',
    desc: '엔드리스 레벨 7 도달', rarity: 'rare',
    condition: (s) => (s.endless_best_level ?? 0) >= 7,
  },
  abyss_sovereign: {
    id: 'abyss_sovereign', name: '심연의 군주', color: '#aa44ff',
    desc: '엔드리스 5000점 돌파', rarity: 'legendary',
    condition: (s) => (s.endless_best_score ?? 0) >= 5000,
  },
}

export const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }
export const RARITY_COLORS = {
  common:    '#8888aa',
  uncommon:  '#4ade80',
  rare:      '#5599ff',
  epic:      '#aa44ff',
  legendary: '#ffd23f',
}

const STORAGE_KEY = 'bq_unlocked_titles'
const ACTIVE_KEY  = 'bq_active_title'

export function getUnlockedTitles() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return saved.includes('novice') ? saved : ['novice', ...saved]
  } catch { return ['novice'] }
}

export function getActiveTitle() {
  return localStorage.getItem(ACTIVE_KEY) ?? 'novice'
}

export function setActiveTitle(titleId) {
  if (getUnlockedTitles().includes(titleId)) {
    localStorage.setItem(ACTIVE_KEY, titleId)
    return true
  }
  return false
}

/**
 * 통계 기반으로 새로 해금된 칭호를 체크하고 저장
 * @returns 새로 해금된 칭호 배열
 */
export function checkNewTitles(stats) {
  const unlocked = getUnlockedTitles()
  const newOnes  = []

  for (const title of Object.values(TITLES)) {
    if (unlocked.includes(title.id)) continue
    try {
      if (title.condition(stats)) {
        unlocked.push(title.id)
        newOnes.push(title)
      }
    } catch (_) {}
  }

  if (newOnes.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked))
  }
  return newOnes
}

export function getTitle(id) {
  return TITLES[id] ?? TITLES.novice
}
