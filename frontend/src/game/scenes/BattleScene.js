import Phaser from 'phaser'
import { Board, BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE, PREVIEW_COUNT, PIECES } from '../tetris/Board'
import { TetrisAI, PieceBag, rotateCW } from '../tetris/AI'
import { SkillManager } from '../skills/SkillManager'
import { FieldEventManager } from '../FieldEventManager'
import { applyClassPassives, CLASSES } from '../classes'
import { CLASS_SILHOUETTES, getEnemySilhouette } from '../characters'
import { sound } from '../../lib/sound'


// ── 적 대사 시스템 ────────────────────────────────────────
const ENEMY_DIALOGUES = {
  // 페이즈/상황별 대사 풀
  battle_start:  ['상대해 주겠다!', '각오해라!', '끝내주마.', '어디 해보자고.'],
  near_death:    ['아직 끝나지 않았다!', '...이 정도였나.', '그렇게는 안 돼!'],
  phase_change:  ['이게 내 진짜 힘이다!', '이제 본격적으로 시작이다!', '어림없어!'],
  skill_use:     ['이 기술을 받아라!', '어떠냐!', '여기서 끝낸다!'],
  player_attack: ['겨우 이 정도?', '통하지 않는다!', '하하, 약하군.'],
  player_good:   ['무시할 수 없군.', '...제법인데.', '흥, 운이 좋았을 뿐이야.'],
  garbage_sent:  ['받아라!', '선물이다!', '처리해봐라!'],
}

const BOSS_DIALOGUES = {
  battle_start:  ['감히 이 앞에 서다니. 후회하게 될 것이다.', '수백 년 만의 도전자... 재미있군.'],
  near_death:    ['...불가능하다. 나는 불사야!', '이 몸이 여기서 쓰러진다고?!'],
  phase_change:  ['잠깐 기다려라. 진짜 힘을 보여주마.', '봉인이 풀렸다... 이제 두고 봐라!'],
  victory:       ['이 정도였나. 실망이다.'],
}

export const SCENE_W = 920
export const SCENE_H = 820

const CHAR_H   = 96
const BOARD_OY = CHAR_H + 14

const BOARD_W_PX = BOARD_WIDTH  * CELL_SIZE
const BOARD_H_PX = BOARD_HEIGHT * CELL_SIZE
const PREVIEW_W  = 86
const GAP        = 38
const TOTAL_W    = BOARD_W_PX * 2 + PREVIEW_W + GAP
const LEFT_PAD   = Math.floor((SCENE_W - TOTAL_W) / 2)

export const PLAYER_OX  = LEFT_PAD
export const PREVIEW_OX = PLAYER_OX + BOARD_W_PX + 6
export const ENEMY_OX   = PLAYER_OX + BOARD_W_PX + PREVIEW_W + GAP

const PLAYER_CX = PLAYER_OX + BOARD_W_PX / 2
const ENEMY_CX  = ENEMY_OX  + BOARD_W_PX / 2

export const GOALS = {
  VERSUS: 'versus', SURVIVAL: 'survival', LINE_RACE: 'line_race', SCORE: 'score', ENDLESS: 'endless',
}

// DAS (Delayed Auto Shift) 설정
const DAS_DELAY = 167   // ms — 처음 홀드 후 반복 시작까지
const DAS_ARR   = 33    // ms — 반복 간격 (약 30fps)

export class BattleScene extends Phaser.Scene {
  constructor(key = 'BattleScene') { super(key) }

  init(data) {
    this.context        = data
    this.difficulty     = data.difficulty     ?? 2
    this.initGarbage    = data.initial_garbage ?? 0
    this.isBoss         = data.type === 'boss'
    this.onBattleEnd    = data.onBattleEnd    ?? (() => {})
    this.enemyName      = data.enemy_name     ?? 'ENEMY'
    this.goal           = data.goal           ?? GOALS.VERSUS
    this.targetLines    = data.target_lines   ?? 20
    this.durationSec    = data.duration_sec   ?? 60
    this._endlessLevel      = 1
    this._endlessScoreTimer = 0
    this._enemyLinesCleared = 0
    this.bossHp         = data.boss_hp        ?? null
    this.bossMaxHp      = data.boss_hp        ?? null
    this.phaseCount     = Math.max(1, data.phase_count ?? 1)
    this.bossAllSkills  = data.enemy_skills   ?? []
    this._bossPhaseEvents = data.field_events ?? []  // 페이즈 전환 시 순차 발동
    this.currentPhase   = 1
    this.playerSkillIds = data.player_skills  ?? []
    this.enemySkillIds  = data.enemy_skills   ?? []
    this.classId        = data.classId        ?? 'warrior'

    this.startTime         = Date.now()
    this.gameOver          = false
    this.totalLinesCleared = 0
    this.score             = 0
    this.elapsedSec        = 0
    this._baseDropInterval  = 800
    this.playerDropInterval = 800
    this.playerDropTimer    = 0
    this.aiTimer            = 0
    this.garbageTimer       = 0
    this.garbageInterval    = 8000
    this._lastTSpin         = false
    this._holdPiece         = null
    this._holdUsed          = false
    this._softDropScore     = 0
    // 락 딜레이 (블록 고정 유예)
    this._lockTimer         = 0      // 바닥에 닿은 후 경과 시간(ms)
    this._lockResets        = 0      // 이동/회전으로 리셋한 횟수
    this._grounded          = false  // 현재 블록이 바닥에 닿았는지
    this.LOCK_DELAY         = 500     // 고정까지 유예(ms)
    this.MAX_LOCK_RESETS    = 15      // 무한 회전 방지
    // 가비지 큐 (받은 가비지를 보류 후 지연 투하 → 상쇄 가능)
    this._garbageQueue      = []     // [{ amount, remaining }]
    this.GARBAGE_DELAY      = 1500    // 큐에 들어온 뒤 투하까지(ms)
    // 상세 통계
    this._stats = {
      tetris_count:   0,
      tspin_count:    0,
      max_combo:      0,
      max_b2b_streak: 0,
      perfect_clears: 0,
      hard_drops:     0,
    }
    this._b2bStreak = 0
    this._dasDir            = 0
    this._dasTimer          = 0
    this._dasActive         = false  // 피스 착지 시 전달할 가비지
  }

  create() {
    sound.resume()

    this.add.rectangle(SCENE_W / 2, SCENE_H / 2, SCENE_W, SCENE_H, 0x06061a)
    this.bgGfx   = this.add.graphics()
    this.gfx     = this.add.graphics()
    this.charGfx = this.add.graphics()
    this.fxGfx   = this.add.graphics()  // 이펙트 레이어

    this.playerBoard = new Board()
    this.enemyBoard  = new Board()
    this.playerBoard.addGarbage(this.initGarbage)

    this.ai        = new TetrisAI(this.goal === GOALS.SURVIVAL ? 1 : this.difficulty)
    this.playerBag = new PieceBag()
    this.enemyBag  = new PieceBag()

    this.skillManager = new SkillManager(this.playerSkillIds, this.enemySkillIds, this.ai)
    this.skillManager.onApplyEffect = this._applyEffect.bind(this)
    this.skillManager.onSkillEffect = this._onSkillEffect.bind(this)
    this.skillManager.onEnemySkill  = this._onEnemySkill.bind(this)
    if (this.classId) {
      applyClassPassives(this.classId, this.skillManager, this)
      this._baseDropInterval = this.playerDropInterval
    }

    this.fieldEvents = new FieldEventManager(this)
    if (this.context.field_events?.length) {
      if (this.isBoss) {
        // 보스전: 첫 이벤트만 시작 시 적용, 나머지는 페이즈 전환마다 발동
        this.fieldEvents.applyFromContext(this.context.field_events.slice(0, 1))
      } else {
        this.fieldEvents.applyFromContext(this.context.field_events)
      }
    }

    this.spawnPlayerPiece()
    if (this._needsEnemy()) this.spawnEnemyPiece()

    this._setupInput()

    this.events.on('enemy_garbage', (n) => {
      if (!this.skillManager.absorbGarbage()) {
        // 즉시 투하 대신 큐에 보류 → 플레이어가 라인 지워 상쇄 가능
        this._queueGarbage(n)
      }
    })
    this.events.on('enemy_cleared', (n) => {
      this.skillManager.addEnemyGauge(n)
      // 라인 레이스: 적이 먼저 목표 도달 시 패배
      this._enemyLinesCleared = (this._enemyLinesCleared ?? 0) + n
      if (this.goal === GOALS.LINE_RACE && this._enemyLinesCleared >= this.targetLines) {
        this._endBattle(false)
      }
    })

    this._drawStaticBg()
    this._drawCharacters()
    this._buildUI()

    // 적 대사 타이머
    this._enemyDialogueTimer = 0
    this._enemyDialogueCooldown = 12000  // 12초마다
    this._dialogueShown = new Set()

    // 첫 대사
    this.time.delayedCall(800, () => {
      const pool   = this.isBoss ? BOSS_DIALOGUES : ENEMY_DIALOGUES
      const start  = pool.battle_start
      const text   = start[Math.floor(Math.random() * start.length)]
      this._showEnemyDialogue(text)
    })
    sound.battleStart()
    if (this.isBoss) {
      this.time.delayedCall(400, () => {
        sound.bossAppear()
        sound.startBossBGM()
      })
    } else {
      this.time.delayedCall(300, () => sound.startBattleBGM())
    }
  }

  _needsEnemy() {
    return this.goal === GOALS.VERSUS || this.goal === GOALS.LINE_RACE || this.isBoss
  }

  // ── 정적 배경 ────────────────────────────────────────
  _drawStaticBg() {
    const cls        = CLASSES[this.classId] ?? { color: 0x7c5cfc }
    const enemyColor = this.isBoss ? 0xff1133 : 0xff5522

    // 보드 글로우
    this.bgGfx.lineStyle(2, cls.color, 0.45)
    this.bgGfx.strokeRect(PLAYER_OX - 2, BOARD_OY - 2, BOARD_W_PX + 4, BOARD_H_PX + 4)
    if (this._needsEnemy()) {
      this.bgGfx.lineStyle(2, enemyColor, 0.45)
      this.bgGfx.strokeRect(ENEMY_OX - 2, BOARD_OY - 2, BOARD_W_PX + 4, BOARD_H_PX + 4)
    }

    // 중앙 VS
    const midX = SCENE_W / 2
    this.bgGfx.lineStyle(1, 0x14143a, 0.7)
    this.bgGfx.lineBetween(midX, BOARD_OY, midX, BOARD_OY + BOARD_H_PX)
    this.add.text(midX, BOARD_OY + BOARD_H_PX / 2, 'VS',
      { fontFamily: '"JetBrains Mono"', fontSize: '14px', fill: '#14143a', fontStyle: 'bold' }).setOrigin(0.5)
  }

  // ── 캐릭터 실루엣 ─────────────────────────────────────
  _drawCharacters() {
    const cls      = CLASSES[this.classId] ?? { color: 0x7c5cfc, name: 'PLAYER', icon: '?' }
    const clsColor = cls.color
    const clsHex   = `#${clsColor.toString(16).padStart(6,'0')}`
    const charCY   = CHAR_H / 2 + 8

    // 플레이어 글로우
    this.charGfx.fillStyle(clsColor, 0.07)
    this.charGfx.fillCircle(PLAYER_CX, charCY, 38)
    ;(CLASS_SILHOUETTES[this.classId] ?? CLASS_SILHOUETTES.warrior)(this.charGfx, PLAYER_CX, charCY, clsColor, 0.9, 1)

    this.add.text(PLAYER_CX, 4,        cls.icon ?? '', { fontSize: '16px', color: clsHex }).setOrigin(0.5, 0)
    this.add.text(PLAYER_CX, CHAR_H - 18, cls.name ?? 'PLAYER',
      { fontFamily: '"JetBrains Mono"', fontSize: '10px', fill: clsHex, fontStyle: 'bold' }).setOrigin(0.5, 0)

    // 플레이어 HP
    this.add.rectangle(PLAYER_OX, CHAR_H - 6, BOARD_W_PX, 4, 0x111128).setOrigin(0, 0.5)
    this._playerHpBar = this.add.rectangle(PLAYER_OX, CHAR_H - 6, BOARD_W_PX, 4, clsColor).setOrigin(0, 0.5)

    if (this._needsEnemy()) {
      const enemyColor = this.isBoss ? 0xff1133 : 0xff5522
      const enemyHex   = `#${enemyColor.toString(16).padStart(6,'0')}`
      const enemyFn    = getEnemySilhouette(this.enemyName, this.isBoss)

      this.charGfx.fillStyle(enemyColor, 0.07)
      this.charGfx.fillCircle(ENEMY_CX, charCY, 38)
      enemyFn(this.charGfx, ENEMY_CX, charCY, enemyColor, 0.9, 1)

      this.add.text(ENEMY_CX, 4, this.isBoss ? '💀' : '👾', { fontSize: '16px' }).setOrigin(0.5, 0)
      this.add.text(ENEMY_CX, CHAR_H - 18, this.enemyName.toUpperCase(),
        { fontFamily: '"JetBrains Mono"', fontSize: '10px', fill: enemyHex, fontStyle: 'bold' }).setOrigin(0.5, 0)

      if (this.isBoss && this.bossMaxHp) {
        const bw = BOARD_W_PX
        this.add.rectangle(ENEMY_OX, CHAR_H - 6, bw, 4, 0x330011).setOrigin(0, 0.5)
        this._bossHpBar  = this.add.rectangle(ENEMY_OX, CHAR_H - 6, bw, 4, 0xff1133).setOrigin(0, 0.5)
        this._bossHpText = this.add.text(ENEMY_OX + bw + 4, CHAR_H - 10,
          `${this.bossHp}`, { fontFamily: '"JetBrains Mono"', fontSize: '9px', fill: '#ff5566' })
        this._bossPhaseText = this.add.text(ENEMY_CX, CHAR_H - 18,
          `Phase ${this.currentPhase}/${this.phaseCount}`,
          { fontFamily: '"JetBrains Mono"', fontSize: '9px', fill: '#ff8866' }).setOrigin(0.5, 0)
        // 페이즈 구분선
        for (let i = 1; i < this.phaseCount; i++) {
          const lx = ENEMY_OX + (bw / this.phaseCount) * i
          this.add.rectangle(lx, CHAR_H - 6, 2, 4, 0xffffff, 0.4)
        }
      }
    }
  }

  // ── 스폰 ─────────────────────────────────────────────
  spawnPlayerPiece() {
    if (!this._playerQueue) this._playerQueue = []
    while (this._playerQueue.length < PREVIEW_COUNT + 1)
      this._playerQueue.push(this.playerBag.next())
    this.currentPiece = this._playerQueue.shift()
    if (this.fieldEvents?.consumeBonusBlock())
      this.currentPiece = { ...this.currentPiece, _bonus: true, color: 0xffe600 }
    this.pieceX = Math.floor(BOARD_WIDTH / 2) - 1
    this.pieceY = -1  // 스폰 위치 개선
    this._lastTSpin = false
    this._holdUsed  = false
    this.playerBoard.lastRotation = false
    // 새 블록은 락 상태 초기화
    this._grounded   = false
    this._lockTimer  = 0
    this._lockResets = 0
    this.playerDropTimer = 0
    if (!this.playerBoard.isValid(this.currentPiece, this.pieceX, 0))
      this._endBattle(false)
  }

  spawnEnemyPiece() {
    if (!this._needsEnemy()) return
    this.enemyPiece = this.enemyBag.next()
    this.enemyX = Math.floor(BOARD_WIDTH / 2) - 1
    this.enemyY = 0
    if (!this.enemyBoard.isValid(this.enemyPiece, this.enemyX, this.enemyY))
      this._endBattle(true)
  }

  // ── 홀드 ─────────────────────────────────────────────
  _holdPieceAction() {
    if (this._holdUsed) { sound.skillBlocked(); return }
    if (!this._holdPiece) {
      this._holdPiece = { ...this.currentPiece, shape: this._resetRotation(this.currentPiece) }
      this.spawnPlayerPiece()
    } else {
      const temp = this._holdPiece
      this._holdPiece = { ...this.currentPiece, shape: this._resetRotation(this.currentPiece) }
      this.currentPiece = temp
      this.pieceX = Math.floor(BOARD_WIDTH / 2) - 1
      this.pieceY = 0
      // 교체된 블록은 락 상태 초기화 (바닥에서 홀드 시 즉시 고정 방지)
      this._grounded   = false
      this._lockTimer  = 0
      this._lockResets = 0
      this.playerDropTimer = 0
    }
    this._holdUsed = true
    sound.rotate()
  }

  _resetRotation(piece) {
    const key = piece.name ?? piece.key
    if (PIECES[key]) {
      return PIECES[key].shape.map(row => [...row])  // 깊은 복사
    }
    return piece.shape
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys({
      skill0: Phaser.Input.Keyboard.KeyCodes.Q,
      skill1: Phaser.Input.Keyboard.KeyCodes.W,
      skill2: Phaser.Input.Keyboard.KeyCodes.E,
      skill3: Phaser.Input.Keyboard.KeyCodes.R,
      skill4: Phaser.Input.Keyboard.KeyCodes.A,
      hold:   Phaser.Input.Keyboard.KeyCodes.C,     // C = 홀드
      pause:  Phaser.Input.Keyboard.KeyCodes.ESC,
      rotCCW: Phaser.Input.Keyboard.KeyCodes.Z,     // Z = 반시계 회전
      hardDrop: Phaser.Input.Keyboard.KeyCodes.SPACE,
    })
  }

  // ── 업데이트 ─────────────────────────────────────────
  update(_, delta) {
    if (this.gameOver || this._paused) return

    // delta clamp: 탭 백그라운드 복귀 시 시간 폭주 방지 (최대 100ms)
    delta = Math.min(delta, 100)

    // 경과 시간을 누적 delta로 계산 (일시정지/백그라운드 동안 멈춤)
    this.elapsedSec      += delta / 1000
    this.aiTimer         += delta
    this.skillManager.update(delta)

    this._handleInput()
    this._processDAS(delta)
    this._updateEnemyDialogue(delta)
    this._processGarbageQueue(delta)

    // 중력 낙하 + 락 딜레이
    const canFall = this.playerBoard.isValid(this.currentPiece, this.pieceX, this.pieceY + 1)
    if (canFall) {
      // 공중: 일반 낙하, 락 상태 해제
      this._grounded = false
      this._lockTimer = 0
      this.playerDropTimer += delta
      if (this.playerDropTimer > this.playerDropInterval) {
        this.playerDropTimer = 0
        this._playerStepDown(false)
      }
    } else {
      // 바닥에 닿음: 락 딜레이 카운트
      if (!this._grounded) {
        this._grounded   = true
        this._lockTimer  = 0
        this._lockResets = 0
      }
      this._lockTimer += delta
      if (this._lockTimer >= this.LOCK_DELAY) {
        this._lockPiece()
      }
    }

    if (this._needsEnemy() && this.aiTimer > this.ai.getInterval()) {
      this.aiTimer = 0
      this.ai.step(this.enemyBoard, this)
      if (this.skillManager.enemyGauge >= 30)
        this.skillManager.tryEnemySkill(this.enemyBoard)
    }

    if (this.goal === GOALS.SURVIVAL) {
      this.garbageTimer += delta
      if (this.garbageTimer > this.garbageInterval) {
        this.garbageTimer = 0
        this._queueGarbage(1)
        this.garbageInterval = Math.max(3000, this.garbageInterval - 350)
      }
      if (this.elapsedSec >= this.durationSec) this._endBattle(true)
    }
    if (this.goal === GOALS.ENDLESS) {
      // 레벨업: 10줄마다 단계 상승 → 낙하 가속
      const newLevel = Math.floor(this.totalLinesCleared / 10) + 1
      if (newLevel > this._endlessLevel) {
        this._endlessLevel = newLevel
        this._baseDropInterval = Math.max(120, 800 - (newLevel - 1) * 60)
        if (!this._softDropping) this.playerDropInterval = this._baseDropInterval
        this._showLabel(`LEVEL ${newLevel}`, 0xffd700, 1000, 2)
        sound.levelUp()
      }
      // 주기적 가비지 (레벨 높을수록 자주, 시간 경과로도 가속)
      this.garbageTimer += delta
      const gInterval = Math.max(2500, 9000 - this._endlessLevel * 500)
      if (this.garbageTimer > gInterval) {
        this.garbageTimer = 0
        this._queueGarbage(1)
      }
      // 시간 점수 (생존 보너스)
      this._endlessScoreTimer += delta
      if (this._endlessScoreTimer > 1000) {
        this._endlessScoreTimer = 0
        this.score += this._endlessLevel
      }
    }
    if (this.goal === GOALS.SCORE && this.elapsedSec >= this.durationSec) this._endBattle(true)

    this._draw()
    this._updateDynamicUI()
  }

  // ── 입력 ─────────────────────────────────────────────
  _handleInput() {
    if (this._paused || this.gameOver) return
    const jd = Phaser.Input.Keyboard.JustDown
    const held = this.cursors

    // 이동 (DAS 방향키 홀드 지원 개선)
    if (jd(held.left))  { this._moveH(-1); this._dasDir = -1; this._dasTimer = 0; this._dasActive = false }
    if (jd(held.right)) { this._moveH( 1); this._dasDir =  1; this._dasTimer = 0; this._dasActive = false }
    if (!held.left.isDown && !held.right.isDown) { this._dasDir = 0; this._dasActive = false }

    // 소프트 드롭
    if (held.down?.isDown) {
      if (!this._softDropping) { this._softDropping = true; this.playerDropInterval = 50 }
    } else {
      if (this._softDropping) {
        this._softDropping = false
        this.playerDropInterval = this._baseDropInterval
      }
    }

    if (jd(held.up))              this._rotatePlayer(1)
    if (jd(this.keys.rotCCW))    this._rotatePlayer(-1)
    if (jd(this.keys.hold))      this._holdPieceAction()

    // 스킬
    const sk = [this.keys.skill0, this.keys.skill1, this.keys.skill2, this.keys.skill3, this.keys.skill4]
    sk.forEach((k, i) => { if (jd(k)) this._useSkill(i) })

    // 일시정지
    if (jd(this.keys.pause)) {
      this.context.onPause?.()
    }

    // 하드 드롭 (스페이스)
    if (jd(this.keys.hardDrop)) this._hardDrop()
  }

  _processDAS(delta) {
    if (this._dasDir === 0) {
      this._dasActive = false
      this._dasTimer  = 0
      return
    }
    this._dasTimer += delta
    if (!this._dasActive) {
      if (this._dasTimer >= DAS_DELAY) {
        this._dasActive = true
        this._dasTimer  = 0
        this._moveH(this._dasDir)
      }
    } else {
      if (this._dasTimer >= DAS_ARR) {
        this._dasTimer = 0
        this._moveH(this._dasDir)
      }
    }
  }

  _moveH(dir) {
    if (this.playerBoard.isValid(this.currentPiece, this.pieceX + dir, this.pieceY)) {
      this.pieceX += dir
      this.playerBoard.lastRotation = false
      sound.move()
      this._resetLockDelay()
    }
  }

  _rotatePlayer(dir) {
    const result = this.playerBoard.tryRotate(this.currentPiece, this.pieceX, this.pieceY, dir)
    if (result) {
      this.currentPiece = result.piece
      this.pieceX = result.x
      this.pieceY = result.y
      this._lastTSpin = result.isTSpin
      this.playerBoard.lastRotation = true
      sound.rotate()
      this._resetLockDelay()
    }
  }

  // 바닥에 닿은 상태에서 조작 시 락 타이머 리셋 (무한 회전 방지: 횟수 제한)
  _resetLockDelay() {
    if (this._grounded && this._lockResets < this.MAX_LOCK_RESETS) {
      this._lockTimer = 0
      this._lockResets++
    }
  }

  _hardDrop() {
    if (this.gameOver) return
    let dropped = 0
    while (this.playerBoard.isValid(this.currentPiece, this.pieceX, this.pieceY + 1)) {
      this.pieceY++; dropped++
    }
    this.score += dropped * 2  // 하드 드롭 보너스
    this.playerBoard.lastRotation = false
    sound.hardDrop()
    this._stats.hard_drops++
    this._playerStepDown(true)
  }

  _playerStepDown(isHardDrop = false) {
    if (this.gameOver) return

    if (!isHardDrop && this.playerBoard.isValid(this.currentPiece, this.pieceX, this.pieceY + 1)) {
      this.pieceY++
      this.playerBoard.lastRotation = false
      if (this._softDropping) { this.score += 1 }
      return
    }
    // 더 내려갈 수 없으면 즉시 고정 (하드드롭 경로)
    this._lockPiece()
  }

  // 블록을 보드에 고정 + 라인 처리 + 가비지 상쇄/전송
  _lockPiece() {
    if (this.gameOver) return

    // 락 상태 초기화
    this._grounded   = false
    this._lockTimer  = 0
    this._lockResets = 0

    // 착지
    this.playerBoard.place(this.currentPiece, this.pieceX, this.pieceY)
    sound.place()

    // 보너스 블록
    if (this.currentPiece._bonus) {
      for (let i = 0; i < 3; i++) {
        this.playerBoard.grid.splice(this.playerBoard.grid.length - 1, 1)
        this.playerBoard.grid.unshift(Array(BOARD_WIDTH).fill(0))
      }
    }

    const spin = this.playerBoard.lastRotation ? this.playerBoard.detectSpin(this.currentPiece, this.pieceX, this.pieceY) : 'none'
    const clearResult = this.playerBoard.clearLines(spin)
    const { cleared, score: clearScore, label, combo } = clearResult

    // 상세 통계 수집
    if (cleared === 4) this._stats.tetris_count++
    if (this._lastTSpin && cleared > 0) this._stats.tspin_count++
    if ((combo ?? 0) > this._stats.max_combo) this._stats.max_combo = combo ?? 0
    if (this.playerBoard.isPerfectClear()) this._stats.perfect_clears++
    // B2B 연속 추적 (테트리스/T-spin 연속)
    if (cleared > 0) {
      const isB2B = label?.includes('B2B') || cleared === 4 || (this._lastTSpin && cleared > 0)
      if (isB2B) {
        this._b2bStreak++
        if (this._b2bStreak > this._stats.max_b2b_streak) {
          this._stats.max_b2b_streak = this._b2bStreak
        }
      } else {
        this._b2bStreak = 0  // 일반 클리어로 끊김
      }
    }

    // 점수 팝업
    if (clearScore > 0) {
      this._showScorePopup(clearScore)
    }

    this.totalLinesCleared += cleared
    this.score += clearScore + (this.fieldEvents?.doubleScore ? clearScore : 0)
    this.skillManager.addPlayerGauge(cleared)
    // 검객 — 콤보 연계 시 추가 게이지 (초식 연계)
    if (this._comboBonus && (combo ?? 0) >= 2 && cleared > 0) {
      this.skillManager.addPlayerGauge(1)
    }

    // T-spin 클리어 사운드
    if (this._lastTSpin && cleared > 0) {
      sound.tspin()
    }
    // B2B 사운드 (라벨에 B2B 포함 여부로 판단)
    if (label?.includes('B2B') && cleared > 0) {
      setTimeout(() => sound.b2b(), 200)
    }
    // 퍼펙트 클리어
    if (cleared > 0 && this.playerBoard.isPerfectClear()) {
      this.score += 3000
      this._showLabel('PERFECT CLEAR!', 0xffd700, 1200, 4)
      sound.perfectClear()
    } else if (label) {
      // 강도: 테트리스(4줄)·T-spin·고콤보일수록 크게
      let intensity = 1
      if (cleared === 4) intensity = 3
      else if (this._lastTSpin && cleared > 0) intensity = 3
      else if (label.includes('B2B')) intensity = 2
      else if ((combo ?? 0) >= 3) intensity = 2
      this._showLabel(label, this._labelColor(label), 1200, intensity)
      sound.clearLine(cleared)
      if (combo >= 2) {
        sound.combo(combo)
        this._showCombo(combo)
      }
    }

    // 라인 클리어 시: 먼저 받은 가비지 큐를 상쇄
    let remaining = cleared
    if (cleared > 0 && this._garbageQueue.length > 0) {
      remaining = this._cancelGarbage(cleared)
    }

    // 가비지 전송 (일반 vs) — 상쇄하고 남은 클리어분만 공격
    if (!this.isBoss && this.goal === GOALS.VERSUS && remaining >= 2) {
      const send = this._calcGarbageSend({ ...clearResult, cleared: remaining })
      if (send > 0) {
        this.enemyBoard.addGarbage(send)
        sound.garbageReceive()
      }
    }

    if (this.isBoss && cleared > 0) this._dealBossDamage(cleared)
    if (this.goal === GOALS.LINE_RACE && this.totalLinesCleared >= this.targetLines) {
      this._endBattle(true); return
    }

    this.spawnPlayerPiece()
    this._updateSkillUI()
  }

  // ── 가비지 큐 시스템 ─────────────────────────────────
  // 받은 가비지를 큐에 보류, GARBAGE_DELAY 후 투하
  _queueGarbage(amount) {
    if (amount <= 0) return
    this._garbageQueue.push({ amount, remaining: this.GARBAGE_DELAY })
    this._updateGarbageWarning()
  }

  // 라인 클리어로 큐의 가비지 상쇄. 남은 클리어 수 반환
  _cancelGarbage(cleared) {
    let power = cleared  // 1줄=1, 4줄=4 상쇄력
    let canceledAny = false
    while (power > 0 && this._garbageQueue.length > 0) {
      const head = this._garbageQueue[0]
      canceledAny = true
      if (head.amount <= power) {
        power -= head.amount
        this._garbageQueue.shift()
      } else {
        head.amount -= power
        power = 0
      }
    }
    this._updateGarbageWarning()
    // 기술자 패시브: 가비지 상쇄 시 게이지 추가 충전
    if (canceledAny && this._counterBonus) {
      this.skillManager.addPlayerGauge(2)
    }
    if (cleared > 0 && this._garbageQueue.length === 0) {
      // 모두 상쇄 시 짧은 피드백
      this._showLabel('상쇄!', 0x44ff99, 500)
    }
    return power  // 상쇄하고 남은 공격력
  }

  // 큐 처리: 카운트다운 후 가비지 실제 투하
  _processGarbageQueue(delta) {
    if (this._garbageQueue.length === 0) return
    let dropped = 0
    // 큐 앞에서부터 카운트다운, 0 이하 도달분 투하
    while (this._garbageQueue.length > 0) {
      const head = this._garbageQueue[0]
      head.remaining -= delta
      if (head.remaining <= 0) {
        dropped += head.amount
        this._garbageQueue.shift()
      } else {
        break  // 앞 항목이 아직이면 뒤도 아직 (FIFO, 동일 지연)
      }
    }
    if (dropped > 0) {
      const overflow = this.playerBoard.addGarbage(dropped)
      sound.garbageReceive()
      this.cameras.main.shake(120, 0.006)
      this._updateGarbageWarning()
      // 가비지로 천장 침범 시 패배
      if (overflow) { this._endBattle(false); return }
      // 현재 블록이 새 가비지와 겹치면 한 칸 위로 밀어 보정
      if (!this.playerBoard.isValid(this.currentPiece, this.pieceX, this.pieceY)) {
        this.pieceY = Math.max(-1, this.pieceY - dropped)
        if (!this.playerBoard.isValid(this.currentPiece, this.pieceX, this.pieceY)) {
          this._endBattle(false)
        }
      }
    }
  }

  // 대기 중인 가비지 양 표시 (경고 바)
  _updateGarbageWarning() {
    const total = this._garbageQueue.reduce((s, g) => s + g.amount, 0)
    if (!this._garbageWarnText) return
    if (total > 0) {
      this._garbageWarnText.setText(`⚠ ${total}`).setVisible(true)
    } else {
      this._garbageWarnText.setVisible(false)
    }
  }

  _calcGarbageSend({ cleared, label }) {
    if (label?.includes('T-SPIN')) return cleared === 1 ? 2 : cleared === 2 ? 4 : 6
    if (label?.includes('B2B')) return cleared + 1
    return Math.max(0, cleared - 1)
  }

  _labelColor(label) {
    if (label.includes('PERFECT')) return 0xffd700
    if (label.includes('T-SPIN'))  return 0xaa00ff
    if (label.includes('TETRIS'))  return 0x00f5ff
    if (label.includes('B2B'))     return 0xff8800
    if (label.includes('COMBO'))   return 0xff4499
    return 0x44ff99
  }

  _calcScore(lines) {
    return [0, 100, 300, 500, 800][lines] ?? 0
  }

  // ── 스킬 ─────────────────────────────────────────────
  _useSkill(index) {
    const used = this.skillManager.usePlayerSkill(index)
    if (used) { sound.skillUse(); this._updateSkillUI() }
    else if (this.skillManager.skillBlocked) sound.skillBlocked()
  }

  // 스킬 시각/사운드 피드백 (SkillManager.onSkillEffect 콜백)
  _onSkillEffect(type, skill) {
    switch (type) {
      case 'used':
        if (skill?.name) this._showLabel(skill.name, 0x44ff99, 1000, 2)
        break
      case 'gauge_full':
        this._showLabel('SKILL READY', 0xffd700, 900, 2)
        break
      case 'shield_on':
        this._showLabel('SHIELD', 0x44aaff, 900, 2)
        break
      case 'shield_absorb':
        this._showLabel('흡수!', 0x44aaff, 800, 2)
        this._flashBoard(true)
        break
      case 'blocked':
      case 'skills_blocked':
        this._showLabel('스킬 봉인', 0xff2244, 1000, 2)
        sound.skillBlocked()
        break
      case 'on_cooldown':
        this._showLabel('쿨다운', 0xff8800, 700, 1)
        sound.skillBlocked()
        break
      case 'no_gauge':
        this._showLabel('게이지 부족', 0xff8800, 700, 1)
        sound.skillBlocked()
        break
      default:
        break
    }
  }

  // 적 스킬 사용 알림 (SkillManager.onEnemySkill 콜백)
  _onEnemySkill(id, meta) {
    const name  = meta?.name  ?? '적 스킬'
    const icon  = meta?.icon  ?? '⚠'
    const color = meta?.color ?? 0xff4466
    this._showLabel(`${icon} ${name}`, color, 1200, 3)
    this._flashBoard(true)
    sound.garbageReceive()
  }

  _applyEffect(caster, skillId) {
    const isPlayer  = caster === 'player'
    const selfBoard = isPlayer ? this.playerBoard : this.enemyBoard
    const tgtBoard  = isPlayer ? this.enemyBoard  : this.playerBoard
    const skill     = this.skillManager.playerSkills.find(s => s.id === skillId)

    switch (skillId) {
      case 'add_garbage': {
        const lines = skill?._garbageLines ?? 2
        if (isPlayer) { tgtBoard.addGarbage(lines); this._flashBoard(false); sound.skillUse() }
        else {
          const absorbed = this.skillManager.absorbGarbage()
          if (!absorbed) {
            // 즉시 투하 대신 큐로 → 상쇄 기회 + top-out 일관 처리
            this._queueGarbage(lines)
          }
          else if (skill?._reflect) { tgtBoard.addGarbage(lines) }
          this._flashBoard(true)
        }
        break
      }
      case 'clear_line': {
        const count = skill?._clearLines ?? 1
        for (let i = 0; i < count; i++) {
          selfBoard.grid.splice(selfBoard.grid.length - 1, 1)
          selfBoard.grid.unshift(Array(BOARD_WIDTH).fill(0))
        }
        if (skill?._sendGarbage && this._needsEnemy()) tgtBoard.addGarbage(skill._sendGarbage)
        sound.clearLine(count)
        break
      }
      case 'swap_block':
        if (isPlayer && this._playerQueue?.length > 0) {
          const next = this._playerQueue.shift()
          this._playerQueue.unshift({ ...this.currentPiece })
          this.currentPiece = next
          this.pieceX = Math.floor(BOARD_WIDTH / 2) - 1
          this.pieceY = 0
          // 락 상태 초기화 (바닥에서 swap 시 즉시 고정 방지)
          this._grounded = false; this._lockTimer = 0; this._lockResets = 0
          if (skill?._sendSwappedToEnemy && this._needsEnemy()) tgtBoard.addGarbage(1)
          sound.rotate()
        }
        break
      case 'time_slow':
        if (skill?._stopDrop) {
          this.playerDropInterval = 99999
          this.time.delayedCall(skill._stopDrop, () => { this.playerDropInterval = this._baseDropInterval })
        } else {
          this.playerDropInterval = this._baseDropInterval * 2
          this.time.delayedCall(8000, () => { this.playerDropInterval = this._baseDropInterval })
        }
        break
      case 'slow_player':
        this.playerDropInterval = Math.max(150, this._baseDropInterval * 0.4)
        this.time.delayedCall(6000, () => { this.playerDropInterval = this._baseDropInterval })
        this._flashBoard(true)
        break
      case 'shield': this.skillManager.activateShield(); break
      case 'sword_dance': {
        // 검기난무 — 적에게 가비지 3줄 + 자신 게이지 회복
        if (this._needsEnemy()) {
          const overflow = tgtBoard.addGarbage(3)
          if (overflow && !isPlayer) { /* 적 보드 overflow는 무시 */ }
        }
        this.skillManager.addPlayerGauge(1)  // 일부 회복
        this.cameras.main.shake(250, 0.007)
        this._showLabel('劍氣亂舞', 0xe63946, 1200, 3)
        sound.skillUse()
        break
      }
      case 'mind_blade': {
        // 심검 — 맨 아래 2줄 베어내기
        for (let i = 0; i < 2; i++) {
          selfBoard.grid.splice(selfBoard.grid.length - 1, 1)
          selfBoard.grid.unshift(Array(BOARD_WIDTH).fill(0))
        }
        this._showLabel('心劍', 0xc1121f, 1200, 2)
        sound.clearLine(2)
        break
      }
      case 'arcane_blast': {
        // 비전 폭발 — 적에게 가비지 2줄 + 내 보드 맨 아래 1줄 정리
        if (this._needsEnemy()) tgtBoard.addGarbage(2)
        selfBoard.grid.splice(selfBoard.grid.length - 1, 1)
        selfBoard.grid.unshift(Array(BOARD_WIDTH).fill(0))
        this.cameras.main.flash(180, 150, 80, 255)
        this._showLabel('비전 폭발', 0xaa66ff, 1100, 3)
        sound.skillUse()
        break
      }
      case 'summon_aid': {
        // 소환수 지원 — 다음 3개 블록을 직선(I) 블록으로 교체
        if (isPlayer && this._playerQueue) {
          const makeI = () => ({ ...PIECES.I, name: 'I', key: 'I', _rotIdx: 0,
                                 shape: PIECES.I.shape.map(r => [...r]) })
          for (let i = 0; i < Math.min(3, this._playerQueue.length); i++) {
            this._playerQueue[i] = makeI()
          }
          this._showLabel('소환수 지원', 0x66ddcc, 1100, 2)
          sound.skillUse()
        }
        break
      }
      case 'scramble_board': tgtBoard.scrambleColors(); this.cameras.main.shake(300, 0.008); break
      case 'block_skills': if (!isPlayer) this.skillManager.applyBlockSkills(5); break
      case 'mirror_board': tgtBoard.mirrorBoard(); this.cameras.main.shake(200, 0.005); break
      case 'preview_extend':
        this._previewExtended = true
        this.time.delayedCall(10000, () => { this._previewExtended = false }); break
    }
  }

  // ── 보스 ─────────────────────────────────────────────
  _dealBossDamage(amount) {
    this.bossHp = Math.max(0, this.bossHp - amount)
    this._updateBossHpUI()
    const hpPerPhase = Math.floor(this.bossMaxHp / this.phaseCount)
    const threshold  = this.bossMaxHp - hpPerPhase * this.currentPhase
    if (this.bossHp <= threshold && this.currentPhase < this.phaseCount) {
      this.currentPhase++; this._onPhaseChange()
    }
    if (this.bossHp <= 0) this._endBattle(true)
  }


  _updateEnemyDialogue(delta) {
    if (!this._needsEnemy() || this.gameOver) return
    this._enemyDialogueTimer += delta
    if (this._enemyDialogueTimer < this._enemyDialogueCooldown) return
    this._enemyDialogueTimer = 0

    const pool = this.isBoss ? BOSS_DIALOGUES : ENEMY_DIALOGUES
    // 보스 HP 기반 상황 선택
    let situation = 'player_attack'
    if (this.isBoss && this.bossHp && this.bossMaxHp) {
      const hpRatio = this.bossHp / this.bossMaxHp
      if (hpRatio < 0.3 && !this._dialogueShown.has('near_death')) {
        situation = 'near_death'
        this._dialogueShown.add('near_death')
      }
    }
    const dialogues = pool[situation] ?? ENEMY_DIALOGUES.player_attack
    const text = dialogues[Math.floor(Math.random() * dialogues.length)]
    this._showEnemyDialogue(text)
    // 다음 대사까지 8~18초 랜덤
    this._enemyDialogueCooldown = 8000 + Math.random() * 10000
  }

  _showEnemyDialogue(text) {
    const cx = ENEMY_CX
    const cy = BOARD_OY - 12
    const bubble = this.add.text(cx, cy, `"${text}"`, {
      fontFamily: '"Noto Sans KR"',
      fontSize: '11px',
      fill: this.isBoss ? '#ff6688' : '#ffaa44',
      stroke: '#000000',
      strokeThickness: 2.5,
      wordWrap: { width: 180 },
      align: 'center',
    }).setOrigin(0.5, 1).setDepth(18)

    this.tweens.add({
      targets: bubble,
      alpha: 0, y: cy - 30,
      duration: 2800, ease: 'Power2', delay: 2000,
      onComplete: () => bubble.destroy(),
    })
  }

  _onPhaseChange() {
    this.cameras.main.shake(700, 0.03)
    this.ai.escalate(this.currentPhase)
    // 페이즈 전환 대사
    const pool = this.isBoss ? BOSS_DIALOGUES : ENEMY_DIALOGUES
    const dialogues = pool.phase_change ?? ENEMY_DIALOGUES.battle_start
    const text = dialogues[Math.floor(Math.random() * dialogues.length)]
    this.time.delayedCall(400, () => this._showEnemyDialogue(text))
    this.skillManager.unlockEnemySkillsForPhase(this.bossAllSkills, this.currentPhase)
    sound.phaseChange()
    // 페이즈에 해당하는 보스 고유 필드 이벤트 발동 (보스가 점점 강해짐)
    const phaseEvent = this._bossPhaseEvents?.[this.currentPhase - 1]
    if (phaseEvent) {
      this.time.delayedCall(900, () => {
        if (!this.gameOver) this.fieldEvents?.trigger(phaseEvent)
      })
    }
    this.tweens.add({ targets: this.charGfx, alpha: 0.2, duration: 100, yoyo: true, repeat: 5 })
    const txt = this.add.text(SCENE_W / 2, SCENE_H / 2 - 50,
      `⚠ PHASE ${this.currentPhase}`,
      { fontSize: '44px', fill: '#ff1133', fontFamily: '"JetBrains Mono"', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(30)
    this.tweens.add({ targets: txt, alpha: 0, y: txt.y - 80, duration: 2200, ease: 'Power2',
      onComplete: () => txt.destroy() })
  }

  // ── 전투 종료 ────────────────────────────────────────
  _endBattle(win) {
    if (this.gameOver) return
    // 성기사 패시브: 첫 번째 패배 시 HP 30으로 부활
    if (!win && this._reviveAvailable) {
      this._reviveAvailable = false
      this._showLabel('✦ 부활! ✦', 0xffd700, 2000)
      this.cameras.main.flash(500, 255, 215, 0, true)
      this.playerBoard.reset()
      this.playerDropInterval = this._baseDropInterval
      // 부활 시 상태 완전 초기화 (즉시 재게임오버/가비지 폭탄 방지)
      this._garbageQueue = []
      this._updateGarbageWarning()
      this._grounded   = false
      this._lockTimer  = 0
      this._lockResets = 0
      this.playerDropTimer = 0
      this._holdUsed   = false
      this.spawnPlayerPiece()
      sound.levelUp()
      return   // 게임 계속
    }
    this.gameOver = true

    if (win) sound.victory(); else sound.defeat()
    sound.stopBGM()

    this.add.rectangle(SCENE_W / 2, SCENE_H / 2, SCENE_W, SCENE_H, 0x000000, 0.75).setDepth(25)

    const resultStr = {
      [GOALS.VERSUS]:    win ? '✦ 승리 ✦' : '✕ 패배 ✕',
      [GOALS.SURVIVAL]:  win ? '✦ 생존 ✦'  : '✕ 탈락 ✕',
      [GOALS.LINE_RACE]: win ? '✦ 선착 ✦'  : '✕ 패배 ✕',
      [GOALS.SCORE]:     `💎 ${this.score.toLocaleString()}점`,
      [GOALS.ENDLESS]:   `🏆 Lv.${this._endlessLevel} · ${this.score.toLocaleString()}점`,
    }[this.goal] ?? (win ? '✦ 승리 ✦' : '✕ 패배 ✕')

    this.add.text(SCENE_W / 2, SCENE_H / 2 - 30, resultStr,
      { fontSize: '52px', fill: win ? '#44ff99' : '#ff4466', fontFamily: '"Cinzel"', fontStyle: 'bold' }
    ).setOrigin(0.5).setDepth(26)

    const sub = `${this.totalLinesCleared}줄  ·  ${this.score.toLocaleString()}pt  ·  ${Math.floor(this.elapsedSec)}초`
    this.add.text(SCENE_W / 2, SCENE_H / 2 + 32, sub,
      { fontSize: '14px', fill: '#6060a0', fontFamily: '"JetBrains Mono"' }
    ).setOrigin(0.5).setDepth(26)

    this.time.delayedCall(2400, () => this.onBattleEnd({
      win, goal: this.goal,
      time_taken:    Math.floor(this.elapsedSec),
      boss_id:       this.context.boss_id ?? null,
      lines_cleared: this.totalLinesCleared,
      score:         this.score,
      endless_level: this._endlessLevel,
      detailed_stats: { ...this._stats },
    }))
  }

  // ── 렌더링 ───────────────────────────────────────────
  _draw() {
    this.gfx.clear()
    const previewN = (this._previewExtended ? PREVIEW_COUNT + 2 : PREVIEW_COUNT)
                     + (CLASSES[this.classId]?.passives?.extraPreview ?? 0)
    this._drawBoard(this.playerBoard, PLAYER_OX, this.currentPiece, this.pieceX, this.pieceY)
    if (this._needsEnemy())
      this._drawBoard(this.enemyBoard, ENEMY_OX, this.enemyPiece, this.enemyX, this.enemyY)
    this._drawPreview(previewN)
    this._drawHold()
  }

  _drawBoard(board, ox, activePiece, px, py) {
    this.gfx.fillStyle(0x06061a, 1)
    this.gfx.fillRect(ox, BOARD_OY, BOARD_W_PX, BOARD_H_PX)

    this.gfx.lineStyle(0.35, 0x141434, 0.4)
    for (let y = 0; y <= BOARD_HEIGHT; y++)
      this.gfx.lineBetween(ox, BOARD_OY + y * CELL_SIZE, ox + BOARD_W_PX, BOARD_OY + y * CELL_SIZE)
    for (let x = 0; x <= BOARD_WIDTH; x++)
      this.gfx.lineBetween(ox + x * CELL_SIZE, BOARD_OY, ox + x * CELL_SIZE, BOARD_OY + BOARD_H_PX)

    // 위험 경고 (높이가 15 이상이면 상단 빨간 글로우)
    const { maxHeight } = board.getStats()
    if (maxHeight >= 16 && ox === PLAYER_OX) {
      const dangerAlpha = Math.min(0.4, (maxHeight - 15) * 0.13)
      this.gfx.fillStyle(0xff1133, dangerAlpha)
      this.gfx.fillRect(ox, BOARD_OY, BOARD_W_PX, BOARD_H_PX * 0.35)
    }

    // 블록
    for (let y = 0; y < BOARD_HEIGHT; y++)
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const color = board.grid[y][x]
        if (color) this._drawCell(ox + x * CELL_SIZE, BOARD_OY + y * CELL_SIZE, color)
      }

    // 보더
    this.gfx.lineStyle(1.5, 0x2a2a5a, 1)
    this.gfx.strokeRect(ox, BOARD_OY, BOARD_W_PX, BOARD_H_PX)

    // 암흑
    if (ox === PLAYER_OX && this.fieldEvents?.darknessActive) {
      this.gfx.fillStyle(0x000000, 0.88)
      this.gfx.fillRect(ox, BOARD_OY + BOARD_H_PX / 2, BOARD_W_PX, BOARD_H_PX / 2)
    }

    if (!activePiece) return

    // 고스트
    let ghostY = py
    while (board.isValid(activePiece, px, ghostY + 1)) ghostY++
    if (ghostY !== py) {
      for (let y = 0; y < activePiece.shape.length; y++)
        for (let x = 0; x < activePiece.shape[y].length; x++) {
          if (!activePiece.shape[y][x] || ghostY + y < 0) continue
          this._drawCell(ox + (px + x) * CELL_SIZE, BOARD_OY + (ghostY + y) * CELL_SIZE, activePiece.color, 0.18)
        }
    }

    // 실제 피스
    for (let y = 0; y < activePiece.shape.length; y++)
      for (let x = 0; x < activePiece.shape[y].length; x++) {
        if (!activePiece.shape[y][x] || py + y < 0) continue
        this._drawCell(ox + (px + x) * CELL_SIZE, BOARD_OY + (py + y) * CELL_SIZE, activePiece.color)
      }
  }

  _drawCell(px, py, color, alpha = 1) {
    const p = 1
    this.gfx.fillStyle(color, alpha * 0.9)
    this.gfx.fillRect(px + p, py + p, CELL_SIZE - p * 2, CELL_SIZE - p * 2)
    if (alpha > 0.5) {
      this.gfx.fillStyle(0xffffff, 0.16)
      this.gfx.fillRect(px + p, py + p, CELL_SIZE - p * 2, 3)
      this.gfx.fillRect(px + p, py + p, 3, CELL_SIZE - p * 2)
      // 하단 그림자
      this.gfx.fillStyle(0x000000, 0.2)
      this.gfx.fillRect(px + p, py + CELL_SIZE - 3, CELL_SIZE - p * 2, 2)
    }
  }

  _drawPreview(count) {
    if (!this._playerQueue) return
    const ox    = PREVIEW_OX + 2
    const cellS = 17
    this.gfx.fillStyle(0x06061a, 0.95)
    this.gfx.fillRect(PREVIEW_OX, BOARD_OY, PREVIEW_W, count * cellS * 4 + 10)
    this.gfx.lineStyle(1, 0x1a1a3a, 0.7)
    this.gfx.strokeRect(PREVIEW_OX, BOARD_OY, PREVIEW_W, count * cellS * 4 + 10)

    for (let i = 0; i < Math.min(count, this._playerQueue.length); i++) {
      const piece = this._playerQueue[i]
      const oy    = BOARD_OY + i * cellS * 4 + 8
      const pw    = piece.shape[0].length * cellS
      const startX = PREVIEW_OX + (PREVIEW_W - pw) / 2
      for (let y = 0; y < piece.shape.length; y++)
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (!piece.shape[y][x]) continue
          this.gfx.fillStyle(piece.color, i === 0 ? 0.95 : 0.3)
          this.gfx.fillRect(startX + x * cellS, oy + y * cellS, cellS - 2, cellS - 2)
        }
    }
  }

  _drawHold() {
    const hx = PLAYER_OX - PREVIEW_W - 4
    const cellS = 17
    this.gfx.fillStyle(0x06061a, 0.95)
    this.gfx.fillRect(hx, BOARD_OY, PREVIEW_W, cellS * 4 + 10)
    this.gfx.lineStyle(1, this._holdUsed ? 0x111122 : 0x1a1a3a, 0.7)
    this.gfx.strokeRect(hx, BOARD_OY, PREVIEW_W, cellS * 4 + 10)

    if (this._holdPiece) {
      const piece = this._holdPiece
      const pw    = piece.shape[0].length * cellS
      const startX = hx + (PREVIEW_W - pw) / 2
      const oy    = BOARD_OY + 8
      for (let y = 0; y < piece.shape.length; y++)
        for (let x = 0; x < piece.shape[y].length; x++) {
          if (!piece.shape[y][x]) continue
          this.gfx.fillStyle(piece.color, this._holdUsed ? 0.25 : 0.9)
          this.gfx.fillRect(startX + x * cellS, oy + y * cellS, cellS - 2, cellS - 2)
        }
    }
  }

  _showScorePopup(score) {
    const cx = PLAYER_OX + BOARD_W_PX / 2
    const cy = BOARD_OY + BOARD_H_PX * 0.3
    const color = score >= 800 ? '#ffd700' : score >= 300 ? '#aa88ff' : '#44ff99'
    const txt = this.add.text(cx, cy,
      `+${score.toLocaleString()}`,
      { fontFamily: '"JetBrains Mono"', fontSize: '18px', fontStyle: 'bold',
        fill: color, stroke: '#000000', strokeThickness: 3 }
    ).setOrigin(0.5).setDepth(22)
    this.tweens.add({
      targets: txt, alpha: 0, y: cy - 60, scaleX: 1.3, scaleY: 1.3,
      duration: 1100, ease: 'Power3',
      onComplete: () => txt.destroy(),
    })
  }

  _flashBoard(isPlayerTarget) {
    const ox = isPlayerTarget ? PLAYER_OX : ENEMY_OX
    const flash = this.add.rectangle(
      ox + BOARD_W_PX / 2, BOARD_OY + BOARD_H_PX / 2,
      BOARD_W_PX, BOARD_H_PX, 0xff4466, 0.38
    ).setDepth(10)
    this.tweens.add({ targets: flash, alpha: 0, duration: 280, onComplete: () => flash.destroy() })
  }

  _showLabel(text, color = 0x44ff99, durationMs = 1200, intensity = 1) {
    const hex = `#${color.toString(16).padStart(6,'0')}`
    const baseSize = 16 + Math.min(intensity, 4) * 4   // 강도에 따라 16~32px
    const label = this.add.text(
      PLAYER_OX + BOARD_W_PX / 2, BOARD_OY + BOARD_H_PX * 0.4,
      text,
      { fontFamily: '"JetBrains Mono"', fontSize: `${baseSize}px`, fontStyle: 'bold',
        fill: hex, stroke: '#000000', strokeThickness: 3 + intensity }
    ).setOrigin(0.5).setDepth(20).setScale(0.3)

    // 스케일 펀치 (튀어나왔다가 안정)
    this.tweens.add({
      targets: label, scale: 1, duration: 180, ease: 'Back.easeOut',
    })
    this.tweens.add({
      targets: label, alpha: 0, y: label.y - 50, duration: durationMs,
      delay: 200, ease: 'Power2', onComplete: () => label.destroy(),
    })

    // 강한 클리어는 화면 흔들림
    if (intensity >= 2) {
      this.cameras.main.shake(140, 0.004 * intensity)
    }
  }

  // 콤보 카운터 — 보드 옆에 크게 표시
  _showCombo(combo) {
    const x = PLAYER_OX + BOARD_W_PX + 14
    const y = BOARD_OY + BOARD_H_PX * 0.35
    const color = combo >= 6 ? '#ffd700' : combo >= 4 ? '#ff8800' : '#44ff99'
    const t = this.add.text(x, y, `${combo}\nCOMBO`,
      { fontFamily: '"JetBrains Mono"', fontSize: '20px', fontStyle: 'bold',
        fill: color, stroke: '#000000', strokeThickness: 3, align: 'center' })
      .setOrigin(0, 0.5).setDepth(21).setScale(0.4)
    this.tweens.add({ targets: t, scale: 1, duration: 150, ease: 'Back.easeOut' })
    this.tweens.add({
      targets: t, alpha: 0, x: x + 10, duration: 900, delay: 350,
      ease: 'Power2', onComplete: () => t.destroy(),
    })
  }

  // ── UI 빌드 ──────────────────────────────────────────
  _buildUI() {
    const mono = { fontFamily: '"JetBrains Mono"' }
    const sans = { fontFamily: '"Noto Sans KR"' }
    const skillY = BOARD_OY + BOARD_H_PX + 14

    // 전투 목표
    this._progressText = this.add.text(SCENE_W / 2, BOARD_OY - 18, this._goalLabel(),
      { ...mono, fontSize: '12px', fill: '#2a2a6a' }).setOrigin(0.5)

    // 홀드 레이블
    const hx = PLAYER_OX - PREVIEW_W - 4
    this.add.text(hx + PREVIEW_W / 2, BOARD_OY - 14, 'HOLD [C]',
      { ...mono, fontSize: '8px', fill: '#333355' }).setOrigin(0.5)

    // 스킬 게이지
    this.add.text(PLAYER_OX, skillY - 12, 'SKILL', { ...mono, fontSize: '9px', fill: '#444466' })
    this.add.rectangle(PLAYER_OX, skillY, BOARD_W_PX, 7, 0x111128).setOrigin(0, 0.5)
    this._gaugeBar = this.add.rectangle(PLAYER_OX, skillY, 0, 7, 0x7c5cfc).setOrigin(0, 0.5)
    this._gaugeNum = this.add.text(PLAYER_OX + BOARD_W_PX + 4, skillY - 5, '0%',
      { ...mono, fontSize: '9px', fill: '#444466' })
    this._blockedText = this.add.text(PLAYER_OX + BOARD_W_PX / 2, skillY + 10, '🔒 봉인',
      { ...mono, fontSize: '10px', fill: '#ff4466' }).setOrigin(0.5).setVisible(false)

    // 점수
    this._scoreText = this.add.text(ENEMY_OX + BOARD_W_PX, skillY,
      '0pt', { ...mono, fontSize: '14px', fill: '#44ff99' }).setOrigin(1, 0.5)

    // 대기 가비지 경고 (플레이어 보드 우측 상단)
    this._garbageWarnText = this.add.text(PLAYER_OX + BOARD_W_PX - 2, BOARD_OY + 2, '',
      { ...mono, fontSize: '13px', fill: '#ff4466', fontStyle: 'bold' })
      .setOrigin(1, 0).setDepth(15).setVisible(false)

    // 스킬 버튼
    this._skillRects   = []
    this._skillLabels  = []
    this._skillCdTexts = []

    const SLOT_KEYS = ['Q', 'W', 'E', 'R', 'A']
    this.skillManager.playerSkills.forEach((skill, i) => {
      const bx = PLAYER_OX + i * 62
      const by = skillY + 12
      const bg = this.add.rectangle(bx + 28, by + 20, 56, 38, 0x0d0d20).setOrigin(0.5)
      bg.setStrokeStyle(1, 0x222244)
      this.add.text(bx + 28, by + 6, `[${SLOT_KEYS[i] ?? '?'}]`,
        { ...mono, fontSize: '9px', fill: '#333355' }).setOrigin(0.5)
      const nameT = this.add.text(bx + 28, by + 18, skill.name,
        { ...sans, fontSize: '8px', fill: '#ccccee' }).setOrigin(0.5)
      const costT = this.add.text(bx + 28, by + 30, `${skill.cost}G`,
        { ...mono, fontSize: '8px', fill: '#7c5cfc' }).setOrigin(0.5)
      const cdT = this.add.text(bx + 28, by + 30, '',
        { ...mono, fontSize: '10px', fill: '#ff4466' }).setOrigin(0.5).setVisible(false)
      this._skillRects.push(bg)
      this._skillLabels.push({ nameT, costT })
      this._skillCdTexts.push(cdT)
    })

    // NEXT 레이블
    this.add.text(PREVIEW_OX + PREVIEW_W / 2, BOARD_OY - 14, 'NEXT',
      { ...mono, fontSize: '8px', fill: '#333355' }).setOrigin(0.5)
  }

  _goalLabel() {
    return {
      [GOALS.VERSUS]:    '⚔ 섬멸전',
      [GOALS.SURVIVAL]:  `⏱ ${this.durationSec}초 생존`,
      [GOALS.LINE_RACE]: `🏁 ${this.targetLines}줄 레이스`,
      [GOALS.SCORE]:     `💎 ${this.durationSec}초 점수전`,
    }[this.goal] ?? ''
  }

  _updateDynamicUI() {
    const ratio = this.skillManager.playerGauge / this.skillManager.maxGauge
    this._gaugeBar?.setSize(BOARD_W_PX * ratio, 7)
    this._gaugeBar?.setFillStyle(ratio < 0.35 ? 0x444466 : ratio < 0.75 ? 0x7c5cfc : 0xaa88ff)
    this._gaugeNum?.setText(`${Math.floor(ratio * 100)}%`)
    this._blockedText?.setVisible(this.skillManager.skillBlocked)
    this._scoreText?.setText(`${this.score.toLocaleString()}pt`)

    if (this.goal === GOALS.SURVIVAL || this.goal === GOALS.SCORE) {
      const rem = Math.max(0, this.durationSec - Math.floor(this.elapsedSec))
      this._progressText?.setText(`${this._goalLabel()}  ⏱ ${rem}s`)
      if (rem <= 10) this._progressText?.setColor('#ff4466')
    } else if (this.goal === GOALS.LINE_RACE) {
      this._progressText?.setText(`${this._goalLabel()}  ${this.totalLinesCleared}/${this.targetLines}`)
    }

    this._updateSkillUI()
  }

  _updateSkillUI() {
    this.skillManager.playerSkills.forEach((skill, i) => {
      const bg  = this._skillRects[i]
      const lbl = this._skillLabels[i]
      const cdT = this._skillCdTexts[i]
      if (!bg) return
      const ready = skill.cooldownLeft <= 0 &&
                    this.skillManager.playerGauge >= skill.cost &&
                    !this.skillManager.skillBlocked
      bg.setFillStyle(ready ? 0x1a1640 : 0x0d0d20)
      bg.setStrokeStyle(1.5, ready ? 0x6644cc : 0x1a1a3a)
      lbl?.nameT?.setColor(ready ? '#ddddff' : '#333355')
      lbl?.costT?.setVisible(skill.cooldownLeft <= 0)
      cdT?.setVisible(skill.cooldownLeft > 0)
      if (skill.cooldownLeft > 0) cdT?.setText(`${Math.ceil(skill.cooldownLeft)}s`)
    })
  }

  _updateBossHpUI() {
    if (!this._bossHpBar || !this.bossMaxHp) return
    const ratio = this.bossHp / this.bossMaxHp
    this._bossHpBar.setSize(BOARD_W_PX * ratio, 4)
    this._bossHpBar.setFillStyle(ratio > 0.6 ? 0xff1133 : ratio > 0.3 ? 0xff8800 : 0xff0000)
    this._bossHpText?.setText(`${this.bossHp}`)
    this._bossPhaseText?.setText(`Phase ${this.currentPhase}/${this.phaseCount}`)
  }
}
