import { useState, useEffect, useCallback } from 'react'

// 전역 토스트 이벤트
const listeners = new Set()
export function showToast(msg, type = 'info', duration = 3500) {
  listeners.forEach((fn) => fn({ msg, type, id: Date.now(), duration }))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const timers = new Set()
    const handler = (toast) => {
      setToasts((p) => [...p, toast])
      const id = setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== toast.id))
        timers.delete(id)
      }, toast.duration)
      timers.add(id)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
      timers.forEach(clearTimeout)
    }
  }, [])

  if (!toasts.length) return null

  const colors = {
    info:    { bg: 'bg-brand-panelLight', border: 'border-brand-borderLight', text: 'text-brand-text' },
    success: { bg: 'bg-brand-panelLight', border: 'border-brand-success/40',  text: 'text-brand-success' },
    error:   { bg: 'bg-brand-panelLight', border: 'border-brand-danger/40',   text: 'text-brand-danger' },
    warn:    { bg: 'bg-brand-panelLight', border: 'border-brand-gold/40',     text: 'text-brand-gold' },
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const c = colors[t.type] ?? colors.info
        return (
          <div key={t.id}
            className={`animate-slide-up pointer-events-auto
                        ${c.bg} ${c.border} ${c.text}
                        border rounded-xl px-4 py-3 text-sm font-mono
                        shadow-panel max-w-xs`}>
            {t.msg}
          </div>
        )
      })}
    </div>
  )
}
