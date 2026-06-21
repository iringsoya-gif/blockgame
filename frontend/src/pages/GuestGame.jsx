/**
 * 게스트 모드 — 비로그인 1챕터 체험
 * 로그인 없이 스토리 첫 번째 선택지까지 플레이
 * 완료 후 회원가입 유도
 */
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sound } from '../lib/sound'
import { showToast } from '../components/game/Toast'

const GUEST_STORY = [
  {
    role: 'gm',
    text: '탑의 입구에 서 있습니다. 어두운 돌문 너머로 차가운 바람이 불어옵니다. 전설의 마법사 아르칸이 이 탑에 봉인된 악을 지키고 있다고 했지만, 그 마법사도 지금은 연락이 끊긴 상태입니다.',
  },
]

const GUEST_CHOICES = [
  '탑 문을 힘껏 밀어본다',
  '문 주변을 조심스럽게 살펴본다',
  '큰 소리로 안에 누가 있는지 외친다',
]

const GUEST_RESPONSES = {
  0: '문이 삐걱거리며 열립니다. 안에서 희미한 빛이 새어 나옵니다. 조심스럽게 발을 들여놓자 갑자기 바닥에서 마법진이 빛나기 시작합니다. 전투가 시작됩니다!',
  1: '문 옆에 작은 기관이 있습니다. 자세히 보니 손 모양의 홈이 있군요. 손을 갖다 대자 희미한 빛과 함께 문이 열립니다. 탑 내부가 모습을 드러냅니다.',
  2: '"누구냐!" 잠시 후 탑 꼭대기에서 목소리가 들립니다. "돌아가라... 여기는 위험하다." 하지만 그 목소리는 금방 사라지고 탑 문이 저절로 열립니다.',
}

export default function GuestGame() {
  const navigate = useNavigate()
  const [step,        setStep]        = useState(0)  // 0=intro, 1=choice, 2=battle_tease, 3=signup
  const [selectedChoice, setSelected] = useState(null)
  const [response,    setResponse]    = useState('')
  const [typing,      setTyping]      = useState(true)
  const [displayText, setDisplayText] = useState('')

  const currentText = step === 0
    ? GUEST_STORY[0].text
    : step === 2 ? response : ''

  // 타이핑 효과
  useEffect(() => {
    if (!currentText) return
    setTyping(true)
    setDisplayText('')
    let i = 0
    const id = setInterval(() => {
      i += 2
      setDisplayText(currentText.slice(0, i))
      if (i >= currentText.length) { clearInterval(id); setTyping(false) }
    }, 18)
    return () => clearInterval(id)
  }, [currentText])

  const handleChoice = useCallback((idx) => {
    setSelected(idx)
    sound.menuClick()
    setResponse(GUEST_RESPONSES[idx])
    setStep(2)
  }, [])

  // step 2 응답 타이핑이 끝나면 잠시 후 가입 유도로 전환
  useEffect(() => {
    if (step === 2 && !typing && displayText) {
      const id = setTimeout(() => setStep(3), 2500)
      return () => clearTimeout(id)
    }
  }, [step, typing, displayText])

  useEffect(() => {
    sound.startStoryBGM()
    return () => sound.stopBGM()
  }, [])

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-brand-border shrink-0">
        <button onClick={() => navigate('/')}
          className="font-display text-lg text-brand-accent tracking-widest">
          BlockQuest
        </button>
        <div className="flex items-center gap-2">
          <span className="badge text-brand-muted border-brand-border text-xs">체험판</span>
          <button onClick={() => navigate('/story-select')}
            className="btn-primary text-xs px-3 py-1.5">
            로그인 후 전체 플레이
          </button>
        </div>
      </header>

      {/* 스토리 영역 */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-2xl mx-auto w-full">

        {/* GM 텍스트 */}
        {(step === 0 || step === 2) && (
          <div className="w-full space-y-4 animate-fade-in">
            <div className="text-brand-muted font-mono text-xs">[GM]</div>
            <p className="text-brand-text font-body text-base leading-relaxed">
              {displayText}
              {typing && (
                <span className="inline-block w-0.5 h-4 bg-brand-accent ml-0.5 animate-pulse align-middle" />
              )}
            </p>
            {!typing && step === 0 && (
              <button onClick={() => setStep(1)}
                className="text-brand-muted text-xs font-mono hover:text-brand-text transition-colors">
                계속 ▶
              </button>
            )}
          </div>
        )}

        {/* 선택지 */}
        {step === 1 && (
          <div className="w-full space-y-3 animate-slide-up">
            <p className="text-brand-muted font-mono text-xs mb-4">어떻게 하시겠습니까?</p>
            {GUEST_CHOICES.map((choice, i) => (
              <button key={i}
                onClick={() => handleChoice(i)}
                className="w-full text-left panel px-5 py-4 hover:border-brand-accent/60
                           font-body text-sm text-brand-text transition-all duration-150
                           hover:text-brand-accent card-hover">
                <span className="text-brand-accent font-mono text-xs mr-3">{i + 1}.</span>
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* 회원가입 유도 */}
        {step === 3 && (
          <div className="w-full space-y-6 animate-fade-in text-center">
            <div className="panel p-6 space-y-3"
              style={{ borderColor: 'rgba(124,92,252,0.4)' }}>
              <div className="text-4xl animate-float">✦</div>
              <h2 className="font-display text-2xl text-brand-accent">체험판이 종료됩니다</h2>
              <p className="text-brand-muted font-body text-sm leading-relaxed">
                전체 스토리, 테트리스 배틀, AI 게임 마스터와의<br />
                완전한 모험을 즐기려면 무료 계정이 필요합니다
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {[
                { icon: '🗼', text: '5개 스토리' },
                { icon: '⚔', text: '테트리스 배틀' },
                { icon: '🤖', text: 'AI 게임 마스터' },
                { icon: '🏆', text: '일일 챌린지' },
                { icon: '📊', text: '글로벌 랭킹' },
                { icon: '🎯', text: '7개 클래스' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-brand-muted text-sm font-body">
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('/')}
                className="btn-primary px-8 py-3 font-display tracking-widest text-base">
                무료로 시작하기
              </button>
            </div>

            <p className="text-brand-muted font-mono text-xs">
              무료 플랜으로 망각의 탑 스토리 + 기본 클래스 3종 + 일일 챌린지 이용 가능<br />
              홈에서 Google 또는 Discord로 간편 가입하세요
            </p>
          </div>
        )}
      </main>

      {/* 진행 표시 */}
      {step < 3 && (
        <div className="flex justify-center gap-2 pb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors
              ${step >= i ? 'bg-brand-accent' : 'bg-brand-border'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
