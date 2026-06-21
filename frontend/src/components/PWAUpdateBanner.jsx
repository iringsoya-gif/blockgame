import { useState, useEffect } from 'react'

export default function PWAUpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = () => setShow(true)
    window.addEventListener('pwa-update-available', handler)
    return () => window.removeEventListener('pwa-update-available', handler)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
      <div className="panel px-5 py-3 flex items-center gap-4 border-brand-accent/50"
        style={{ boxShadow: '0 0 24px rgba(124,92,252,0.3)' }}>
        <span className="text-brand-text text-sm font-body">🔄 새 버전이 있습니다</span>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary text-xs px-3 py-1.5">
          업데이트
        </button>
        <button onClick={() => setShow(false)}
          className="text-brand-muted text-xs hover:text-brand-text">✕</button>
      </div>
    </div>
  )
}
