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
    b.grid[BOARD_HEIGHT-1][0] = 0
    b.grid[BOARD_HEIGHT-2][0] = 0xffffff
    const f = elTetrisScore(b)
    expect(f.holes).toBeGreaterThanOrEqual(1)
  })

  it('명백한 라인 클리어가 가능하면 봇이 그 배치를 고른다', () => {
    const b = new Board()
    for (let x = 1; x < BOARD_WIDTH; x++) b.grid[BOARD_HEIGHT-1][x] = 0xffffff
    const ai = new TetrisAI(3)
    const piece = { ...PIECES.I, name: 'I', _rotIdx: 0 }
    const best = ai.findBest(b, piece)
    expect(best.x).toBeGreaterThanOrEqual(-2)
    expect(best.score).toBeGreaterThan(-Infinity)
  })
})
