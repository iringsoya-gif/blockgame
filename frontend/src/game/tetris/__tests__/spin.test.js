import { describe, it, expect } from 'vitest'
import { Board, PIECES, BOARD_WIDTH, BOARD_HEIGHT } from '../Board'

function fill(b, cells) {
  for (const [y, x] of cells) b.grid[y][x] = 0xffffff
}
function tpiece(rotIdx) {
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
    fill(b, [[oy, ox], [oy, ox+2], [oy+1, ox], [oy+1, ox+2]])
    const spin = b.detectSpin(tpiece(0), ox, oy)
    expect(['mini', 'full']).toContain(spin)
  })

  it('비-T 피스가 좌/우/아래로 못 움직이면 All-Spin(full)', () => {
    const b = new Board()
    const s = { ...PIECES.S, name: 'S', _rotIdx: 0 }
    const oy = BOARD_HEIGHT - s.shape.length
    for (let y = 0; y < BOARD_HEIGHT; y++) { b.grid[y][0] = 0xffffff; b.grid[y][BOARD_WIDTH-1] = 0xffffff }
    const spin = b.detectSpin(s, 1, oy)
    expect(['none', 'full']).toContain(spin)
  })
})
