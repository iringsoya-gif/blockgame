import { PIECE_KEYS, PIECES, BOARD_WIDTH } from './Board'

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

  _evaluate(board, linesCleared) {
    const { aggregateHeight, holes, bumpiness, heights } = board.getStats()
    // 웰(한쪽만 깊은 골) 페널티
    const wells = heights.reduce((acc, h, i) => {
      const leftH  = i > 0 ? heights[i-1] : BOARD_HEIGHT
      const rightH = i < heights.length - 1 ? heights[i+1] : BOARD_HEIGHT
      return acc + Math.max(0, Math.min(leftH, rightH) - h)
    }, 0)

    return (
      this.w.height    * aggregateHeight +
      this.w.holes     * holes +
      this.w.bumpiness * bumpiness +
      this.w.lines     * linesCleared +
      this.w.wells     * wells
    )
  }

  findBest(board, piece) {
    let best   = { score: -Infinity, x: Math.floor(BOARD_WIDTH / 2) - 1, rotations: 0 }
    let found  = false
    let current = { ...piece }

    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < BOARD_WIDTH + 2; x++) {
        let y = 0
        while (board.isValid(current, x, y + 1)) y++
        if (!board.isValid(current, x, y)) continue

        found = true
        const testBoard = board.clone()
        testBoard.place(current, x, y)
        const { cleared } = testBoard.clearLines()
        const score = this._evaluate(testBoard, cleared)
        if (score > best.score) best = { score, x, rotations: rot }
      }
      current = { ...current, shape: rotateCW(current.shape), _rotIdx: (rot + 1) % 4 }
    }

    // 유효한 배치가 없으면 기본값 반환 (게임오버 상황)
    if (!found) return { score: -Infinity, x: Math.floor(BOARD_WIDTH / 2) - 1, rotations: 0 }
    return best
  }

  step(board, scene) {
    const piece = scene.enemyPiece
    if (!piece || scene.gameOver) return

    if (!this._planned) {
      this._plan = this.findBest(board, piece)
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
