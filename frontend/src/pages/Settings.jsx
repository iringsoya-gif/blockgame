import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useAuth } from '../hooks/useAuth'
import { sound } from '../lib/sound'
import { showToast } from '../components/game/Toast'

const KEY_LABELS = {
  move_left:   '좌측 이동',  move_right:   '우측 이동',
  rotate_cw:   '시계방향 회전', rotate_ccw: '반시계 회전',
  hard_drop:   '즉시 낙하',  hold:         '홀드',
  skill_1:     '스킬 1',     skill_2:      '스킬 2',
  skill_3:     '스킬 3',     skill_4:      '스킬 4',
  skill_5:     '스킬 5',     pause:        '일시정지',
}

const DEFAULT_KEYS = {
  move_left: '←', move_right: '→', rotate_cw: '↑', rotate_ccw: 'Z',
  hard_drop: 'Space', hold: 'C',
  skill_1: 'Q', skill_2: 'W', skill_3: 'E', skill_4: 'R', skill_5: 'A',
  pause: 'Esc',
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-brand-text text-sm font-body">{label}</div>
        {desc && <div className="text-brand-muted text-xs font-body mt-0.5">{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all duration-200 relative shrink-0 ml-4
          ${value ? 'bg-brand-accent' : 'bg-brand-border'}`}>
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200
          ${value ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

function SliderRow({ label, value, onChange, min = 0, max = 1, step = 0.05 }) {
  return (
    <div className="py-3 space-y-2">
      <div className="flex justify-between">
        <span className="text-brand-text text-sm font-body">{label}</span>
        <span className="text-brand-muted font-mono text-xs">{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none bg-brand-border cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-accent
                   [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}

export default function Settings() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [sfxVol,  setSfxVol]  = useState(sound.sfxVol)
  const [bgmVol,  setBgmVol]  = useState(sound.bgmVol)
  const [soundOn, setSoundOn] = useState(sound.enabled)
  const [showFPS, setShowFPS] = useState(
    localStorage.getItem('bq_show_fps') === 'true'
  )
  const [highContrast, setHighContrast] = useState(
    localStorage.getItem('bq_high_contrast') === 'true'
  )

  const SECTIONS = [
    {
      title: '🔊 사운드',
      rows: [
        <Toggle key="sound" label="사운드 활성화" value={soundOn}
          onChange={v => { setSoundOn(v); sound.setEnabled(v) }} />,
        <SliderRow key="sfx" label="효과음 볼륨" value={sfxVol}
          onChange={v => { setSfxVol(v); sound.setSfxVol(v) }} />,
        <SliderRow key="bgm" label="배경음악 볼륨" value={bgmVol}
          onChange={v => { setBgmVol(v); sound.setBgmVol(v) }} />,
        <div key="test" className="py-2">
          <button onClick={() => sound.clearLine(4)} className="btn-ghost text-xs px-4 py-2">
            🔊 사운드 테스트
          </button>
        </div>,
      ],
    },
    {
      title: '🖥 화면',
      rows: [
        <Toggle key="fps" label="FPS 표시" desc="화면 우측 상단에 프레임 수를 표시합니다"
          value={showFPS} onChange={v => { setShowFPS(v); localStorage.setItem('bq_show_fps', v) }} />,
        <Toggle key="hc" label="고대비 모드" desc="블록 색상의 대비를 높여 구분을 쉽게 합니다"
          value={highContrast} onChange={v => { setHighContrast(v); localStorage.setItem('bq_high_contrast', v) }} />,
      ],
    },
    {
      title: '⌨ 키 설정 (기본값)',
      rows: [
        <div key="keys" className="py-2 grid grid-cols-2 gap-x-6 gap-y-2">
          {Object.entries(KEY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-brand-border/30">
              <span className="text-brand-textMuted text-xs font-body">{label}</span>
              <kbd className="px-2 py-0.5 bg-brand-panelLight border border-brand-border rounded
                             font-mono text-xs text-brand-accent">
                {DEFAULT_KEYS[key]}
              </kbd>
            </div>
          ))}
        </div>,
        <p key="note" className="text-brand-muted text-2xs font-mono py-2">
          * 키 리매핑은 다음 버전에서 지원 예정입니다
        </p>,
      ],
    },
    {
      title: '💾 데이터',
      rows: [
        <div key="clear" className="py-3 space-y-3">
          <button
            onClick={() => {
              if (confirm('모든 게임 데이터를 초기화하시겠습니까? 되돌릴 수 없습니다.')) {
                localStorage.clear()
                showToast('모든 데이터가 초기화되었습니다', 'warn')
                navigate('/')
              }
            }}
            className="btn-ghost text-xs px-4 py-2 hover:text-brand-danger hover:border-brand-danger/40">
            🗑 로컬 데이터 초기화
          </button>
          <p className="text-brand-muted text-2xs font-body">
            서버 데이터(런 기록, 구독)는 초기화되지 않습니다
          </p>
        </div>,
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl text-brand-text tracking-widest mb-1">설정</h1>
          <p className="text-brand-muted font-mono text-sm">게임 환경을 조정하세요</p>
        </div>

        {SECTIONS.map((section, i) => (
          <div key={section.title} className="panel overflow-hidden animate-slide-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
            <div className="px-5 py-3 border-b border-brand-border bg-brand-panelLight">
              <h2 className="font-display text-sm text-brand-text tracking-wide">{section.title}</h2>
            </div>
            <div className="px-5 divide-y divide-brand-border/40">
              {section.rows}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
