/**
 * 필드 이벤트 정의
 * GM이 battle.field_events 배열로 전달하거나,
 * BattleScene이 자체적으로 랜덤 발동할 수 있음
 */

export const FIELD_EVENTS = {
  // ── 긍정적 ──────────────────────────────────────────
  bonus_block: {
    id: 'bonus_block',
    name: '보너스 블록',
    desc: '특수 블록 등장 — 착지 시 3줄 즉시 클리어',
    color: 0xffe600,
    icon: '⭐',
    positive: true,
    duration: null,   // 일회성
  },
  gauge_burst: {
    id: 'gauge_burst',
    name: '마나 폭발',
    desc: '스킬 게이지가 즉시 최대로 충전됨',
    color: 0xaa88ff,
    icon: '✦',
    positive: true,
    duration: null,
  },
  slow_gravity: {
    id: 'slow_gravity',
    name: '약한 중력',
    desc: '낙하 속도 40% 감소 (15초)',
    color: 0x00f5ff,
    icon: '🪶',
    positive: true,
    duration: 15000,
  },

  // ── 부정적 ──────────────────────────────────────────
  darkness: {
    id: 'darkness',
    name: '암흑',
    desc: '보드 절반이 보이지 않음 (10초)',
    color: 0x222244,
    icon: '🌑',
    positive: false,
    duration: 10000,
  },
  heavy_gravity: {
    id: 'heavy_gravity',
    name: '강한 중력',
    desc: '낙하 속도 2배 증가 (10초)',
    color: 0xff4466,
    icon: '⬇',
    positive: false,
    duration: 10000,
  },
  earthquake: {
    id: 'earthquake',
    name: '지진',
    desc: '보드 전체가 흔들림 + 가비지 1줄',
    color: 0xff8800,
    icon: '🌋',
    positive: false,
    duration: null,
  },
  random_rotation: {
    id: 'random_rotation',
    name: '혼돈의 바람',
    desc: '현재 블록이 랜덤 방향으로 회전됨',
    color: 0xff6699,
    icon: '🌀',
    positive: false,
    duration: null,
  },

  // ── 중립 (전략적) ────────────────────────────────────
  double_score: {
    id: 'double_score',
    name: '점수 2배',
    desc: '다음 라인 클리어 점수 2배 (20초)',
    color: 0x44ff99,
    icon: '✕2',
    positive: true,
    duration: 20000,
  },
  narrow_board: {
    id: 'narrow_board',
    name: '좁은 공간',
    desc: '보드 양쪽에 1칸씩 블록이 채워짐',
    color: 0x887766,
    icon: '◀▶',
    positive: false,
    duration: null,
  },

  // ── 추가 이벤트 ──────────────────────────────────────
  mirror_board: {
    id: 'mirror_board',
    name: '거울 세계',
    desc: '보드 좌우가 반전됨',
    color: 0x66ccff,
    icon: '🪞',
    positive: false,
    duration: null,
  },
  garbage_rain: {
    id: 'garbage_rain',
    name: '잔해의 비',
    desc: '하늘에서 가비지 2줄이 쏟아짐',
    color: 0xcc5544,
    icon: '🌧',
    positive: false,
    duration: null,
  },
  healing_zone: {
    id: 'healing_zone',
    name: '치유의 영역',
    desc: '스킬 게이지가 천천히 차오름 (12초)',
    color: 0x66ffaa,
    icon: '💚',
    positive: true,
    duration: 12000,
  },
}

// 랜덤 이벤트 풀 (전투 중 자동 발동용)
export const RANDOM_EVENT_POOL = [
  'bonus_block', 'gauge_burst', 'heavy_gravity',
  'earthquake', 'random_rotation', 'double_score',
  'mirror_board', 'garbage_rain', 'healing_zone',
]

export function getRandomEvent() {
  const id = RANDOM_EVENT_POOL[Math.floor(Math.random() * RANDOM_EVENT_POOL.length)]
  return FIELD_EVENTS[id]
}
