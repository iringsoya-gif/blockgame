import { describe, it, expect } from 'vitest'
import { Board, PIECES } from '../Board'

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
    const v = b.tryRotate(piece('I'), 3, 0, 1)
    expect(v).not.toBeNull()
    const r = b.tryRotate(v.piece, -1, v.y, -1)
    expect(r).not.toBeNull()
  })
})
