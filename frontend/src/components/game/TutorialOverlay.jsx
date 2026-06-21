/**
 * 첫 전투 진입 시 1회 표시되는 조작법 튜토리얼
 * localStorage로 본 적 있으면 스킵
 */
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bq_tutorial_seen'

const STEPS = [
  {
    icon: '🎮',
    title: '테트리스 배틀',
    desc: '블록을 쌓아 줄을 완성하세요. 상대보다 빠르고 효율적으로 라인을 클리어하면 승리합니다.',
    keys: null,
  },
  {
    icon: '⌨️',
    title: '기본 조작 (PC)',
    desc: '키보드로 블록을 조작합니다.',
    keys: [
      ['← →', '좌우 이동'],
      ['↑ 또는 Z', '회전'],
      ['↓', '소프트 드롭 (빠르게)'],
      ['Space', '하드 드롭 (즉시 낙하)'],
      ['C', '홀드 (블록 보관)'],
    ],
  },
  {
    icon: '📱',
    title: '모바일 조작',
    desc: '화면 하단의 버튼으로 조작합니다. 좌우 버튼을 길게 누르면 연속 이동됩니다.',
    keys: null,
  },
  {
    icon: '✦',
    title: '스킬 사용',
    desc: '라인을 클리어하면 게이지가 충전됩니다. 가득 차면 Q/W/E/R/A 키 또는 하단 스킬 버튼으로 강력한 스킬을 사용하세요.',
    keys: [
      ['게이지', '라인 클리어로 충전'],
      ['Q W E R A', '스킬 발동'],
    ],
  },
  {
    icon: '🏆',
    title: '고급 테크닉',
    desc: 'T-Spin, 4줄 동시 클리어(테트리스), 콤보로 더 큰 보너스를 노리세요. 상대를 압박할 수 있습니다.',
    keys: [
      ['T-Spin', 'T 블록 회전 끼워넣기'],
      ['테트리스', '4줄 동시 클리어'],
      ['콤보', '연속 클리어'],
    ],
  },
]

export function hasTutorialSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === '1' }
  catch { return false }
}

export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    onComplete?.()
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isLast) finish()
        else setStep(s => s + 1)
      } else if (e.key === 'Escape') {
        finish()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, isLast])

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="panel max-w-md w-full p-7 animate-scale-in">
        {/* 진행 표시 */}
        <div className="flex gap-1.5 mb-6 justify-center">
          {STEPS.map((_, i) => (
            <div key={i}
              className={`h-1 rounded-full transition-all duration-300
                ${i === step ? 'w-8 bg-brand-accent' : i < step ? 'w-4 bg-brand-accent/40' : 'w-4 bg-brand-border'}`} />
          ))}
        </div>

        {/* 내용 */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4 animate-float">{current.icon}</div>
          <h2 className="font-display text-2xl text-brand-text mb-3">{current.title}</h2>
          <p className="text-brand-muted font-body text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* 키 안내 */}
        {current.keys && (
          <div className="space-y-2 mb-6 bg-brand-panelLight rounded-xl p-4">
            {current.keys.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <kbd className="badge px-2 py-1 text-brand-accent font-mono text-xs">{k}</kbd>
                <span className="text-brand-muted font-body text-xs">{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="btn-ghost px-4 py-2.5 text-sm">이전</button>
          )}
          <button onClick={() => isLast ? finish() : setStep(s => s + 1)}
            className="btn-primary flex-1 py-2.5 font-display tracking-widest text-sm">
            {isLast ? '시작하기' : '다음'}
          </button>
        </div>

        <button onClick={finish}
          className="w-full text-center text-brand-muted text-xs font-mono mt-3 hover:text-brand-text transition-colors">
          건너뛰기 (ESC)
        </button>
      </div>
    </div>
  )
}
