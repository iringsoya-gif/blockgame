/**
 * 게임 상태 영속성 관리
 * localStorage 기반 — 탭 닫아도 유지
 */

const STORAGE_KEYS = {
  PLAYER_CLASS:   'bq_player_class',
  GAME_STATE:     'bq_game_state',
  MESSAGES:       'bq_messages',
  UNLOCKED_UPGRADES: 'bq_unlocked_upgrades',
  RUN_ID:         'bq_run_id',
  RUN_START:      'bq_run_start',
}

// localStorage 접근 안전 래퍼 (시크릿 모드/용량 초과 대응)
const safeSet = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
const safeGet = (k)    => { try { return localStorage.getItem(k) } catch { return null } }
const safeRemove = (k) => { try { localStorage.removeItem(k) } catch {} }

export const gameStorage = {
  // 클래스
  setPlayerClass: (cls) => safeSet(STORAGE_KEYS.PLAYER_CLASS, cls),
  getPlayerClass: () => safeGet(STORAGE_KEYS.PLAYER_CLASS),
  clearPlayerClass: () => safeRemove(STORAGE_KEYS.PLAYER_CLASS),

  // 게임 상태 (HP, Gold, XP, Level)
  setGameState: (state) => safeSet(STORAGE_KEYS.GAME_STATE, JSON.stringify(state)),
  getGameState: () => {
    try { return JSON.parse(safeGet(STORAGE_KEYS.GAME_STATE)) } catch { return null }
  },

  // 메시지 히스토리 (최근 50개만)
  setMessages: (msgs) => {
    const trimmed = (msgs ?? []).slice(-50)
    safeSet(STORAGE_KEYS.MESSAGES, JSON.stringify(trimmed))
  },
  getMessages: () => {
    try { return JSON.parse(safeGet(STORAGE_KEYS.MESSAGES)) ?? [] } catch { return [] }
  },

  // 해금 업그레이드
  setUnlockedUpgrades: (ids) => safeSet(STORAGE_KEYS.UNLOCKED_UPGRADES, JSON.stringify(ids ?? [])),
  getUnlockedUpgrades: () => {
    try { return JSON.parse(safeGet(STORAGE_KEYS.UNLOCKED_UPGRADES)) ?? [] } catch { return [] }
  },

  // 런 ID
  setRunId: (id) => safeSet(STORAGE_KEYS.RUN_ID, id ?? ''),
  getRunId: () => safeGet(STORAGE_KEYS.RUN_ID) || null,

  // 런 시작 시각 (클리어 시간 측정용)
  setRunStart: (ts) => safeSet(STORAGE_KEYS.RUN_START, String(ts ?? Date.now())),
  getRunStart: () => {
    const v = safeGet(STORAGE_KEYS.RUN_START)
    return v ? parseInt(v, 10) : null
  },

  // 전체 클리어 (런 종료 시 호출)
  clearAll: () => Object.values(STORAGE_KEYS).forEach(safeRemove),

  // 진행 중인 게임 있는지 확인
  hasActiveGame: () => {
    const cls   = safeGet(STORAGE_KEYS.PLAYER_CLASS)
    const state = safeGet(STORAGE_KEYS.GAME_STATE)
    return !!(cls && state)
  },
}
