import { PIECE_KEYS, PIECES, BOARD_WIDTH, BOARD_HEIGHT } from './Board'

// El-Tetris (Dellacherie) 피처. grid = 2D color array (0=빈칸). top=0.
export function elTetrisFeatures(grid) {
  const H = grid.length, W = grid[0].length
  let rowTrans = 0
  for (let r = 0; r < H; r++) {
    let prev = 1
    for (let c = 0; c < W; c++) { const cur = grid[r][c] ? 1 : 0; if (cur !== prev) rowTrans++; prev = cur }
    if (prev === 0) rowTrans++
  }
  let colTrans = 0
  for (let c = 0; c < W; c++) {
    let prev = 1
    for (let r = H - 1; r >= 0; r--) { const cur = grid[r][c] ? 1 : 0; if (cur !== prev) colTrans++; prev = cur }
  }
  let holes = 0
  for (let c = 0; c < W; c++) {
    let filledAbove = false
    for (let r = 0; r < H; r++) { if (grid[r][c]) filledAbove = true; else if (filledAbove) holes++ }
  }
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

// 테스트 편의: Board를 받아 피처 반환
export function elTetrisScore(board) {
  return elTetrisFeatures(board.grid)
}

const EL = { LH: -4.500158825082766, EP: 3.4181268101392694, RT: -3.2178882868487753, CT: -9.348695305445199, H: -7.899265427351652, W: -3.3855972247263626 }

const WEIGHTS = {
  1: { height: -0.3, holes: -0.5,  bumpiness: -0.1, lines: 0.5,  wells: -0.1 },
  2: { height: -0.5, holes: -1.0,  bumpiness: -0.3, lines: 0.8,  wells: -0.2 },
  3: { height: -0.8, holes: -2.0,  bumpiness: -0.5, lines: 1.2,  wells: -0.3 },
  4: { height: -1.0, holes: -2.5,  bumpiness: -0.7, lines: 1.5,  wells: -0.4 },
  5: { height: -1.2, holes: -3.0,  bumpiness: -1.0, lines: 2.0,  wells: -0.5 },
}

const INTERVALS = { 1: 850, 2: 600, 3: 400, 4: 260, 5: 160 }

// Fisher-Yates 셔플 (균등 분포 보장)
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 정식 7-bag: 7개 블록이 모두 나온 뒤 다음 백 시작 → 한쪽 블록 가뭄 방지
export class PieceBag {
  constructor() { this._bag = [] }

  next() {
    if (this._bag.length === 0) this._bag = shuffle(PIECE_KEYS)
    const key = this._bag.shift()
    return { ...PIECES[key], key, name: key, _rotIdx: 0 }
  }

  peek(n = 3) {
    // 부족하면 미리 채워서 정확히 미래 n개 예측
    while (this._bag.length < n) {
      this._bag = this._bag.concat(shuffle(PIECE_KEYS))
    }
    return this._bag.slice(0, n).map(key => ({ ...PIECES[key], key, name: key, _rotIdx: 0 }))
  }
}

export class TetrisAI {
  constructor(difficulty = 2) {
    this.setDifficulty(difficulty)
    this._planned = false
    this._plan = null
    this._rotationsLeft = 0
  }

  setDifficulty(d) {
    const c = Math.min(5, Math.max(1, d))
    this.difficulty = c
    this.w        = WEIGHTS[c]
    this.interval = INTERVALS[c]
  }

  escalate(phase) {
    this.setDifficulty(Math.min(5, this.difficulty + 1))
    this.interval = Math.max(120, Math.floor(this.interval * 0.75))
  }

  getInterval() { return this.interval }

  // landingRowTopY: 배치된 피스의 최하단 y (top=0 기준 최대 y). cleared: 지워진 줄 수. erased: 지워진 줄에 든 이 피스 셀 수.
  _evaluatePlacement(grid, landingRowTopY, cleared, erased) {
    const H = grid.length
    const landingHeight = H - landingRowTopY
    const erodedPieces = cleared * erased
    const f = elTetrisFeatures(grid)
    return (
      EL.LH * landingHeight + EL.EP * erodedPieces +
      EL.RT * f.rowTrans + EL.CT * f.colTrans + EL.H * f.holes + EL.W * f.wells
    )
  }

  _placementData(board, piece, x, y) {
    let landY = 0
    const cells = []
    for (let py = 0; py < piece.shape.length; py++)
      for (let px = 0; px < piece.shape[py].length; px++)
        if (piece.shape[py][px]) { const gy = y + py; if (gy > landY) landY = gy; cells.push([gy, x + px]) }
    const tb = board.clone(); tb.place(piece, x, y)
    const fullRows = new Set()
    for (let r = 0; r < BOARD_HEIGHT; r++) if (tb.grid[r].every(c => c !== 0)) fullRows.add(r)
    const erased = cells.filter(([gy]) => fullRows.has(gy)).length
    const cleared = fullRows.size
    const tb2 = board.clone(); tb2.place(piece, x, y); tb2.clearLines('none')
    return { landY, cleared, erased, gridAfter: tb2.grid, boardAfter: tb2 }
  }

  _centerBias(x) {
    return -3.5 * Math.abs(x - (BOARD_WIDTH - 1) / 2) / (BOARD_WIDTH / 2)
  }

  _bestScore(board, piece) {
    let best = -Infinity
    let current = { ...piece, _rotIdx: 0 }
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < BOARD_WIDTH + 2; x++) {
        let y = 0
        while (board.isValid(current, x, y + 1)) y++
        if (!board.isValid(current, x, y)) continue
        const d = this._placementData(board, current, x, y)
        const s = this._evaluatePlacement(d.gridAfter, d.landY, d.cleared, d.erased) + this._centerBias(x)
        if (s > best) best = s
      }
      current = { ...current, shape: rotateCW(current.shape), _rotIdx: (rot + 1) % 4 }
    }
    return best === -Infinity ? 0 : best
  }

  findBest(board, piece, next = null) {
    let best = { score: -Infinity, x: Math.floor(BOARD_WIDTH / 2) - 1, rotations: 0 }
    let found = false
    let current = { ...piece, _rotIdx: piece._rotIdx ?? 0 }
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < BOARD_WIDTH + 2; x++) {
        let y = 0
        while (board.isValid(current, x, y + 1)) y++
        if (!board.isValid(current, x, y)) continue
        found = true
        const d = this._placementData(board, current, x, y)
        let s = this._evaluatePlacement(d.gridAfter, d.landY, d.cleared, d.erased) + this._centerBias(x)
        if (next) s += this._bestScore(d.boardAfter, next)
        if (s > best.score) best = { score: s, x, rotations: rot }
      }
      current = { ...current, shape: rotateCW(current.shape), _rotIdx: (rot + 1) % 4 }
    }
    if (!found) return { score: -Infinity, x: Math.floor(BOARD_WIDTH / 2) - 1, rotations: 0 }
    return best
  }

  step(board, scene) {
    const piece = scene.enemyPiece
    if (!piece || scene.gameOver) return

    if (!this._planned) {
      this._plan = this.findBest(board, piece, scene.enemyBag?.peek?.(1)?.[0] ?? null)
      this._rotationsLeft = this._plan.rotations
      this._planned = true
    }

    if (this._rotationsLeft > 0) {
      const rotated = { ...piece, shape: rotateCW(piece.shape) }
      if (board.isValid(rotated, scene.enemyX, scene.enemyY))
        scene.enemyPiece = rotated
      this._rotationsLeft--
      return
    }

    if (scene.enemyX < this._plan.x) {
      if (board.isValid(piece, scene.enemyX + 1, scene.enemyY)) scene.enemyX++
      return
    }
    if (scene.enemyX > this._plan.x) {
      if (board.isValid(piece, scene.enemyX - 1, scene.enemyY)) scene.enemyX--
      return
    }

    if (board.isValid(piece, scene.enemyX, scene.enemyY + 1)) {
      scene.enemyY++
    } else {
      board.place(piece, scene.enemyX, scene.enemyY)
      const { cleared } = board.clearLines()
      if (cleared >= 2) scene.events.emit('enemy_garbage', cleared - 1)
      scene.events.emit('enemy_cleared', cleared)
      scene.spawnEnemyPiece()
      this._planned = false
    }
  }

  shouldUseSkill(skillId, gauge, board) {
    const { maxHeight, holes, bumpiness } = board.getStats()
    // 난이도별 사용 적극성 조정
    const aggressiveness = this.difficulty / 5
    switch (skillId) {
      case 'add_garbage':
        return gauge >= 30 && (maxHeight < 12 || aggressiveness > 0.6)
      case 'slow_player':
        return gauge >= 40 && maxHeight < 14  // 자기 보드 여유 있을 때
      case 'scramble_board':
        return gauge >= 50 && maxHeight < 10
      case 'block_skills':
        return gauge >= 55 && maxHeight < 12
      case 'mirror_board':
        return gauge >= 45 && (holes > 3 || bumpiness > 15)
      default:
        return gauge >= 30 && aggressiveness > 0.5
    }
  }
}

export function rotateCW(shape) {
  return shape[0].map((_, i) => shape.map(r => r[i]).reverse())
}

export function rotateCCW(shape) {
  return shape[0].map((_, i) => shape.map(r => r[shape[0].length - 1 - i]))
}
