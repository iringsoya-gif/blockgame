# 테트리스 기술 보강 (testris 이식) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** testris의 검증된 테트리스 기법(SRS 180°킥, T-spin mini/full+All-Spin, B2B 체인/Surge, El-Tetris 봇)을 BlockQuest의 JS+Phaser 구조에 vitest 검증과 함께 이식한다.

**Architecture:** BlockQuest의 기존 패러다임(행렬 shape + `rotateCW` + `_rotIdx`)을 유지하고 testris의 **공식·테이블만** 이식한다. 월킥 적용 관례 `ny = oy - dy`가 testris `[dc,dr]`(row-up)과 일치하므로 from→to 킥 테이블을 그대로 채택한다. 좌표계는 BlockQuest top=0를 유지한다.

**Tech Stack:** JS(ESM), Phaser 3, Vite 5, vitest(신규). 검증 = `npm run test`(vitest) + `npm run build`.

**작업 디렉터리:** `C:\Users\USER\Downloads\blockquest`, 프론트 명령은 `frontend/`에서. Spec: `docs/superpowers/specs/2026-06-22-tetris-tech-merge-design.md`. 참조 원본: `C:\Users\USER\Downloads\testris_extract\frontend\src\lib\tetris\`.

---

## File Structure

| 파일 | 역할 | 변경 |
|---|---|---|
| `frontend/package.json` | vitest devDep + `test` 스크립트 | 수정 |
| `frontend/vitest.config.js` | vitest 설정(jsdom 불필요, node 환경) | 생성 |
| `frontend/src/game/tetris/Board.js` | 월킥 테이블/회전/스핀판정/B2B/점수 | 수정 |
| `frontend/src/game/tetris/AI.js` | El-Tetris 평가 + 2-ply | 수정 |
| `frontend/src/game/scenes/BattleScene.js` | lastRotation·spin·surge 연동 | 수정 |
| `frontend/src/game/tetris/__tests__/rotation.test.js` | 회전/월킥/180° | 생성 |
| `frontend/src/game/tetris/__tests__/spin.test.js` | T-spin mini/full + All-Spin | 생성 |
| `frontend/src/game/tetris/__tests__/b2b.test.js` | B2B 체인/Surge | 생성 |
| `frontend/src/game/tetris/__tests__/ai.test.js` | El-Tetris 평가/best move | 생성 |

검증 공통:
- `cd frontend && npm run test` → vitest, 전부 PASS
- `cd frontend && npm run build` → `✓ built in`

---

## Task 1: vitest 하니스 + 모듈 1 (SRS 회전/180° 킥)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/game/tetris/__tests__/rotation.test.js`
- Modify: `frontend/src/game/tetris/Board.js`

- [ ] **Step 1: vitest 의존성 설치**

Run: `cd frontend && npm install -D vitest@^2.1.0`
Expected: 설치 성공, `package.json` devDependencies에 `vitest` 추가됨.

- [ ] **Step 2: `package.json`에 test 스크립트 추가**

`scripts`에 추가(기존 스크립트 유지):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: `frontend/vitest.config.js` 생성**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.js'],
  },
})
```

- [ ] **Step 4: 실패 테스트 작성 — `rotation.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { Board, PIECES } from '../Board'

// 헬퍼: 스폰 상태 피스 생성
function piece(name) {
  return { ...PIECES[name], name, key: name, _rotIdx: 0 }
}

describe('SRS 회전', () => {
  it('빈 보드에서 T를 CW 회전하면 _rotIdx가 1로 증가하고 유효하다', () => {
    const b = new Board()
    const r = b.tryRotate(piece('T'), 4, 0, 1)
    expect(r).not.toBeNull()
    expect(r.piece._rotIdx).toBe(1)
  })

  it('CW 4번 회전하면 원래 _rotIdx(0)로 돌아온다', () => {
    const b = new Board()
    let p = piece('T'), x = 4, y = 0
    for (let i = 0; i < 4; i++) {
      const r = b.tryRotate(p, x, y, 1)
      expect(r).not.toBeNull()
      p = r.piece; x = r.x; y = r.y
    }
    expect(p._rotIdx).toBe(0)
  })

  it('180° 회전(rotDir=2)은 _rotIdx를 +2 한다', () => {
    const b = new Board()
    const r = b.tryRotate(piece('T'), 4, 0, 2)
    expect(r).not.toBeNull()
    expect(r.piece._rotIdx).toBe(2)
  })

  it('왼쪽 벽에 붙은 세로 I를 회전하면 킥으로 살아난다(결과 not null)', () => {
    const b = new Board()
    // I를 CW로 세로 상태(_rotIdx=1)로 만든 뒤 왼벽으로
    const v = b.tryRotate(piece('I'), 3, 0, 1)
    expect(v).not.toBeNull()
    // 세로 I를 왼쪽 끝으로 밀어 벽 접촉 후 CCW 회전 → 킥 발생
    const r = b.tryRotate(v.piece, -1, v.y, -1)
    expect(r).not.toBeNull()
  })
})
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `cd frontend && npm run test`
Expected: `rotation.test.js`에서 180°(rotDir=2) 케이스 등 실패(현재 `tryRotate`는 rotDir 1/-1만 지원, from→to 테이블 없음).

- [ ] **Step 6: `Board.js` 월킥 테이블을 from→to 구조로 교체 + 180° 추가**

`Board.js`의 기존 `WALL_KICKS` 상수(라인 18~33)를 아래로 교체:
```js
// SRS Wall Kick — from→to 전이 테이블 (testris rotation.ts 이식)
// [dx, dy] 적용 관례: nx = ox + dx, ny = oy - dy  (dy>0 = 위로)
const KICKS_JLSTZ = {
  '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '0>2': [[0,0],[0,1],[1,1],[-1,1],[1,0],[-1,0]],
  '1>3': [[0,0],[1,0],[1,2],[1,-1],[0,2],[0,-1]],
  '2>0': [[0,0],[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]],
  '3>1': [[0,0],[-1,0],[-1,2],[-1,-1],[0,2],[0,-1]],
}
const KICKS_I = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '0>2': [[0,0],[0,1],[1,1],[-1,1],[1,0],[-1,0]],
  '1>3': [[0,0],[1,0],[1,2],[1,-1],[0,2],[0,-1]],
  '2>0': [[0,0],[0,-1],[-1,-1],[1,-1],[-1,0],[1,0]],
  '3>1': [[0,0],[-1,0],[-1,2],[-1,-1],[0,2],[0,-1]],
}
function getKicks(name, from, to) {
  if (name === 'O') return [[0,0]]
  const key = `${from}>${to}`
  return name === 'I' ? (KICKS_I[key] ?? [[0,0]]) : (KICKS_JLSTZ[key] ?? [[0,0]])
}
```

- [ ] **Step 7: `Board.js` `tryRotate`를 from→to + 180° 지원으로 재작성**

기존 `tryRotate(piece, ox, oy, rotDir = 1)` 메서드(라인 74~103)를 교체:
```js
// SRS 회전 — from→to 킥, rotDir: 1(CW) | -1(CCW) | 2(180°)
tryRotate(piece, ox, oy, rotDir = 1) {
  const rotIdx = piece._rotIdx ?? 0
  const step = rotDir === 2 ? 2 : rotDir
  const newRotIdx = (rotIdx + step + 4) % 4

  // 목표 shape: CW step수만큼 행렬 회전
  let newShape = piece.shape
  const turns = ((step % 4) + 4) % 4
  for (let t = 0; t < turns; t++) {
    newShape = newShape[0].map((_, i) => newShape.map(r => r[i]).reverse())
  }

  const kicks = getKicks(piece.name, rotIdx, newRotIdx)
  for (const [dx, dy] of kicks) {
    const nx = ox + dx, ny = oy - dy
    const rotatedPiece = { ...piece, shape: newShape, _rotIdx: newRotIdx }
    if (this.isValid(rotatedPiece, nx, ny)) {
      const isTSpin = piece.name === 'T' && this._checkTSpin(rotatedPiece, nx, ny)
      return { piece: rotatedPiece, x: nx, y: ny, isTSpin }
    }
  }
  return null
}
```
참고: `_checkTSpin`은 모듈 2에서 `detectSpin`으로 대체되므로 이 단계에선 기존 `_checkTSpin`을 그대로 호출(인터페이스 유지).

- [ ] **Step 8: 테스트 통과 확인**

Run: `cd frontend && npm run test`
Expected: `rotation.test.js` 전부 PASS.

- [ ] **Step 9: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: `✓ built in`.

- [ ] **Step 10: 커밋**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/src/game/tetris/__tests__/rotation.test.js frontend/src/game/tetris/Board.js
git commit -m "feat(tetris): SRS from→to 월킥 테이블 + 180° 회전 + vitest 하니스"
```
커밋 메시지 끝에 줄 추가: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Task 2: 모듈 2 — T-spin mini/full + All-Spin

**Files:**
- Modify: `frontend/src/game/tetris/Board.js`
- Modify: `frontend/src/game/scenes/BattleScene.js`
- Create: `frontend/src/game/tetris/__tests__/spin.test.js`

- [ ] **Step 1: 실패 테스트 작성 — `spin.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { Board, PIECES, BOARD_WIDTH, BOARD_HEIGHT } from '../Board'

// grid를 직접 세팅하는 헬퍼 (1 = 채움)
function fill(b, cells) {
  for (const [y, x] of cells) b.grid[y][x] = 0xffffff
}
function tpiece(rotIdx) {
  // T의 회전 상태별 shape를 rotateCW로 생성
  let shape = PIECES.T.shape
  for (let t = 0; t < rotIdx; t++) shape = shape[0].map((_, i) => shape.map(r => r[i]).reverse())
  return { ...PIECES.T, name: 'T', _rotIdx: rotIdx, shape }
}

describe('스핀 판정', () => {
  it('4코너 중 3개 미만이 막히면 none', () => {
    const b = new Board()
    expect(b.detectSpin(tpiece(0), 4, 0)).toBe('none')
  })

  it('T 4코너 중 3개 이상 막히면 mini 또는 full을 반환한다', () => {
    const b = new Board()
    const oy = BOARD_HEIGHT - 2, ox = 4
    // 네 코너를 모두 채움
    fill(b, [[oy, ox], [oy, ox+2], [oy+1, ox], [oy+1, ox+2]])
    const spin = b.detectSpin(tpiece(0), ox, oy)
    expect(['mini', 'full']).toContain(spin)
  })

  it('비-T 피스가 좌/우/아래로 못 움직이면 All-Spin(full)', () => {
    const b = new Board()
    // 바닥에 붙고 좌우가 막힌 S를 구성
    const s = { ...PIECES.S, name: 'S', _rotIdx: 0 }
    const oy = BOARD_HEIGHT - s.shape.length
    // S 양옆과 아래를 막아 immobile하게
    for (let y = 0; y < BOARD_HEIGHT; y++) { b.grid[y][0] = 0xffffff; b.grid[y][BOARD_WIDTH-1] = 0xffffff }
    const spin = b.detectSpin(s, 1, oy)
    expect(['none', 'full']).toContain(spin) // 보드 구성에 따라; immobile이면 full
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd frontend && npm run test`
Expected: `detectSpin is not a function` 류로 `spin.test.js` 실패.

- [ ] **Step 3: `Board.js`에 `lastRotation` 상태 + `detectSpin` 추가**

`constructor`와 `reset`에 `this.lastRotation = false` 추가. `_checkTSpin`(라인 105~116) 바로 아래에 추가:
```js
// 스핀 판정: 'none' | 'mini' | 'full'
detectSpin(piece, ox, oy) {
  if (piece.name === 'T') {
    const corners = [[0,0],[2,0],[0,2],[2,2]]
    const blockedAt = ([dx, dy]) => {
      const nx = ox + dx, ny = oy + dy
      return nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT || (ny >= 0 && !!this.grid[ny][nx])
    }
    const blocked = corners.filter(blockedAt).length
    if (blocked < 3) return 'none'
    const front = this._tFrontCorners(piece._rotIdx ?? 0)
    const frontBlocked = front.filter(blockedAt).length
    return frontBlocked >= 2 ? 'full' : 'mini'
  }
  // 비-T: immobile = All-Spin
  const immobile =
    !this.isValid(piece, ox - 1, oy) &&
    !this.isValid(piece, ox + 1, oy) &&
    !this.isValid(piece, ox, oy + 1)
  return immobile ? 'full' : 'none'
}

// T가 향한 두 front 코너 (box 좌표 dx,dy; 위에서 +dy=아래)
_tFrontCorners(rotIdx) {
  // 0: 위로 돌출 → 위쪽 두 코너 [0,0],[0,2]
  // 1: 오른쪽 → 오른쪽 두 코너 [0,2],[2,2]
  // 2: 아래 → 아래쪽 두 코너 [2,0],[2,2]
  // 3: 왼쪽 → 왼쪽 두 코너 [0,0],[2,0]
  return {
    0: [[0,0],[0,2]],
    1: [[0,2],[2,2]],
    2: [[2,0],[2,2]],
    3: [[0,0],[2,0]],
  }[rotIdx % 4]
}
```

- [ ] **Step 4: `tryRotate`가 `detectSpin`을 쓰도록 갱신**

Task 1에서 작성한 `tryRotate` 내부의 `const isTSpin = piece.name === 'T' && this._checkTSpin(...)` 줄을 교체:
```js
const spin = this.detectSpin(rotatedPiece, nx, ny)
return { piece: rotatedPiece, x: nx, y: ny, isTSpin: spin === 'full' || spin === 'mini', spin }
```

- [ ] **Step 5: `clearLines`가 spin 등급을 받아 점수 분기**

`clearLines(isTSpin = false)` 시그니처를 `clearLines(spin = 'none')`로 바꾸고 내부 점수 로직 교체. 기존 라인 119~159의 BASE/label 계산부를 교체:
```js
clearLines(spin = 'none') {
  let cleared = 0
  this.grid = this.grid.filter(row => {
    if (row.every(c => c !== 0)) { cleared++; return false }
    return true
  })
  while (this.grid.length < BOARD_HEIGHT) this.grid.unshift(Array(BOARD_WIDTH).fill(0))

  if (cleared === 0) {
    this.combo = -1
    this._lastTSpin = false
    return { cleared, score: 0, label: '', spin, b2b: this.b2b, surge: 0 }
  }

  this.combo++
  const comboBonus = this.combo > 0 ? this.combo * 50 : 0
  const isSpin = spin === 'full' || spin === 'mini'
  const isDifficult = cleared === 4 || isSpin

  const BASE = spin === 'full'
    ? [0, 800, 1200, 1600][cleared] ?? 1600
    : spin === 'mini'
      ? [0, 200, 400][cleared] ?? 400
      : [0, 100, 300, 500, 800][cleared] ?? 800

  // B2B/Surge는 모듈 3에서 정교화 — 이 단계는 기존 불리언 동작 유지
  const prevB2b = this.b2b
  const b2bBonus = (isDifficult && prevB2b) ? 1.5 : 1
  this.b2b = isDifficult
  const score = Math.floor(BASE * b2bBonus + comboBonus)

  let label = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][cleared] ?? ''
  if (spin === 'full') label = `T-SPIN ${label}`
  else if (spin === 'mini') label = `T-SPIN MINI ${label}`
  if (isDifficult && prevB2b) label = `B2B ${label}`
  if (this.combo >= 2) label += ` COMBO x${this.combo}`

  this._lastClear = cleared
  this._lastTSpin = isSpin
  return { cleared, score, label, combo: this.combo, b2b: this.b2b, spin, surge: 0 }
}
```

- [ ] **Step 6: `BattleScene.js` 락 경로에서 lastRotation/spin 연동**

`BattleScene.js`에서:
1. 플레이어 이동/회전/낙하 처리부에서 `playerBoard.lastRotation` 갱신: 회전 성공 시 `this.playerBoard.lastRotation = true`, 좌우 이동/소프트드롭/하드드롭 이동 시 `this.playerBoard.lastRotation = false`.
2. 피스 고정(락) 시 `const spin = this.playerBoard.lastRotation ? this.playerBoard.detectSpin(this.currentPiece, this.playerX, this.playerY) : 'none'` 계산 후 `this.playerBoard.clearLines(spin)` 호출(기존 `clearLines(this._lastTSpin)` 호출 대체).

구현자는 `BattleScene.js`에서 `clearLines(` 및 회전/이동 핸들러를 grep으로 찾아 위 규칙대로 수정한다. 회전 핸들러는 `tryRotate` 호출 지점, 이동은 `playerX` 증감 지점.

- [ ] **Step 7: 테스트 + 빌드**

Run: `cd frontend && npm run test && npm run build`
Expected: `spin.test.js` 포함 전부 PASS, 빌드 그린.

- [ ] **Step 8: 커밋**

```bash
git add frontend/src/game/tetris/Board.js frontend/src/game/scenes/BattleScene.js frontend/src/game/tetris/__tests__/spin.test.js
git commit -m "feat(tetris): T-spin mini/full + All-Spin 판정 + 점수 분기"
```
끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 추가.

---

## Task 3: 모듈 3 — B2B 체인 + Surge

**Files:**
- Modify: `frontend/src/game/tetris/Board.js`
- Modify: `frontend/src/game/scenes/BattleScene.js`
- Create: `frontend/src/game/tetris/__tests__/b2b.test.js`

- [ ] **Step 1: 실패 테스트 작성 — `b2b.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { Board, BOARD_WIDTH, BOARD_HEIGHT } from '../Board'

// 바닥 n줄을 한 칸만 비워 가득 채우기 직전 상태로 만들고, 그 칸을 채워 라인 클리어를 유발
function setupClearableRows(b, n, gapCol = 0) {
  for (let i = 0; i < n; i++) {
    const y = BOARD_HEIGHT - 1 - i
    for (let x = 0; x < BOARD_WIDTH; x++) b.grid[y][x] = (x === gapCol) ? 0 : 0xffffff
  }
}

// 상단에 안 지워지는 잔여 블록을 둬 의도치 않은 allClear(퍼펙트클리어)를 방지
function residual(b) { b.grid[0][5] = 0xffffff }

describe('B2B 체인/Surge', () => {
  it('테트리스 연속 시 b2b 체인이 증가한다', () => {
    const b = new Board()
    residual(b)
    // 첫 테트리스: 4줄을 gap 채워 클리어
    setupClearableRows(b, 4, 0)
    for (let i = 0; i < 4; i++) b.grid[BOARD_HEIGHT-1-i][0] = 0xffffff
    const r1 = b.clearLines('none')
    expect(r1.cleared).toBe(4)
    expect(r1.allClear).toBe(false)
    expect(r1.b2b).toBe(1)

    // 두 번째 테트리스 → 체인 +1
    setupClearableRows(b, 4, 0)
    for (let i = 0; i < 4; i++) b.grid[BOARD_HEIGHT-1-i][0] = 0xffffff
    const r2 = b.clearLines('none')
    expect(r2.b2b).toBe(2)
  })

  it('일반 클리어로 체인이 0으로 끊긴다', () => {
    const b = new Board()
    residual(b)
    setupClearableRows(b, 4, 0)
    for (let i = 0; i < 4; i++) b.grid[BOARD_HEIGHT-1-i][0] = 0xffffff
    b.clearLines('none') // 테트리스 → 체인 시작
    // 싱글 클리어
    setupClearableRows(b, 1, 0)
    b.grid[BOARD_HEIGHT-1][0] = 0xffffff
    const r = b.clearLines('none')
    expect(r.b2b).toBe(0)
  })

  it('체인 ≥4가 일반 클리어로 끊기면 surge가 발동한다', () => {
    const b = new Board()
    residual(b)
    b.b2b = 4 // 체인 4 상태 가정
    setupClearableRows(b, 1, 0)
    b.grid[BOARD_HEIGHT-1][0] = 0xffffff
    const r = b.clearLines('none')
    expect(r.allClear).toBe(false)
    expect(r.surge).toBe(4)
    expect(r.b2b).toBe(0)
  })

  it('퍼펙트 클리어는 체인을 +2 한다', () => {
    const b = new Board()
    b.b2b = 0
    // 바닥 한 줄만 채우고 그 줄을 비워 퍼펙트 클리어
    for (let x = 0; x < BOARD_WIDTH; x++) b.grid[BOARD_HEIGHT-1][x] = (x === 0) ? 0 : 0xffffff
    b.grid[BOARD_HEIGHT-1][0] = 0xffffff
    const r = b.clearLines('none')
    expect(r.allClear).toBe(true)
    expect(r.b2b).toBe(2)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd frontend && npm run test`
Expected: `b2b.test.js` 실패(현재 `b2b`는 불리언, surge/allClear 미반환).

- [ ] **Step 3: `Board.js` constructor/reset의 `b2b`를 정수로 초기화**

`this.b2b = false` 두 곳(constructor, reset)을 `this.b2b = 0`으로 변경.

- [ ] **Step 4: `clearLines`의 B2B 로직을 체인+Surge로 교체**

Task 2에서 만든 `clearLines`의 B2B 블록(`const prevB2b = this.b2b` ~ `this.b2b = isDifficult` 및 score 계산)을 교체:
```js
  const allClear = this.grid.every(row => row.every(c => c === 0))
  const prevB2b = this.b2b
  const b2bBroken = !allClear && !isDifficult && cleared > 0 && prevB2b > 0
  const surge = (b2bBroken && prevB2b >= 4) ? prevB2b : 0

  if (allClear) this.b2b = prevB2b + 2
  else if (isDifficult) this.b2b = prevB2b + 1
  else if (cleared > 0) this.b2b = 0

  const b2bBonus = (isDifficult && prevB2b > 0) ? 1.5 : 1
  const allClearBonus = allClear ? 2000 : 0
  const score = Math.floor(BASE * b2bBonus + comboBonus + allClearBonus + surge * 100)
```
그리고 label/return 갱신:
```js
  let label = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][cleared] ?? ''
  if (spin === 'full') label = `T-SPIN ${label}`
  else if (spin === 'mini') label = `T-SPIN MINI ${label}`
  if (isDifficult && prevB2b > 0) label = `B2B ${label}`
  if (allClear) label = `PERFECT CLEAR`
  if (surge > 0) label += ` ⚡SURGE`
  if (this.combo >= 2) label += ` COMBO x${this.combo}`

  this._lastClear = cleared
  this._lastTSpin = isSpin
  return { cleared, score, label, combo: this.combo, b2b: this.b2b, spin, surge, allClear }
```
또한 `cleared === 0` early-return의 객체에 `allClear: false` 추가.

- [ ] **Step 5: `BattleScene.js`에서 surge를 추가 가비지로 연동**

플레이어 락 처리에서 `clearLines` 결과의 `surge`가 0보다 크면 적에게 추가 공격: 기존 가비지 전송 로직 근처에서 `if (res.surge > 0) this.events.emit('player_garbage', Math.min(4, Math.floor(res.surge / 2)))` 형태로 추가(이벤트명은 BattleScene의 실제 플레이어→적 가비지 이벤트에 맞춰 grep 후 사용). `_b2bStreak`/`max_b2b_streak` 통계는 `res.b2b`로 갱신.

- [ ] **Step 6: 테스트 + 빌드**

Run: `cd frontend && npm run test && npm run build`
Expected: 전부 PASS, 빌드 그린.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/game/tetris/Board.js frontend/src/game/scenes/BattleScene.js frontend/src/game/tetris/__tests__/b2b.test.js
git commit -m "feat(tetris): B2B 체인 카운트 + Surge + 퍼펙트클리어"
```
끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 추가.

---

## Task 4: 모듈 4 — El-Tetris(Dellacherie) 봇 + 2-ply

**Files:**
- Modify: `frontend/src/game/tetris/AI.js`
- Create: `frontend/src/game/tetris/__tests__/ai.test.js`

- [ ] **Step 1: 실패 테스트 작성 — `ai.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { Board, PIECES, BOARD_WIDTH, BOARD_HEIGHT } from '../Board'
import { TetrisAI, elTetrisScore } from '../AI'

describe('El-Tetris 평가', () => {
  it('빈 보드의 holes는 0이다', () => {
    const b = new Board()
    const f = elTetrisScore(b)
    expect(f.holes).toBe(0)
  })

  it('구멍(위에 블록, 아래 빈칸)을 holes로 센다', () => {
    const b = new Board()
    b.grid[BOARD_HEIGHT-1][0] = 0          // 아래 빈칸
    b.grid[BOARD_HEIGHT-2][0] = 0xffffff   // 위 블록 → 구멍 1
    const f = elTetrisScore(b)
    expect(f.holes).toBeGreaterThanOrEqual(1)
  })

  it('명백한 라인 클리어가 가능하면 봇이 그 배치를 고른다', () => {
    const b = new Board()
    // 바닥줄을 col 0만 비우고 채움 → I나 L 등으로 채우면 클리어
    for (let x = 1; x < BOARD_WIDTH; x++) b.grid[BOARD_HEIGHT-1][x] = 0xffffff
    const ai = new TetrisAI(3)
    const piece = { ...PIECES.I, name: 'I', _rotIdx: 0 }
    const best = ai.findBest(b, piece)
    expect(best.x).toBeGreaterThanOrEqual(-2)
    // 라인이 채워지는 배치가 -Infinity가 아니어야 함
    expect(best.score).toBeGreaterThan(-Infinity)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd frontend && npm run test`
Expected: `elTetrisScore is not exported` 류로 `ai.test.js` 실패.

- [ ] **Step 3: `AI.js`에 El-Tetris 평가함수 추가(export)**

`AI.js` 상단(import 아래)에 추가. BlockQuest grid는 top=0이라 row 그대로 순회하되 landingHeight는 바닥 기준 높이로 환산:
```js
// El-Tetris (Dellacherie) 피처. board = Board 인스턴스. 반환: 피처 + 가중합 helper용 객체
export function elTetrisFeatures(grid) {
  const H = grid.length, W = grid[0].length
  // row transitions (벽=채움)
  let rowTrans = 0
  for (let r = 0; r < H; r++) {
    let prev = 1
    for (let c = 0; c < W; c++) { const cur = grid[r][c] ? 1 : 0; if (cur !== prev) rowTrans++; prev = cur }
    if (prev === 0) rowTrans++
  }
  // column transitions (바닥=채움). top=0이므로 바닥은 r=H-1
  let colTrans = 0
  for (let c = 0; c < W; c++) {
    let prev = 1
    for (let r = H - 1; r >= 0; r--) { const cur = grid[r][c] ? 1 : 0; if (cur !== prev) colTrans++; prev = cur }
  }
  // holes: 위에 블록이 있는 빈칸
  let holes = 0
  for (let c = 0; c < W; c++) {
    let filledAbove = false
    for (let r = 0; r < H; r++) { if (grid[r][c]) filledAbove = true; else if (filledAbove) holes++ }
  }
  // wells: 양옆(벽 포함)이 막힌 연속 빈칸, 누적 깊이
  let wells = 0
  for (let c = 0; c < W; c++) {
    let depth = 0
    for (let r = 0; r < H; r++) {
      const left = c === 0 || grid[r][c-1] !== 0
      const right = c === W-1 || grid[r][c+1] !== 0
      if (!grid[r][c] && left && right) wells += ++depth
      else depth = 0
    }
  }
  return { rowTrans, colTrans, holes, wells }
}

// 테스트 편의: Board를 받아 holes 등 피처 반환
export function elTetrisScore(board) {
  return elTetrisFeatures(board.grid)
}

const EL = { LH: -4.500158825082766, EP: 3.4181268101392694, RT: -3.2178882868487753, CT: -9.348695305445199, H: -7.899265427351652, W: -3.3855972247263626 }
```

- [ ] **Step 4: `AI.js` `_evaluate`를 El-Tetris로 교체 + landingHeight/erodedPieces 산출**

`findBest`가 placement마다 landingHeight(바닥 기준 1-based)와 erodedPieces를 계산하도록 변경. 기존 `_evaluate`와 `findBest`(라인 64~106)를 교체:
```js
  // landingRowTop: 배치된 피스 최하단(top=0 기준 가장 큰 y). cleared: 그 배치로 지워진 줄 수. erased: 지워진 줄에 포함된 이 피스 셀 수
  _evaluatePlacement(grid, landingRowTopY, cleared, erased) {
    const H = grid.length
    const landingHeight = H - landingRowTopY      // 바닥 기준 높이(1-based 근사)
    const erodedPieces = cleared * erased
    const f = elTetrisFeatures(grid)
    return (
      EL.LH * landingHeight + EL.EP * erodedPieces +
      EL.RT * f.rowTrans + EL.CT * f.colTrans + EL.H * f.holes + EL.W * f.wells
    )
  }

  // 한 피스의 모든 배치 중 최고 점수와 위치 반환. next가 있으면 2-ply.
  _search(board, piece, next) {
    let best = { score: -Infinity, x: Math.floor(BOARD_WIDTH/2) - 1, rotations: 0 }
    let found = false
    let current = { ...piece, _rotIdx: piece._rotIdx ?? 0 }
    for (let rot = 0; rot < 4; rot++) {
      const center = (col) => {
        // center-bias: 벽 배치 억제
        return -3.5 * Math.abs(col - (BOARD_WIDTH - 1) / 2) / (BOARD_WIDTH / 2)
      }
      for (let x = -2; x < BOARD_WIDTH + 2; x++) {
        let y = 0
        while (board.isValid(current, x, y + 1)) y++
        if (!board.isValid(current, x, y)) continue
        found = true
        const tb = board.clone()
        tb.place(current, x, y)
        // landing top y = 배치 셀 중 최대 y
        let landY = 0, pieceCells = []
        for (let py = 0; py < current.shape.length; py++)
          for (let px = 0; px < current.shape[py].length; px++)
            if (current.shape[py][px]) { const gy = y + py; if (gy > landY) landY = gy; pieceCells.push([gy, x + px]) }
        // 클리어 전 grid에서 가득 찬 줄 판정 → erased(이 피스 셀 중 지워질 셀 수)
        const fullRows = new Set()
        for (let r = 0; r < BOARD_HEIGHT; r++) if (tb.grid[r].every(c => c !== 0)) fullRows.add(r)
        const erased = pieceCells.filter(([gy]) => fullRows.has(gy)).length
        const cleared = fullRows.size
        // 평가용으로 클리어 적용한 grid
        const tb2 = board.clone(); tb2.place(current, x, y); tb2.clearLines('none')
        let s = this._evaluatePlacement(tb2.grid, landY, cleared, erased) + center(x)
        if (next) s += this._bestScore(tb2, next)
        if (s > best.score) best = { score: s, x, rotations: rot }
      }
      current = { ...current, shape: rotateCW(current.shape), _rotIdx: (rot + 1) % 4 }
    }
    if (!found) return { score: -Infinity, x: Math.floor(BOARD_WIDTH/2) - 1, rotations: 0 }
    return best
  }

  _bestScore(board, piece) {
    let best = -Infinity
    let current = { ...piece, _rotIdx: 0 }
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < BOARD_WIDTH + 2; x++) {
        let y = 0
        while (board.isValid(current, x, y + 1)) y++
        if (!board.isValid(current, x, y)) continue
        let landY = 0, cells = []
        for (let py = 0; py < current.shape.length; py++)
          for (let px = 0; px < current.shape[py].length; px++)
            if (current.shape[py][px]) { const gy = y + py; if (gy > landY) landY = gy; cells.push([gy, x + px]) }
        const tb = board.clone(); tb.place(current, x, y)
        const fullRows = new Set()
        for (let r = 0; r < BOARD_HEIGHT; r++) if (tb.grid[r].every(c => c !== 0)) fullRows.add(r)
        const erased = cells.filter(([gy]) => fullRows.has(gy)).length
        const cleared = fullRows.size
        const tb2 = board.clone(); tb2.place(current, x, y); tb2.clearLines('none')
        const s = this._evaluatePlacement(tb2.grid, landY, cleared, erased)
        if (s > best) best = s
      }
      current = { ...current, shape: rotateCW(current.shape), _rotIdx: (rot + 1) % 4 }
    }
    return best === -Infinity ? 0 : best
  }

  findBest(board, piece, next = null) {
    return this._search(board, piece, next)
  }
```

- [ ] **Step 5: `step()`가 2-ply를 쓰도록 next 피스 전달**

`step(board, scene)`에서 `this._plan = this.findBest(board, piece)`를 `this._plan = this.findBest(board, piece, scene.enemyBag?.peek?.(1)?.[0] ?? null)`로 변경. 나머지 실행부(rotationsLeft/이동/락)는 유지.

- [ ] **Step 6: 테스트 + 빌드**

Run: `cd frontend && npm run test && npm run build`
Expected: `ai.test.js` 포함 전부 PASS, 빌드 그린.

- [ ] **Step 7: 커밋**

```bash
git add frontend/src/game/tetris/AI.js frontend/src/game/tetris/__tests__/ai.test.js
git commit -m "feat(tetris): El-Tetris(Dellacherie) 봇 평가 + 2-ply lookahead"
```
끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 추가.

---

## Task 5: 통합 검증 + 회귀

**Files:** 없음 (검증 전용; 필요 시 BattleScene 미세 수정)

- [ ] **Step 1: 전체 테스트 + 빌드**

Run: `cd frontend && npm run test && npm run build`
Expected: 4개 테스트 파일 전부 PASS, 빌드 `✓ built in`.

- [ ] **Step 2: 회전/락 통합 깨짐 점검(정적)**

`BattleScene.js`에서 다음을 grep으로 확인:
- `clearLines(` 호출이 전부 새 시그니처(`spin` 문자열 또는 결과 사용)로 갱신됐는지 — 옛 `clearLines(this._lastTSpin)`/`clearLines(true)` 잔재 없음.
- `tryRotate(` 호출이 반환 객체의 `.piece/.x/.y`를 쓰는지(인터페이스 불변 확인).
- `lastRotation` 갱신이 회전/이동/낙하 핸들러에 들어갔는지.
잔재 발견 시 수정 후 `npm run test && npm run build` 재실행.

- [ ] **Step 3: dev 서버 수동 점검 안내 출력**

구현자는 컨트롤러에게 다음을 보고: dev 서버(`npm run dev`)로 실제 배틀에서 ① 회전/벽킥 자연스러움 ② T-spin/B2B 라벨 표시 ③ 적 봇이 더 똑똑하게 쌓는지 육안 확인 필요. (자동화 불가 영역)

- [ ] **Step 4: 최종 커밋(추가 수정이 있었다면)**

```bash
git add -A
git commit -m "fix(tetris): 통합 회귀 점검 잔여 정리"
```
끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 추가.

---

## Self-Review 노트 (작성자 확인)

- **Spec 커버리지:** 모듈1(Task1) · 모듈2(Task2) · 모듈3(Task3) · 모듈4(Task4) · vitest(Task1) · 통합/검증(Task5) — spec의 4모듈 + 테스팅 + 분해순서 전부 매핑.
- **좌표계:** 월킥 `ny=oy-dy` 관례 유지로 testris 테이블 직접 채택, El-Tetris는 top=0 grid 순회로 landingHeight만 바닥환산 — 일관.
- **인터페이스 일관성:** `tryRotate`→`{piece,x,y,isTSpin,spin}`, `clearLines(spin)`→`{cleared,score,label,combo,b2b,spin,surge,allClear}`, `detectSpin`→`'none'|'mini'|'full'`, `findBest(board,piece,next)`, `elTetrisFeatures/elTetrisScore` export — 태스크 간 동일 사용.
- **범위 밖 준수:** 실 ColdClear WASM·testris 스킬시스템·React/TS·멀티플레이 미포함. BlockQuest 기존 락딜레이/홀드/7-bag/가비지큐 유지.
- **검증:** 각 태스크 TDD(실패→구현→통과) + `npm run build`. 봇 강도/시각 자연스러움은 Task5에서 육안 확인 항목으로 명시(자동화 불가).
