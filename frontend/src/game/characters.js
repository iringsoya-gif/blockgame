/**
 * SVG 캐릭터 실루엣 정의
 * Phaser Graphics + Text 조합으로 렌더링
 * 각 shape는 { type, ... } 명령 배열로 구성
 */

// 공통 드로어: Phaser.GameObjects.Graphics에 shape 배열을 그림
export function drawCharacterSilhouette(gfx, cx, cy, color, alpha = 1, scale = 1) {
  gfx.fillStyle(color, alpha)
  const s = scale

  // 머리
  gfx.fillCircle(cx, cy - 28 * s, 10 * s)
  // 몸통
  gfx.fillRect(cx - 8 * s, cy - 18 * s, 16 * s, 20 * s)
  // 왼팔
  gfx.fillRect(cx - 16 * s, cy - 18 * s, 8 * s, 14 * s)
  // 오른팔
  gfx.fillRect(cx + 8 * s,  cy - 18 * s, 8 * s, 14 * s)
  // 왼다리
  gfx.fillRect(cx - 8 * s, cy + 2 * s,  7 * s, 18 * s)
  // 오른다리
  gfx.fillRect(cx + 1 * s, cy + 2 * s,  7 * s, 18 * s)
}

// 클래스별 장비 추가 실루엣
export const CLASS_SILHOUETTES = {
  warrior: (gfx, cx, cy, color, alpha, s = 1) => {
    drawCharacterSilhouette(gfx, cx, cy, color, alpha, s)
    // 방패 (왼쪽)
    gfx.fillStyle(color, alpha * 0.7)
    gfx.fillRect(cx - 24 * s, cy - 20 * s, 10 * s, 16 * s)
    // 칼 (오른쪽)
    gfx.fillRect(cx + 16 * s, cy - 28 * s, 4 * s, 24 * s)
  },
  mage: (gfx, cx, cy, color, alpha, s = 1) => {
    drawCharacterSilhouette(gfx, cx, cy, color, alpha, s)
    // 지팡이
    gfx.fillStyle(color, alpha * 0.8)
    gfx.fillRect(cx + 16 * s, cy - 36 * s, 3 * s, 36 * s)
    // 지팡이 구슬
    gfx.fillCircle(cx + 17 * s, cy - 38 * s, 5 * s)
    // 로브 자락 (삼각형 근사)
    gfx.fillTriangle(
      cx - 8 * s, cy + 2 * s,
      cx + 8 * s, cy + 2 * s,
      cx,         cy + 24 * s
    )
  },
  rogue: (gfx, cx, cy, color, alpha, s = 1) => {
    drawCharacterSilhouette(gfx, cx, cy, color, alpha, s)
    // 단검 두 개
    gfx.fillStyle(color, alpha * 0.8)
    gfx.fillRect(cx - 22 * s, cy - 24 * s, 3 * s, 18 * s)
    gfx.fillRect(cx + 19 * s, cy - 24 * s, 3 * s, 18 * s)
    // 후드 (머리 위 삼각형)
    gfx.fillTriangle(
      cx - 12 * s, cy - 28 * s,
      cx + 12 * s, cy - 28 * s,
      cx,          cy - 46 * s
    )
  },
}

// 적 실루엣 종류
export const ENEMY_SILHOUETTES = {
  default: (gfx, cx, cy, color, alpha, s = 1) => {
    gfx.fillStyle(color, alpha)
    // 슬라임 형태
    gfx.fillEllipse(cx, cy, 36 * s, 28 * s)
    // 눈 두 개
    gfx.fillStyle(0x000000, alpha)
    gfx.fillCircle(cx - 7 * s, cy - 4 * s, 4 * s)
    gfx.fillCircle(cx + 7 * s, cy - 4 * s, 4 * s)
  },
  boss: (gfx, cx, cy, color, alpha, s = 1) => {
    gfx.fillStyle(color, alpha)
    // 거대 몸통
    gfx.fillRect(cx - 18 * s, cy - 20 * s, 36 * s, 28 * s)
    // 뿔 두 개
    gfx.fillTriangle(
      cx - 14 * s, cy - 20 * s,
      cx - 6 * s,  cy - 20 * s,
      cx - 10 * s, cy - 38 * s
    )
    gfx.fillTriangle(
      cx + 6 * s,  cy - 20 * s,
      cx + 14 * s, cy - 20 * s,
      cx + 10 * s, cy - 38 * s
    )
    // 눈
    gfx.fillStyle(0xff0000, alpha)
    gfx.fillCircle(cx - 7 * s, cy - 8 * s, 5 * s)
    gfx.fillCircle(cx + 7 * s, cy - 8 * s, 5 * s)
    // 발
    gfx.fillStyle(color, alpha)
    gfx.fillRect(cx - 16 * s, cy + 8 * s, 12 * s, 10 * s)
    gfx.fillRect(cx + 4 * s,  cy + 8 * s, 12 * s, 10 * s)
  },
  gollem: (gfx, cx, cy, color, alpha, s = 1) => {
    gfx.fillStyle(color, alpha)
    // 사각형 머리
    gfx.fillRect(cx - 14 * s, cy - 40 * s, 28 * s, 24 * s)
    // 몸통 (크게)
    gfx.fillRect(cx - 18 * s, cy - 16 * s, 36 * s, 26 * s)
    // 팔 (두꺼움)
    gfx.fillRect(cx - 30 * s, cy - 14 * s, 12 * s, 20 * s)
    gfx.fillRect(cx + 18 * s, cy - 14 * s, 12 * s, 20 * s)
    // 다리
    gfx.fillRect(cx - 16 * s, cy + 10 * s, 12 * s, 14 * s)
    gfx.fillRect(cx + 4 * s,  cy + 10 * s, 12 * s, 14 * s)
    // 눈 (빛나는)
    gfx.fillStyle(0xffaa00, alpha)
    gfx.fillCircle(cx - 5 * s, cy - 30 * s, 4 * s)
    gfx.fillCircle(cx + 5 * s, cy - 30 * s, 4 * s)
  },
}

// enemy_name → silhouette 매핑
export function getEnemySilhouette(enemyName, isBoss) {
  if (isBoss) {
    const name = (enemyName ?? '').toLowerCase()
    if (name.includes('골렘') || name.includes('gollem')) return ENEMY_SILHOUETTES.gollem
    return ENEMY_SILHOUETTES.boss
  }
  return ENEMY_SILHOUETTES.default
}
