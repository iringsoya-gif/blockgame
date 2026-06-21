import { FIELD_EVENTS, getRandomEvent } from './fieldEvents'
import { BOARD_WIDTH } from './tetris/Board'
import { rotateCW } from './tetris/AI'

/**
 * BattleScene에 주입되어 필드 이벤트를 관리
 */
export class FieldEventManager {
  constructor(scene) {
    this.scene = scene
    this.activeEffects = {}   // { effectId: timerEvent }
    this._bonusBlockActive = false
    this._doubleScoreActive = false
    this._darknessActive = false

    // 랜덤 이벤트 타이머 (30~60초 간격)
    this._scheduleNextRandom()

    // 이벤트 알림 텍스트 큐
    this._notifQueue = []
    this._notifShowing = false
  }

  // ── 이벤트 스케줄 ─────────────────────────────────
  _scheduleNextRandom() {
    const delay = Math.floor(Math.random() * 30000) + 25000
    this.scene.time.delayedCall(delay, () => {
      if (!this.scene.gameOver) {
        this.trigger(getRandomEvent().id)
        this._scheduleNextRandom()
      }
    })
  }

  // GM이 지정한 이벤트 목록 처리
  applyFromContext(eventIds = []) {
    eventIds.forEach((id, i) => {
      // 각 이벤트를 전투 시작 후 순차 발동 (5초 간격)
      this.scene.time.delayedCall(i * 5000 + 3000, () => {
        if (!this.scene.gameOver) this.trigger(id)
      })
    })
  }

  // ── 이벤트 발동 ───────────────────────────────────
  trigger(eventId) {
    const def = FIELD_EVENTS[eventId]
    if (!def) return

    this._showNotification(def)
    this._applyEffect(eventId, def)
  }

  _applyEffect(id, def) {
    const scene = this.scene

    switch (id) {
      // ── 보너스 블록 ─────────────────────────────
      case 'bonus_block':
        this._bonusBlockActive = true
        // 다음 스폰 시 BattleScene이 체크
        break

      // ── 마나 폭발 ───────────────────────────────
      case 'gauge_burst':
        scene.skillManager.playerGauge = scene.skillManager.maxGauge
        scene.cameras.main.flash(300, 170, 136, 255, true)
        break

      // ── 약한 중력 ───────────────────────────────
      case 'slow_gravity': {
        const orig = scene.playerDropInterval
        scene.playerDropInterval = orig * 1.6
        this._setTimer('slow_gravity', def.duration, () => {
          scene.playerDropInterval = orig
        })
        break
      }

      // ── 암흑 ────────────────────────────────────
      case 'darkness':
        this._darknessActive = true
        this._setTimer('darkness', def.duration, () => {
          this._darknessActive = false
        })
        break

      // ── 강한 중력 ───────────────────────────────
      case 'heavy_gravity': {
        const orig = scene.playerDropInterval
        scene.playerDropInterval = Math.max(200, orig * 0.5)
        this._setTimer('heavy_gravity', def.duration, () => {
          scene.playerDropInterval = orig
        })
        break
      }

      // ── 지진 ────────────────────────────────────
      case 'earthquake':
        scene.cameras.main.shake(800, 0.02)
        scene.playerBoard.addGarbage(1)
        break

      // ── 혼돈의 바람 ─────────────────────────────
      case 'random_rotation': {
        const times = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < times; i++) {
          const rotated = { ...scene.currentPiece, shape: rotateCW(scene.currentPiece.shape) }
          if (scene.playerBoard.isValid(rotated, scene.pieceX, scene.pieceY))
            scene.currentPiece = rotated
        }
        break
      }

      // ── 점수 2배 ────────────────────────────────
      case 'double_score':
        this._doubleScoreActive = true
        this._setTimer('double_score', def.duration, () => {
          this._doubleScoreActive = false
        })
        break

      // ── 좁은 공간 ───────────────────────────────
      case 'narrow_board': {
        const board = scene.playerBoard
        for (let y = 0; y < board.grid.length; y++) {
          board.grid[y][0] = 0x444455
          board.grid[y][BOARD_WIDTH - 1] = 0x444455
        }
        break
      }

      // ── 거울 세계 (좌우 반전) ────────────────────
      case 'mirror_board': {
        const board = scene.playerBoard
        for (let y = 0; y < board.grid.length; y++) {
          board.grid[y].reverse()
        }
        scene.cameras.main.flash(200, 100, 200, 255)
        break
      }

      // ── 잔해의 비 (가비지 2줄) ───────────────────
      case 'garbage_rain': {
        scene.cameras.main.shake(500, 0.012)
        const overflow = scene.playerBoard.addGarbage(2)
        if (overflow && typeof scene._endBattle === 'function') {
          scene._endBattle(false)
        }
        break
      }

      // ── 치유의 영역 (게이지 지속 충전) ───────────
      case 'healing_zone': {
        // Phaser 타이머 사용 (scene 파괴 시 자동 정리 → 누수 방지)
        const healEvent = scene.time.addEvent({
          delay: 2000,
          repeat: 5,  // 총 6회 (12초)
          callback: () => {
            if (scene.gameOver) { healEvent.remove(); return }
            scene.skillManager?.addPlayerGauge?.(1)
          },
        })
        this.activeEffects['healing_zone'] = healEvent
        break
      }
    }
  }

  _setTimer(key, duration, cb) {
    if (this.activeEffects[key]) this.activeEffects[key].remove()
    this.activeEffects[key] = this.scene.time.delayedCall(duration, cb)
  }

  // ── 보너스 블록 소비 ──────────────────────────────
  consumeBonusBlock() {
    if (!this._bonusBlockActive) return false
    this._bonusBlockActive = false
    return true
  }

  get doubleScore() { return this._doubleScoreActive }
  get darknessActive() { return this._darknessActive }

  // ── 알림 UI ───────────────────────────────────────
  _showNotification(def) {
    this._notifQueue.push(def)
    if (!this._notifShowing) this._processQueue()
  }

  _processQueue() {
    if (this._notifQueue.length === 0) { this._notifShowing = false; return }
    this._notifShowing = true
    const def = this._notifQueue.shift()

    const scene = this.scene
    const cx = scene.scale.width / 2

    const bg = scene.add.rectangle(cx, 130, 320, 52, 0x0d0d1a, 0.92)
      .setDepth(50).setStrokeStyle(1.5, def.color)
    const icon = scene.add.text(cx - 130, 130, def.icon,
      { fontSize: '22px' }).setOrigin(0.5).setDepth(51)
    const title = scene.add.text(cx - 100, 122, def.name,
      { fontFamily: '"JetBrains Mono"', fontSize: '13px', fill: `#${def.color.toString(16).padStart(6,'0')}`, fontStyle: 'bold' }
    ).setOrigin(0, 0.5).setDepth(51)
    const desc = scene.add.text(cx - 100, 138, def.desc,
      { fontFamily: '"Noto Sans KR"', fontSize: '10px', fill: '#7070a0' }
    ).setOrigin(0, 0.5).setDepth(51)

    const objs = [bg, icon, title, desc]
    objs.forEach((o) => o.setAlpha(0))
    scene.tweens.add({
      targets: objs, alpha: 1, duration: 200,
      onComplete: () => {
        scene.time.delayedCall(2200, () => {
          scene.tweens.add({
            targets: objs, alpha: 0, duration: 300,
            onComplete: () => {
              objs.forEach((o) => o.destroy())
              this._processQueue()
            },
          })
        })
      },
    })
  }
}
