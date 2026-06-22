export const BOARD_WIDTH  = 10
export const BOARD_HEIGHT = 20
export const CELL_SIZE    = 30
export const PREVIEW_COUNT = 3

export const PIECES = {
  I: { shape: [[1,1,1,1]],         color: 0x00f5ff, name: 'I' },
  O: { shape: [[1,1],[1,1]],        color: 0xffe600, name: 'O' },
  T: { shape: [[0,1,0],[1,1,1]],   color: 0xaa00ff, name: 'T' },
  S: { shape: [[0,1,1],[1,1,0]],   color: 0x00ff6e, name: 'S' },
  Z: { shape: [[1,1,0],[0,1,1]],   color: 0xff2255, name: 'Z' },
  J: { shape: [[1,0,0],[1,1,1]],   color: 0x2255ff, name: 'J' },
  L: { shape: [[0,0,1],[1,1,1]],   color: 0xff8800, name: 'L' },
}
export const PIECE_KEYS = Object.keys(PIECES)

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

export class Board {
  constructor() {
    this.reset()
    this._lastTSpin = false
    this._lastClear = 0
    this.combo = -1
    this.b2b   = 0
    this.lastRotation = false
  }

  reset() {
    this.grid = Array.from({ length: BOARD_HEIGHT }, () =>
      Array(BOARD_WIDTH).fill(0))
    this._lastTSpin = false
    this._lastClear = 0
    this.combo = -1
    this.b2b   = 0
    this.lastRotation = false
  }

  isValid(piece, ox, oy) {
    for (let y = 0; y < piece.shape.length; y++)
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue
        const nx = ox + x, ny = oy + y
        if (nx < 0 || nx >= BOARD_WIDTH) return false
        if (ny >= BOARD_HEIGHT) return false
        if (ny >= 0 && this.grid[ny][nx]) return false
      }
    return true
  }

  place(piece, ox, oy) {
    for (let y = 0; y < piece.shape.length; y++)
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (!piece.shape[y][x]) continue
        if (oy + y >= 0) this.grid[oy + y][ox + x] = piece.color
      }
  }

  // SRS 회전 — from→to 킥, rotDir: 1(CW) | -1(CCW) | 2(180°)
  tryRotate(piece, ox, oy, rotDir = 1) {
    const rotIdx = piece._rotIdx ?? 0
    const step = rotDir === 2 ? 2 : rotDir
    const newRotIdx = (rotIdx + step + 4) % 4

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
        const spin = this.detectSpin(rotatedPiece, nx, ny)
        return { piece: rotatedPiece, x: nx, y: ny, isTSpin: spin === 'full' || spin === 'mini', spin }
      }
    }
    return null
  }

  _checkTSpin(piece, ox, oy) {
    if (piece.name !== 'T') return false
    // T 피스의 4 모서리 중 3개 이상이 막혀있으면 T-spin
    const corners = [[0,0],[2,0],[0,2],[2,2]]
    let blocked = 0
    for (const [dx, dy] of corners) {
      const nx = ox + dx, ny = oy + dy
      if (nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT ||
          (ny >= 0 && this.grid[ny][nx])) blocked++
    }
    return blocked >= 3
  }

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
    const immobile =
      !this.isValid(piece, ox - 1, oy) &&
      !this.isValid(piece, ox + 1, oy) &&
      !this.isValid(piece, ox, oy + 1)
    return immobile ? 'full' : 'none'
  }

  // T가 향한 두 front 코너 (box 좌표 dx,dy; +dy=아래)
  _tFrontCorners(rotIdx) {
    return {
      0: [[0,0],[0,2]],
      1: [[0,2],[2,2]],
      2: [[2,0],[2,2]],
      3: [[0,0],[2,0]],
    }[rotIdx % 4]
  }

  // 라인 클리어 — 콤보/B2B/스핀 점수 계산
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
      return { cleared, score: 0, label: '', spin, b2b: this.b2b, surge: 0, allClear: false }
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
  }

  addGarbage(lines) {
    if (lines <= 0) return false
    const safeLines = Math.min(lines, 6)  // 최대 6줄
    let overflow = false
    for (let i = 0; i < safeLines; i++) {
      // 맨 위 줄에 블록이 있으면 천장 침범 (top-out)
      if (this.grid[0].some(c => c)) overflow = true
      const gap = Math.floor(Math.random() * BOARD_WIDTH)
      const row = Array(BOARD_WIDTH).fill(0x444466)
      row[gap] = 0
      this.grid.shift()
      this.grid.push(row)
    }
    return overflow  // true면 호출부에서 게임오버 처리
  }

  mirrorBoard() { this.grid = this.grid.map(r => [...r].reverse()) }

  scrambleColors() {
    const colors = Object.values(PIECES).map(p => p.color)
    this.grid = this.grid.map(row =>
      row.map(c => c ? colors[Math.floor(Math.random() * colors.length)] : 0))
  }

  clone() {
    const b = new Board()
    b.grid  = this.grid.map(r => [...r])
    b.combo = this.combo
    b.b2b   = this.b2b
    return b
  }

  getStats() {
    const heights = Array.from({ length: BOARD_WIDTH }, (_, x) => {
      for (let y = 0; y < BOARD_HEIGHT; y++) if (this.grid[y][x]) return BOARD_HEIGHT - y
      return 0
    })
    const aggregateHeight = heights.reduce((a, b) => a + b, 0)
    const holes = this.grid.reduce((acc, row, y) =>
      acc + row.filter((c, x) => !c && heights[x] > BOARD_HEIGHT - y).length, 0)
    const bumpiness = heights.slice(1).reduce((acc, h, i) => acc + Math.abs(h - heights[i]), 0)
    const maxHeight = Math.max(...heights, 0)
    return { heights, aggregateHeight, holes, bumpiness, maxHeight }
  }

  // 퍼펙트 클리어 체크
  isPerfectClear() {
    return this.grid.every(row => row.every(c => c === 0))
  }
}
