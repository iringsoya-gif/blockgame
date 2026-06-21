/**
 * Web Audio API 기반 프로시저럴 사운드 시스템
 * 외부 파일 없이 완전 생성
 */
class SoundEngine {
  constructor() {
    this._ctx         = null
    this._masterGain  = null
    this._sfxGain     = null
    this._bgmGain     = null
    this._bgmInterval = null
    this._bgmType     = null   // 'story' | 'battle' | 'boss'

    try {
      const saved     = JSON.parse(localStorage.getItem('bq_sound') ?? '{}')
      this._enabled   = saved.enabled ?? true
      this._sfxVol    = saved.sfxVol  ?? 0.65
      this._bgmVol    = saved.bgmVol  ?? 0.3
    } catch {
      this._enabled   = true
      this._sfxVol    = 0.65
      this._bgmVol    = 0.3
    }
  }

  _init() {
    if (this._ctx) return
    this._ctx        = new (window.AudioContext || window.webkitAudioContext)()
    this._masterGain = this._ctx.createGain()
    this._sfxGain    = this._ctx.createGain()
    this._bgmGain    = this._ctx.createGain()
    this._masterGain.connect(this._ctx.destination)
    this._sfxGain.connect(this._masterGain)
    this._bgmGain.connect(this._masterGain)
    this._masterGain.gain.value = this._enabled ? 1 : 0
    this._sfxGain.gain.value    = this._sfxVol
    this._bgmGain.gain.value    = this._bgmVol
  }

  _save() {
    localStorage.setItem('bq_sound', JSON.stringify({
      enabled: this._enabled, sfxVol: this._sfxVol, bgmVol: this._bgmVol,
    }))
  }

  // ── 코어 생성기 ──────────────────────────────────
  _osc(freq, dur, type = 'sine', vol = 0.4, delay = 0, bend = 0) {
    if (!this._enabled) return
    this._init()
    const ctx  = this._ctx
    const now  = ctx.currentTime + delay
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(this._sfxGain)
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (bend) osc.frequency.exponentialRampToValueAtTime(freq * bend, now + dur)
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.start(now)
    osc.stop(now + dur + 0.01)
  }

  _chord(freqs, dur, type = 'sine', vol = 0.3, delay = 0) {
    freqs.forEach(f => this._osc(f, dur, type, vol, delay))
  }

  _noise(dur, vol = 0.3, delay = 0, lowpass = 4000) {
    if (!this._enabled) return
    this._init()
    const ctx    = this._ctx
    const now    = ctx.currentTime + delay
    const size   = Math.ceil(ctx.sampleRate * dur)
    const buf    = ctx.createBuffer(1, size, ctx.sampleRate)
    const data   = buf.getChannelData(0)
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
    const src    = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain   = ctx.createGain()
    src.buffer   = buf
    filter.type  = 'lowpass'
    filter.frequency.value = lowpass
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this._sfxGain)
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    src.start(now)
  }

  // ── SFX ─────────────────────────────────────────
  move()     { this._osc(300, 0.04, 'square', 0.06) }
  rotate()   { this._osc(380, 0.05, 'square', 0.09); this._osc(500, 0.04, 'square', 0.06, 0.03) }

  place() {
    this._noise(0.06, 0.15)
    this._osc(160, 0.1, 'square', 0.1)
  }

  hardDrop() {
    this._noise(0.1, 0.28, 0, 2000)
    this._osc(130, 0.12, 'square', 0.14)
    this._osc(110, 0.1,  'square', 0.1, 0.04)
  }

  clearLine(count = 1) {
    const scales = [
      [523],
      [523, 659],
      [523, 659, 784],
      [523, 659, 784, 1047],
    ]
    const notes = scales[Math.min(count, 4) - 1] ?? [523]
    notes.forEach((f, i) => this._osc(f, 0.2, 'sine', 0.32, i * 0.07))
    if (count >= 4) this.time.delayedCall ? null : setTimeout(() => this.tetris(), 300)
  }

  tetris() {
    [784, 988, 1175, 1319, 1568].forEach((f, i) =>
      this._osc(f, 0.25, 'sine', 0.42, i * 0.09))
  }

  combo(count) {
    const f = 350 + count * 60
    this._osc(f,       0.12, 'triangle', 0.38)
    this._osc(f * 1.5, 0.1,  'sine',     0.22, 0.07)
    this._osc(f * 2,   0.08, 'sine',     0.16, 0.13)
  }

  tspin() {
    [440, 660, 880, 1100].forEach((f, i) =>
      this._osc(f, 0.18, 'triangle', 0.4, i * 0.05))
    this._osc(880, 0.3, 'sine', 0.3, 0.1, 0.5)
  }

  perfectClear() {
    [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) =>
      this._osc(f, 0.3, 'sine', 0.5, i * 0.07))
  }

  b2b() {
    this._osc(660, 0.1, 'square', 0.3)
    this._osc(880, 0.15, 'sine',  0.35, 0.08)
  }

  skillUse() {
    [880, 1100, 1320].forEach((f, i) => this._osc(f, 0.12, 'sine', 0.32, i * 0.06))
  }
  skillBlocked() {
    this._osc(220, 0.1, 'sawtooth', 0.28)
    this._osc(180, 0.15, 'sawtooth', 0.22, 0.06)
  }
  garbageReceive() {
    this._osc(110, 0.18, 'sawtooth', 0.3)
    this._noise(0.08, 0.18, 0.05)
  }

  levelUp() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      this._osc(f, 0.28, 'sine', 0.42, i * 0.1))
  }

  victory() {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319, 1047, 1319]
    melody.forEach((f, i) => this._osc(f, 0.28, 'sine', 0.45, i * 0.11))
  }

  defeat() {
    [440, 392, 349, 294, 247, 220].forEach((f, i) =>
      this._osc(f, 0.35, 'sawtooth', 0.3, i * 0.14))
  }

  battleStart() {
    [110, 139, 165, 220].forEach((f, i) =>
      this._osc(f, 0.2, 'sawtooth', 0.38, i * 0.07))
    this._noise(0.15, 0.3, 0.28)
  }

  bossAppear() {
    this._noise(0.35, 0.55)
    [55, 73, 110, 147].forEach((f, i) =>
      this._osc(f, 0.6, 'sawtooth', 0.55, i * 0.08))
  }

  phaseChange() {
    this._noise(0.2, 0.6)
    this._osc(440, 0.25, 'square', 0.5)
    this._osc(880, 0.3,  'square', 0.4, 0.1)
    this._osc(220, 0.4,  'sawtooth', 0.45, 0.2)
  }

  menuClick()   { this._osc(660, 0.05, 'sine', 0.18) }
  menuHover()   { this._osc(440, 0.03, 'sine', 0.07) }
  notification(type = 'info') {
    const f = { success: 660, error: 220, warn: 440, info: 550 }[type] ?? 550
    this._osc(f, 0.08, 'sine', 0.22)
    this._osc(f * 1.25, 0.12, 'sine', 0.18, 0.07)
  }

  // ── BGM ─────────────────────────────────────────
  startStoryBGM() {
    if (this._bgmType === 'story') return
    this._stopBGM()
    this._bgmType = 'story'
    if (!this._enabled) return
    this._init()
    // 조용한 아르페지오 — Am 스케일
    const notes = [220, 262, 294, 349, 392, 349, 294, 262]
    let beat = 0
    this._bgmInterval = setInterval(() => {
      if (!this._enabled) { this._stopBGM(); return }
      const f = notes[beat % notes.length]
      this._bgmOsc(f, 0.7, 'sine', 0.06)
      if (beat % 8 === 0) this._bgmOsc(110, 0.9, 'triangle', 0.04)
      beat++
    }, 450)
  }

  startBattleBGM() {
    if (this._bgmType === 'battle') return
    this._stopBGM()
    this._bgmType = 'battle'
    if (!this._enabled) return
    this._init()
    // 긴장감 있는 리듬 — 단음계
    const scale = [110, 123, 138, 165, 185, 207, 246]
    let beat = 0
    this._bgmInterval = setInterval(() => {
      if (!this._enabled) { this._stopBGM(); return }
      const f = scale[beat % scale.length]
      this._bgmOsc(f, 0.2, 'square', 0.08)
      if (beat % 4 === 0)  this._bgmNoise(0.06, 0.05)   // 킥
      if (beat % 8 === 4)  this._bgmOsc(293, 0.1, 'square', 0.04) // 스네어
      if (beat % 16 === 0) this._bgmOsc(55, 0.4, 'sawtooth', 0.07) // 베이스
      beat++
    }, 130)
  }

  startBossBGM() {
    if (this._bgmType === 'boss') return
    this._stopBGM()
    this._bgmType = 'boss'
    if (!this._enabled) return
    this._init()
    // 위협적이고 빠른 리듬
    const bass = [55, 58, 62, 55, 49, 52, 55, 58]
    let beat = 0
    this._bgmInterval = setInterval(() => {
      if (!this._enabled) { this._stopBGM(); return }
      const f = bass[beat % bass.length]
      this._bgmOsc(f, 0.18, 'sawtooth', 0.1)
      if (beat % 2 === 0)  this._bgmNoise(0.05, 0.08)
      if (beat % 4 === 2)  this._bgmOsc(f * 2, 0.1, 'square', 0.05)
      if (beat % 8 === 0)  this._bgmOsc(f * 0.5, 0.3, 'sawtooth', 0.1)
      beat++
    }, 100)
  }

  _bgmOsc(freq, dur, type, vol) {
    if (!this._ctx) return
    const now  = this._ctx.currentTime
    const osc  = this._ctx.createOscillator()
    const gain = this._ctx.createGain()
    osc.connect(gain); gain.connect(this._bgmGain)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.start(now); osc.stop(now + dur + 0.01)
  }

  _bgmNoise(dur, vol) {
    if (!this._ctx) return
    const now  = this._ctx.currentTime
    const size = Math.ceil(this._ctx.sampleRate * dur)
    const buf  = this._ctx.createBuffer(1, size, this._ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1
    const src  = this._ctx.createBufferSource()
    const gain = this._ctx.createGain()
    src.buffer = buf
    src.connect(gain); gain.connect(this._bgmGain)
    gain.gain.setValueAtTime(vol, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
    src.start(now)
  }

  _stopBGM() {
    if (this._bgmInterval) { clearInterval(this._bgmInterval); this._bgmInterval = null }
    this._bgmType = null
  }

  stopBGM() { this._stopBGM() }

  // ── 설정 ────────────────────────────────────────
  setEnabled(v) {
    this._enabled = v
    if (this._masterGain) this._masterGain.gain.value = v ? 1 : 0
    if (!v) this._stopBGM()
    this._save()
  }
  setSfxVol(v) { this._sfxVol = v; if (this._sfxGain) this._sfxGain.gain.value = v; this._save() }
  setBgmVol(v) { this._bgmVol = v; if (this._bgmGain) this._bgmGain.gain.value = v; this._save() }

  get enabled() { return this._enabled }
  get sfxVol()  { return this._sfxVol  }
  get bgmVol()  { return this._bgmVol  }
  get bgmType() { return this._bgmType }

  resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume()
  }
}

export const sound = new SoundEngine()
