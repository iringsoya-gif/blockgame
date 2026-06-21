import { useEffect, useRef, useState, useCallback, memo } from 'react'
import ChoicePanel from './ChoicePanel'

const TYPING_SPEED = 20   // ms per char (낮을수록 빠름)

function useTypingEffect(text, active = true) {
  const [displayed, setDisplayed] = useState(active ? '' : text)
  const [done, setDone]           = useState(!active)
  const rafRef  = useRef(null)
  const idxRef  = useRef(active ? 0 : text.length)
  const lastRef = useRef(0)

  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return }
    idxRef.current = 0
    setDisplayed('')
    setDone(false)

    const tick = (ts) => {
      if (ts - lastRef.current > TYPING_SPEED) {
        lastRef.current = ts
        idxRef.current  = Math.min(idxRef.current + 2, text.length)  // 2글자씩
        setDisplayed(text.slice(0, idxRef.current))
        if (idxRef.current >= text.length) { setDone(true); return }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [text, active])

  const skip = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    idxRef.current = text.length
    setDisplayed(text)
    setDone(true)
  }, [text])

  return { displayed, done, skip }
}

const GMMessage = memo(function GMMessage({ text, isLatest }) {
  const { displayed, done, skip } = useTypingEffect(text, isLatest)
  const show = isLatest ? displayed : text

  return (
    <div onClick={!done ? skip : undefined}
      className={`text-sm leading-relaxed text-brand-text font-body ${!done ? 'cursor-pointer' : ''}`}
      title={!done ? '클릭하면 즉시 완성' : undefined}>
      <span className="text-brand-muted text-xs font-mono mr-2 select-none">[GM]</span>
      {show}
      {isLatest && !done && (
        <span className="inline-block w-0.5 h-3.5 bg-brand-accent ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  )
})

const PlayerMessage = memo(function PlayerMessage({ text }) {
  return (
    <div className="text-xs font-mono text-brand-accent border-l-2 border-brand-accent/60 pl-3 py-0.5">
      <span className="text-brand-accent/60 mr-1">›</span>{text}
    </div>
  )
})

const SystemMessage = memo(function SystemMessage({ text }) {
  return (
    <div className="text-xs font-mono text-center py-1.5 animate-fade-in">
      <span className="inline-flex items-center gap-2 text-brand-muted">
        <span className="flex-1 h-px bg-brand-border/60" />
        {text}
        <span className="flex-1 h-px bg-brand-border/60" />
      </span>
    </div>
  )
})

export default function StoryPanel({
  messages, onSubmit, onChoose,
  disabled, loading, currentChoices,
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, currentChoices.length])

  useEffect(() => {
    if (!disabled && !loading) inputRef.current?.focus()
  }, [disabled, loading])

  const submit = useCallback(() => {
    const t = input.trim()
    if (!disabled && !loading && t) {
      onSubmit(t)
      setInput('')
    }
  }, [input, disabled, loading, onSubmit])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">

      {/* 스토리 로그 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0"
        role="log" aria-live="polite" aria-label="스토리 진행">
        {messages.map((msg, i) => {
          const isLatest = i === messages.length - 1
          return (
            <div key={`${i}-${msg.ts ?? 0}`} className="animate-fade-in">
              {msg.role === 'gm'     && <GMMessage     text={msg.text} isLatest={isLatest} />}
              {msg.role === 'player' && <PlayerMessage text={msg.text} />}
              {msg.role === 'system' && <SystemMessage text={msg.text} />}
            </div>
          )
        })}

        {/* 로딩 */}
        {loading && (
          <div className="flex items-center gap-2 text-brand-muted text-xs font-mono pl-1">
            <span className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i}
                  className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            GM이 이야기를 엮는 중...
          </div>
        )}

        {/* 선택지 */}
        {!loading && currentChoices?.length > 0 && (
          <div className="animate-slide-up">
            <ChoicePanel choices={currentChoices} onChoose={onChoose} disabled={disabled || loading} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className={`shrink-0 transition-all duration-300 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {disabled && (
          <p className="text-brand-danger text-xs font-mono text-center mb-2 animate-pulse">
            ⚔ 전투 중 — 입력 불가
          </p>
        )}
        <div className="relative">
          <textarea
            ref={inputRef}
            rows={2}
            className="input-base resize-none pr-12 rounded-xl"
            placeholder="행동을 입력하세요... (Enter 전송)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled || loading}
            aria-label="행동 입력"
            maxLength={500}
          />
          <button onClick={submit}
            disabled={disabled || loading || !input.trim()}
            className="absolute right-2.5 bottom-2.5 w-8 h-8 rounded-lg
                       bg-brand-accent hover:bg-brand-accentHover
                       disabled:opacity-30 flex items-center justify-center
                       transition-all duration-150"
            aria-label="전송">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <p className="text-brand-muted text-2xs font-mono mt-1 opacity-50 select-none">
          Enter 전송 · Shift+Enter 줄바꿈 · GM 메시지 클릭시 스킵
        </p>
      </div>
    </div>
  )
}
