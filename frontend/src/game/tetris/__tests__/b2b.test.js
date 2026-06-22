import { describe, it, expect } from 'vitest'
import { Board, BOARD_WIDTH, BOARD_HEIGHT } from '../Board'

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
    setupClearableRows(b, 4, 0)
    for (let i = 0; i < 4; i++) b.grid[BOARD_HEIGHT-1-i][0] = 0xffffff
    const r1 = b.clearLines('none')
    expect(r1.cleared).toBe(4)
    expect(r1.allClear).toBe(false)
    expect(r1.b2b).toBe(1)

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
    b.clearLines('none')
    setupClearableRows(b, 1, 0)
    b.grid[BOARD_HEIGHT-1][0] = 0xffffff
    const r = b.clearLines('none')
    expect(r.b2b).toBe(0)
  })

  it('체인 ≥4가 일반 클리어로 끊기면 surge가 발동한다', () => {
    const b = new Board()
    residual(b)
    b.b2b = 4
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
    for (let x = 0; x < BOARD_WIDTH; x++) b.grid[BOARD_HEIGHT-1][x] = (x === 0) ? 0 : 0xffffff
    b.grid[BOARD_HEIGHT-1][0] = 0xffffff
    const r = b.clearLines('none')
    expect(r.allClear).toBe(true)
    expect(r.b2b).toBe(2)
  })
})
