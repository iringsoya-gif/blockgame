import { useState } from 'react'
import { sound } from '../../lib/sound'

export default function SoundSettings({ onClose }) {
  const [enabled, setEnabled] = useState(sound.enabled)
  const [sfxVol,  setSfxVol]  = useState(sound.sfxVol)
  const [bgmVol,  setBgmVol]  = useState(sound.bgmVol)

  const toggle = () => {
    sound.setEnabled(!enabled)
    setEnabled(!enabled)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"
      onClick={onClose}>
      <div className="panel p-6 w-80 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-lg text-brand-accent mb-5 tracking-widest">사운드 설정</h2>

        <div className="space-y-5">
          {/* 마스터 토글 */}
          <div className="flex items-center justify-between">
            <span className="text-brand-text text-sm font-body">사운드</span>
            <button onClick={toggle}
              className={`w-12 h-6 rounded-full transition-all duration-200 relative
                ${enabled ? 'bg-brand-accent' : 'bg-brand-border'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200
                ${enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* SFX 볼륨 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-brand-muted">
              <span>효과음</span>
              <span>{Math.round(sfxVol * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={sfxVol}
              onChange={e => { const v = +e.target.value; setSfxVol(v); sound.setSfxVol(v) }}
              disabled={!enabled}
              className="w-full h-1.5 rounded-full appearance-none bg-brand-border
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-accent
                         disabled:opacity-30 cursor-pointer"
            />
          </div>

          {/* BGM 볼륨 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-brand-muted">
              <span>배경음악</span>
              <span>{Math.round(bgmVol * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={bgmVol}
              onChange={e => { const v = +e.target.value; setBgmVol(v); sound.setBgmVol(v) }}
              disabled={!enabled}
              className="w-full h-1.5 rounded-full appearance-none bg-brand-border
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-accent
                         disabled:opacity-30 cursor-pointer"
            />
          </div>

          {/* 테스트 */}
          <button onClick={() => sound.clearLine(4)}
            disabled={!enabled}
            className="btn-ghost w-full text-xs py-2 disabled:opacity-30">
            🔊 테스트
          </button>
        </div>

        <button onClick={onClose} className="btn-ghost w-full mt-4 text-sm">닫기</button>
      </div>
    </div>
  )
}
