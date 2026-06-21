import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

// Railway 슬립 대응 웜업
let warmedUp = false
async function ensureWarm() {
  if (warmedUp) return
  try {
    await fetch(`${BASE.replace('/api', '')}/warmup`)
    warmedUp = true
  } catch (_) {}
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export class APIError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name   = 'APIError'
    // status 0 = 네트워크 실패 (서버 도달 불가)
    this.isNetworkError = status === 0
  }
}

const TIMEOUT_MS = 30000  // 30초 (Railway 콜드스타트 여유)

async function request(method, path, body, { retries = 1 } = {}) {
  await ensureWarm()

  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: await authHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        let detail = `오류 (${res.status})`
        try { const j = await res.json(); detail = j.detail ?? detail } catch (_) {}
        // 401 인증 만료: 세션 정리 후 홈으로 (재로그인 유도)
        if (res.status === 401) {
          try {
            const { supabase } = await import('./supabase')
            await supabase.auth.signOut()
          } catch (_) {}
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            window.location.href = '/'
          }
          throw new APIError(401, detail)
        }
        // 5xx는 재시도 가치 있음, 4xx는 즉시 실패
        if (res.status >= 500 && attempt < retries) {
          lastError = new APIError(res.status, detail)
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
          continue
        }
        throw new APIError(res.status, detail)
      }
      return res.json()
    } catch (e) {
      clearTimeout(timer)
      if (e instanceof APIError) throw e
      // fetch 자체 실패 (네트워크 끊김, 타임아웃, CORS 등)
      const isAbort = e.name === 'AbortError'
      lastError = new APIError(0, isAbort
        ? '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
        : '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.')
      // 네트워크 오류는 한 번 재시도 (콜드스타트 대응)
      if (attempt < retries) {
        warmedUp = false  // 웜업 재시도 유도
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
    }
  }
  throw lastError
}

const post = (path, body) => request('POST', path, body)
const get  = (path)       => request('GET',  path)
const del  = (path)       => request('DELETE', path)

// Guide ID 헬퍼
export function getGuideId() {
  return localStorage.getItem('bq_guide_id') ?? 'default'
}

export const api = {
  // GM — guide_id를 로컬스토리지에서 자동 주입
  gmAction:       (playerInput, gameState) =>
    post('/gm/action', { player_input: playerInput, game_state: gameState, guide_id: getGuideId() }),
  gmBattleResult: (result)       => post('/gm/battle-result', result),
  gmReset:        ()             => post('/gm/reset', { guide_id: getGuideId() }),
  gmSession:      ()             => get('/gm/session'),
  guides:         ()             => get('/gm/guides'),
  npcRelations:   ()             => get('/gm/npc-relations'),

  // Payment
  createCheckout: (planId)       => post('/payment/checkout', { plan_id: planId }),
  paymentStatus:  ()             => get('/payment/status'),

  // Subscription
  subscriptionMe:     ()         => get('/subscription/me'),
  subscriptionPlans:  ()         => get('/subscription/plans'),
  subscriptionCheckout: ()       => post('/subscription/checkout', {}),

  // Game save (slot 지원)
  saveGame:   (data)               => post('/game/save', data),
  loadGame:   (guideId='default', slot=1) => get(`/game/load?guide_id=${guideId}&slot=${slot}`),
  listSaves:  ()                   => get('/game/saves'),
  deleteSave: (guideId, slot=1)    => del(`/game/save?guide_id=${guideId}&slot=${slot}`),

  // Runs
  startRun:    (playerClass)  => post(`/runs/start?player_class=${playerClass}`, {}),
  endRun:      (body)         => post('/runs/end', body),
  runHistory:  ()             => get('/runs/history'),
  bestRun:     ()             => get('/runs/best'),
  unlocks:     ()             => get('/runs/unlocks'),
  activeRun:   ()             => get('/runs/active'),
  runStats:    ()             => get('/runs/stats'),

  // Challenge
  todayChallenge:       ()     => get('/challenge/today'),
  submitChallenge:      (body) => post('/challenge/submit', body),
  challengeLeaderboard: ()     => get('/challenge/leaderboard'),
  submitEndless:        (body) => post('/runs/endless', body),
  endlessLeaderboard:   ()     => get('/runs/endless/leaderboard'),
  challengeHistory:     ()     => get('/challenge/history'),

  // Leaderboard
  leaderboardLines:  ()     => get('/runs/leaderboard/lines'),
  leaderboardRuns:   ()     => get('/runs/leaderboard/runs'),
}
